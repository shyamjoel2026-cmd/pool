import { afterAll, beforeAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { connect } from '@pool/db';
import * as e from '@pool/engine';
import { poolCommand, command, schedule, orderCommand } from '../src/index.ts';
import {
  DBOS,
  launchWorkflows,
  dispatchOutbox,
  poolCloseWorkflow,
  pricingWorkflow,
  acceptWorkflow,
  holdWorkflow,
} from '../src/workflows.ts';
import { migrate } from '../../db/src/migrate.ts';
const { pool: db } = connect();
beforeAll(async () => {
  await migrate();
  await launchWorkflows();
}, 30000);
afterAll(async () => {
  await DBOS.shutdown();
  await db.end();
});
function p(id: string, at: number) {
  return e.createPool(
    e.INDIA_POLICY,
    {
      id,
      categoryPath: ['generic'],
      productKey: 'p',
      areaKey: 'a',
      quantityRule: { uom: e.UOM.piece, minBase: 1, stepBase: 1 },
      fulfilmentProfileId: 'f',
      waveCountMode: 'per_order',
      createdBy: 'u',
      createdAt: at - 3600000,
      closesAt: at,
      bookingRule: { kind: 'FIXED', amountMinor: 1, minMinor: 1, maxMinor: 1 },
      checkoutPlan: 'PREPAY_FULL',
      hsnCode: '9999',
      gstRateBps: 1800,
    },
    at - 3600000,
  ).value;
}
it('real DBOS durable close, pricing, acceptance and hold timers execute engine commands', async () => {
  const at = Date.now(),
    id = randomUUID();
  await poolCommand(db, id, id + ':create', {}, () => ({
    value: p(id, at),
    events: [],
  }));
  const closed = await (
    await DBOS.startWorkflow(poolCloseWorkflow, {
      workflowID: id + ':close-workflow',
    })(id, at)
  ).getResult();
  expect(closed.state).toBe('CLOSED');
  // Isolated timer fixtures persist real aggregate state; they do not substitute a mock database.
  const pricing = { ...closed, state: 'PRICING' as const, pricingDeadline: at };
  await command(db, id, 'pool', id + ':pricing-state', {}, () => ({
    state: pricing,
    events: [],
    postings: [],
  }));
  const expired = await (
    await DBOS.startWorkflow(pricingWorkflow, {
      workflowID: id + ':pricing-workflow',
    })(id, at)
  ).getResult();
  expect(expired.state).toBe('NO_DEAL');
  const offered = {
    ...pricing,
    state: 'AWARDED' as const,
    acceptBy: at,
    members: [
      {
        memberId: 'm',
        userId: 'u',
        householdKey: 'h',
        payerKey: 'payer',
        qty: e.qty(e.UOM.piece, 1),
        options: [],
        needBy: at + 1000,
        joinedAt: at - 1,
        status: 'OFFERED' as const,
        booking: {
          due: e.money('INR', 1),
          paid: e.money('INR', 1),
          disposition: 'HELD' as const,
        },
      },
    ],
  };
  await command(db, id, 'pool', id + ':offer-state', {}, () => ({
    state: offered,
    events: [],
    postings: [
      {
        from: 'external:buyers',
        to: id + ':booking:m',
        minor: 1,
        key: id + ':timer-booking',
      },
    ],
  }));
  const timed = await (
    await DBOS.startWorkflow(acceptWorkflow, {
      workflowID: id + ':accept-workflow',
    })(id, at)
  ).getResult();
  expect(timed.members[0]!.status).toBe('TIMED_OUT');
  const oid = id + ':hold-order',
    profile: e.FulfilmentProfile = {
      id: 'f',
      label: 'any',
      modes: ['pickup'],
      steps: [],
      handoverChecklist: [],
      codeDigits: 4,
      holds: [{ key: 'verification', bps: 1000, releaseAfterDays: 0 }],
      returnWindowDays: 0,
      lateCreditMinor: 0,
    };
  const split = e.splitOrder(e.INDIA_POLICY, {
    buyerTotal: e.money('INR', 1100),
    sellerTotal: e.money('INR', 1000),
    indiaTax: {
      hsnCode: '9999',
      gstRateBps: 1800,
      sellerStateCode: '36',
      deliveryStateCode: '36',
      poolStateCode: '36',
      supplyKind: 'MOVEMENT_OF_GOODS',
    },
    profile,
    waveHoldMinor: 0,
  });
  const o: e.Order = {
    id: oid,
    poolId: id,
    buyerId: 'm',
    sellerId: 's',
    profile,
    split,
    promisedBy: at,
    status: 'HANDED_OVER',
    handedOverAt: at,
    returnCost: e.money('INR', 0),
    steps: [],
    holdsReleased: [],
    holdDeferrals: {},
    openIssue: true,
    collectedMinor: 1100,
  };
  await command(db, oid, 'order', oid + ':seed', {}, () => ({
    state: o,
    events: [],
    postings: [
      {
        from: 'external:buyers',
        to: oid + ':held',
        minor: 100,
        key: oid + ':fund',
      },
    ],
  }));
  const blocked = await (
    await DBOS.startWorkflow(holdWorkflow, { workflowID: oid + ':blocked' })(
      oid,
      at,
      'before-resolution',
    )
  ).getResult();
  expect(blocked.holdsReleased).toEqual([]);
  await orderCommand(db, oid, oid + ':resolve', {}, (o) => e.setOrderIssue(o!, false, Date.now()));
  const outbox = (
    await db.query(
      "SELECT id FROM workflow_outbox WHERE kind='hold' AND data->>'aggregateId'=$1 ORDER BY id DESC LIMIT 1",
      [oid],
    )
  ).rows[0];
  expect(outbox).toBeDefined();
  await dispatchOutbox(oid);
  const released = await DBOS.retrieveWorkflow<e.Order>(outbox.id).getResult();
  await dispatchOutbox(oid); // dispatcher replay must not start another payout
  expect(released.holdsReleased).toEqual(['verification']);
  const count = await db.query('SELECT count(*)::int AS n FROM money_events WHERE event_key=$1', [
    oid + ':hold-verification',
  ]);
  expect(count.rows[0].n).toBe(1);
}, 45000);
