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
  settleWorkflow,
  inspectWorkflows,
  retryFailedWorkflow,
  dispatchRecoveryIntents,
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
it('invalid outbox work is quarantined without blocking a valid later job', async () => {
  const id = randomUUID(),
    at = Date.now();
  await poolCommand(db, id, id + ':create', {}, () => ({ value: p(id, at), events: [] }));
  const badId = id + ':invalid';
  await db.query('INSERT INTO workflow_outbox(id,kind,due_at,data) VALUES($1,$2,$3,$4)', [
    badId,
    'unknown-kind',
    String(at - 1),
    { aggregateId: id },
  ]);
  const result = await dispatchOutbox(id);
  expect(result.blocked).toBe(1);
  expect(result.submitted).toBeGreaterThanOrEqual(1);
  expect(
    ((await DBOS.retrieveWorkflow('close:' + id + ':' + at + ':').getResult()) as e.Pool).state,
  ).toBe('CLOSED');
  expect((await inspectWorkflows(id)).find((w) => w.id === badId)?.status).toBe('DISPATCH_BLOCKED');
  await dispatchOutbox(id);
  expect(
    (
      await db.query(
        'SELECT dispatch_attempts,dispatch_error,dispatched FROM workflow_outbox WHERE id=$1',
        [badId],
      )
    ).rows[0],
  ).toEqual({ dispatch_attempts: 1, dispatch_error: 'INVALID_JOB', dispatched: false });
}, 60000);

it('failed durable work is visible and audited recovery preserves history and deduplicates retries', async () => {
  const id = randomUUID(),
    at = Date.now(),
    workflowId = 'close:' + id + ':' + at + ':';
  const c = await db.connect();
  try {
    await schedule(c, 'close', id, at);
  } finally {
    c.release();
  }
  await dispatchOutbox(id);
  await expect(DBOS.retrieveWorkflow(workflowId).getResult()).rejects.toThrow();
  expect((await inspectWorkflows(id))[0]!.status).toBe('ERROR');
  await poolCommand(db, id, id + ':create', {}, () => ({ value: p(id, at), events: [] }));
  const args = [workflowId, id + ':retry', 'ops', 'missing pool restored', at + 1] as const;
  const handle = await retryFailedWorkflow(...args);
  expect(((await handle.getResult()) as e.Pool).state).toBe('CLOSED');
  expect(await (await retryFailedWorkflow(...args)).getResult()).toEqual(await handle.getResult());
  expect((await DBOS.getWorkflowStatus(workflowId))?.status).toBe('ERROR');
  expect((await inspectWorkflows(id)).find((w) => w.id === handle.workflowID)?.status).toBe(
    'SUCCESS',
  );
  expect(await dispatchRecoveryIntents()).toBe(0);
  expect(
    (
      await db.query(
        "SELECT count(*)::int n FROM audit_events WHERE aggregate_id=$1 AND event_type='WORKFLOW_RECOVERY_REQUESTED'",
        ['recovery:' + id + ':retry'],
      )
    ).rows[0].n,
  ).toBe(1);
}, 60000);

it('pricing watchdog closes an OPEN pool before a delayed close timer', async () => {
  const at = Date.now(),
    id = randomUUID();
  const created = { ...p(id, at), pricingDeadline: at + 1 };
  await poolCommand(db, id, id + ':create', {}, () => ({ value: created, events: [] }));
  const timed = await (
    await DBOS.startWorkflow(pricingWorkflow, { workflowID: id + ':watchdog' })(id, at + 1)
  ).getResult();
  expect(timed.state).toBe('NO_DEAL');
  // Pricing may recover before the close timer. The delayed close must remain a no-op.
  expect(
    (
      await (
        await DBOS.startWorkflow(poolCloseWorkflow, { workflowID: id + ':late-close' })(id, at)
      ).getResult()
    ).state,
  ).toBe('NO_DEAL');
}, 45000);
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
    waveTerms: { sellerId: 's', bidId: 'timer-bid', slabs: [], count: 1 },
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
  const settleOutbox = (
    await db.query(
      "SELECT id FROM workflow_outbox WHERE kind='settle' AND data->>'aggregateId'=$1 ORDER BY id DESC LIMIT 1",
      [oid],
    )
  ).rows[0];
  expect((await DBOS.retrieveWorkflow<e.Order>(settleOutbox.id).getResult()).status).toBe(
    'SETTLED',
  );
  const waveOutbox = (
    await db.query("SELECT id FROM workflow_outbox WHERE kind='wave' AND data->>'aggregateId'=$1", [
      id,
    ])
  ).rows[0];
  expect(waveOutbox).toBeDefined();
  await dispatchOutbox(id);
  const wave = await DBOS.retrieveWorkflow<ReturnType<typeof e.closeSellerWaves>>(
    waveOutbox.id,
  ).getResult();
  expect(wave.sellers).toHaveLength(1);
  expect(wave.pot.minor).toBe(0);
}, 45000);
