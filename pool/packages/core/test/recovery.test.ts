import { beforeAll, afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { connect } from '@pool/db';
import { migrate } from '../../db/src/migrate.ts';
import { worker, message } from './worker-fixture.ts';
import * as e from '@pool/engine';
import { poolCommand, orderCommand, closePersistedWaves, waveClose } from '../src/index.ts';
import { reconcileLedger } from '../src/reconciliation.ts';
import {
  createFulfilmentSlot,
  reserveFulfilmentSlot,
  releaseFulfilmentSlot,
} from '../src/slots.ts';
import {
  saveSeller,
  submitBid,
  savePrice,
  saveFulfilmentProfile,
  awardPersistedPool,
  publishPersistedOffers,
  acceptCheckout,
  issueHandoverCode,
  handover,
  cancelPoolAndOrders,
} from '../src/commerce.ts';
import {
  fundDefaultAccount,
  defaultSeller,
  sellerDepositAccount,
  poolReserveAccount,
} from '../src/recovery.ts';
const { pool: db } = connect();
beforeAll(() => migrate(), 30000);
afterAll(() => db.end());
async function balances(names: string[]) {
  // PostgreSQL ANY(array): https://www.postgresql.org/docs/18/functions-comparisons.html
  const rows = await db.query(
    'SELECT name,balance::text FROM pgledger_accounts WHERE name=ANY($1::text[])',
    [names],
  );
  return new Map<string, bigint>(rows.rows.map((r) => [r.name, BigInt(r.balance)]));
}

async function setup(
  options: {
    multiSeller?: boolean;
    withWave?: boolean;
    beforeAccept?: (id: string) => Promise<void>;
  } = {},
) {
  const id = randomUUID(),
    at = 3601000;
  const profile: e.FulfilmentProfile = {
    id: id + ':profile',
    label: 'generic',
    modes: ['pickup'],
    steps: [],
    handoverChecklist: [],
    codeDigits: 4,
    holds: [{ key: 'quality', bps: 2000, releaseAfterDays: 1 }],
    returnWindowDays: 2,
    lateCreditMinor: 0,
  };
  const tax: e.IndiaTaxContext = {
    hsnCode: '9999',
    gstRateBps: 1800,
    sellerStateCode: '36',
    deliveryStateCode: '36',
    poolStateCode: '36',
    supplyKind: 'MOVEMENT_OF_GOODS',
  };
  await poolCommand(db, id, id + ':create', {}, () =>
    e.createPool(
      e.INDIA_POLICY,
      {
        id,
        categoryPath: ['generic'],
        productKey: 'generic',
        poolStateCode: '36',
        areaKey: 'area',
        quantityRule: { uom: e.UOM.piece, minBase: 1, stepBase: 1 },
        fulfilmentProfileId: profile.id,
        waveCountMode: 'per_order',
        createdBy: 'buyer',
        createdAt: 1000,
        closesAt: at,
        bookingRule: { kind: 'FIXED', amountMinor: 1000, minMinor: 1000, maxMinor: 1000 },
        checkoutPlan: 'PREPAY_FULL',
        hsnCode: '9999',
        gstRateBps: 1800,
        bidRequirements: { deliverBy: at + 10000, acceptableModes: ['pickup'], terms: [] },
      },
      1000,
    ),
  );
  await saveFulfilmentProfile(db, profile, profile.id);
  const memberCount = options.multiSeller ? 3 : 2;
  for (let i = 0; i < memberCount; i++) {
    const memberId = 'buyer' + i;
    await poolCommand(db, id, id + ':join:' + i, {}, (p) =>
      e.join(
        e.INDIA_POLICY,
        p!,
        {
          memberId,
          userId: memberId,
          householdKey: memberId,
          payerKey: memberId,
          qty: e.qty(e.UOM.piece, 1),
          options: [],
          needBy: at + 10000,
          deliveryAddress: { line1: '1', city: 'Hyderabad', pincode: '500001', stateCode: '36' },
        },
        2000 + i,
      ),
    );
    await poolCommand(db, id, id + ':book:' + i, {}, (p) =>
      e.confirmBooking(p!, memberId, 3000 + i, {
        amount: e.money('INR', 1000),
        paymentRef: id + ':booking:' + i,
        paidAt: 3000 + i,
      }),
    );
  }
  for (let i = 0; i < 2; i++) {
    const sellerId = id + ':seller:' + i;
    const prefix = '36ABCDE1234F1Z';
    await saveSeller(db, sellerId, sellerId, {
      verified: true,
      gstin: prefix + e.gstinCheckDigit(prefix),
      stateCode: '36',
    });
    await submitBid(
      db,
      {
        id: id + ':bid:' + i,
        poolId: id,
        sellerId,
        revision: 1,
        sellerPrice: e.money('INR', i ? 12000 : 10000),
        uom: 'piece',
        capacityBase: options.multiSeller ? (i ? 2 : 1) : i ? 1 : 2,
        deliverBy: at + 5000,
        modes: ['pickup'],
        terms: {},
        optionsCovered: [],
        slabs:
          options.multiSeller || options.withWave
            ? [
                { fromUnit: 1, perUnitMinor: options.multiSeller && i ? 100 : 20 },
                { fromUnit: 2, perUnitMinor: options.multiSeller && i ? 200 : 40 },
              ]
            : [],
        returnCostMinor: 100,
        validUntil: at + 100000000,
        submittedAt: 4000,
      },
      id + ':bid:' + i,
      4000,
    );
  }
  await poolCommand(db, id, id + ':close', {}, (p) => e.close(p!, at));
  await awardPersistedPool(db, id, id + ':award', 'ops', at);
  await savePrice(
    db,
    {
      poolId: id,
      bidId: id + ':bid:0',
      buyerPrice: e.money('INR', 11000),
      decidedBy: 'ops',
      decidedAt: at,
    },
    id + ':price',
  );
  if (options.multiSeller)
    await savePrice(
      db,
      {
        poolId: id,
        bidId: id + ':bid:1',
        buyerPrice: e.money('INR', 13000),
        decidedBy: 'ops',
        decidedAt: at,
      },
      id + ':price:1',
    );
  const offered = await publishPersistedOffers(db, id, id + ':offers', at);
  await options.beforeAccept?.(id);
  for (let i = 0; i < memberCount; i++) {
    const orderId = id + ':order:' + i;
    await acceptCheckout(
      db,
      id,
      'buyer' + i,
      orderId,
      orderId + ':accept',
      profile,
      tax,
      at + 5000,
      e.money('INR', 100),
      options.multiSeller ? (i ? 200 : 40) : options.withWave ? 40 : 0,
      at + 1,
    );
    await orderCommand(db, orderId, orderId + ':pay', {}, (o) =>
      e.collectBalance(
        o!,
        e.money(
          'INR',
          offered.offers!.find((offer) => offer.memberId === 'buyer' + i)!.buyerTotal.minor - 1000,
        ),
        orderId + ':receipt',
        'UPI',
        at + 2,
      ),
    );
  }
  return { id, at, sellerId: id + ':seller:0' };
}

it('seller verification revoked after offers prevents checkout without consuming booking funds', async () => {
  let poolId = '';
  await expect(
    setup({
      beforeAccept: async (id) => {
        poolId = id;
        const sellerId = id + ':seller:0';
        const seller = (await db.query('SELECT data FROM sellers WHERE id=$1', [sellerId])).rows[0]
          .data;
        await saveSeller(db, sellerId, id + ':revoke', { ...seller, verified: false });
      },
    }),
  ).rejects.toThrow(/currently verified/);
  expect((await db.query('SELECT id FROM orders WHERE pool_id=$1', [poolId])).rowCount).toBe(0);
  const pool = (await db.query('SELECT data FROM pools WHERE id=$1', [poolId])).rows[0]
    .data as e.Pool;
  expect(pool.members.every((m) => m.booking?.disposition === 'HELD')).toBe(true);
  const booked = await balances([poolId + ':booking:buyer0', poolId + ':booking:buyer1']);
  expect([...booked.values()].reduce((n, v) => n + v, 0n)).toBe(2000n);
}, 60000);

it('concurrent reservations cannot oversell; cancellation releases capacity exactly once', async () => {
  const { id, at, sellerId } = await setup();
  const slotId = id + ':slot';
  await createFulfilmentSlot(
    db,
    {
      id: slotId,
      sellerId,
      areaKey: 'area',
      purpose: 'collection',
      mode: 'pickup',
      startsAt: at + 100,
      endsAt: at + 1000,
      capacity: 1,
    },
    id + ':slot-create',
    'ops',
    at + 3,
  );
  const reserve = (i: number) =>
    reserveFulfilmentSlot(
      db,
      slotId,
      id + ':order:' + i,
      id + ':reservation:' + i,
      'buyer' + i,
      at + 4,
    );
  const results = await Promise.allSettled([reserve(0), reserve(1)]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  const winner = results.findIndex((r) => r.status === 'fulfilled');
  await reserve(winner);
  const counts = async () =>
    (
      await db.query(
        'SELECT s.booked,(SELECT count(*)::int FROM slot_reservations r WHERE r.slot_id=s.id AND r.active) active FROM fulfilment_slots s WHERE s.id=$1',
        [slotId],
      )
    ).rows[0];
  expect(await counts()).toEqual({ booked: 1, active: 1 });
  await orderCommand(db, id + ':order:' + winner, id + ':cancel', {}, (o) =>
    e.buyerCancels(o!, at + 5),
  );
  expect(await counts()).toEqual({ booked: 0, active: 0 });
  await reserve(1 - winner);
  await releaseFulfilmentSlot(
    db,
    id + ':reservation:' + winner,
    id + ':release-again',
    'ops',
    at + 6,
  );
  expect(await counts()).toEqual({ booked: 1, active: 1 });
  expect(
    (await db.query('SELECT sum(amount)::text total FROM pgledger_entries')).rows[0].total,
  ).toBe('0');
  expect((await reconcileLedger(db)).findings.filter((f) => f.check === 'SLOT_CAPACITY')).toEqual(
    [],
  );
  await db.query('UPDATE fulfilment_slots SET booked=0 WHERE id=$1', [slotId]);
  try {
    expect((await reconcileLedger(db)).findings).toContainEqual({
      check: 'SLOT_CAPACITY',
      id: slotId,
    });
  } finally {
    await db.query('UPDATE fulfilment_slots SET booked=1 WHERE id=$1', [slotId]);
  }
}, 60000);

it('two sellers settle separate pots from accepted terms; retries never mix refunds or double post', async () => {
  const { id, at } = await setup({ multiSeller: true });
  await expect(closePersistedWaves(db, id, at + 3)).rejects.toThrow(/terminal orders/);
  for (let i = 0; i < 3; i++) {
    const orderId = id + ':order:' + i;
    const code = await issueHandoverCode(db, orderId, at + 10000, at + 3);
    expect((await handover(db, orderId, code, {}, at + 4)).ok).toBe(true);
    await orderCommand(db, orderId, orderId + ':settle', {}, (o) =>
      e.settle(o!, at + 4 + 2 * 86400000),
    );
  }
  await expect(
    waveClose(
      db,
      id,
      [{ fromUnit: 1, perUnitMinor: 1 }],
      [0, 1, 2].map((i) => ({ orderId: id + ':order:' + i, count: 1, outcome: 'settled' })),
      at + 5 + 2 * 86400000,
    ),
  ).rejects.toThrow(/requested slabs/);
  const settle = () => closePersistedWaves(db, id, at + 5 + 2 * 86400000);
  let child = worker(true);
  try {
    await message(child, 'ready');
    const committed = message(child, 'committed');
    child.send({ kind: 'wave', id, at: 0, workflowId: id + ':crash-workflow' });
    await committed;
    const posted = (await db.query('SELECT count(*)::int n FROM money_events')).rows[0].n;
    const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
    child.kill('SIGKILL');
    await exited;
    child = worker(false);
    await message(child, 'ready');
    const done = message(child, 'done');
    child.send({ kind: 'wave', id, at: 0, workflowId: id + ':crash-workflow' });
    await done;
    expect((await db.query('SELECT count(*)::int n FROM money_events')).rows[0].n).toBe(posted);
  } finally {
    child.kill('SIGKILL');
  }
  const result = await settle();
  expect(result.sellers).toHaveLength(2);
  const first = result.sellers.find((s) => s.sellerId === id + ':seller:0')!;
  const second = result.sellers.find((s) => s.sellerId === id + ':seller:1')!;
  expect(first.refunds).toEqual([{ orderId: id + ':order:0', amount: e.money('INR', 20) }]);
  expect(second.refunds).toEqual(
    [1, 2].map((i) => ({ orderId: id + ':order:' + i, amount: e.money('INR', 150) })),
  );
  expect(first.releaseToSeller.minor).toBe(20);
  expect(second.releaseToSeller.minor).toBe(100);
  expect(result.pot.minor).toBe(320);
  const before = (await db.query('SELECT count(*)::int n FROM money_events')).rows[0].n;
  expect(await settle()).toEqual(result);
  expect((await db.query('SELECT count(*)::int n FROM money_events')).rows[0].n).toBe(before);
  expect(
    (await db.query('SELECT count(*)::int n FROM wave_pots WHERE pool_id=$1', [id])).rows[0].n,
  ).toBe(2);
  for (let i = 0; i < 3; i++)
    await orderCommand(db, id + ':order:' + i, id + ':holds:' + i, {}, (o) =>
      e.releaseDueHolds(o!, at + 5 + 2 * 86400000),
    );
  const held = await balances([0, 1, 2].map((i) => id + ':order:' + i + ':held'));
  expect([...held.values()]).toEqual([0n, 0n, 0n]);
  expect((await db.query('SELECT sum(amount)::text n FROM pgledger_entries')).rows[0].n).toBe('0');
}, 180000);

it('a replacement retains the defaulting seller liability; wave penalty needs funded deposit and rolls back all pots if absent', async () => {
  const { id, at, sellerId } = await setup({ withWave: true });
  const firstCode = await issueHandoverCode(db, id + ':order:0', at + 10000, at + 3);
  expect((await handover(db, id + ':order:0', firstCode, {}, at + 4)).ok).toBe(true);
  await fundDefaultAccount(db, { sellerId }, e.money('INR', 2000), id + ':gap-deposit', 'ops');
  const defaulted = await defaultSeller(db, id, sellerId, 'ops', at + 5);
  expect(defaulted.affected).toHaveLength(1);
  expect(defaulted.affected[0]!.waveDefaults?.[0]?.sellerId).toBe(sellerId);
  const backupCode = await issueHandoverCode(db, id + ':order:1', at + 10000, at + 6);
  expect((await handover(db, id + ':order:1', backupCode, {}, at + 7)).ok).toBe(true);
  for (let i = 0; i < 2; i++)
    await orderCommand(db, id + ':order:' + i, id + ':settle:' + i, {}, (o) =>
      e.settle(o!, at + 7 + 2 * 86400000),
    );
  const settle = () => closePersistedWaves(db, id, at + 8 + 2 * 86400000);
  const before = (await db.query('SELECT count(*)::int n FROM money_events')).rows[0].n;
  await expect(settle()).rejects.toThrow(/negative balance/);
  expect((await db.query('SELECT count(*)::int n FROM money_events')).rows[0].n).toBe(before);
  expect(
    (await db.query('SELECT count(*)::int n FROM wave_pots WHERE pool_id=$1', [id])).rows[0].n,
  ).toBe(0);
  await fundDefaultAccount(db, { sellerId }, e.money('INR', 40), id + ':wave-deposit', 'ops');
  const waves = await settle();
  expect(waves.sellerPenalty.minor).toBe(40);
  expect(waves.refunds.find((r) => r.orderId === id + ':order:0')!.amount.minor).toBe(60);
  expect(waves.refunds.find((r) => r.orderId === id + ':order:1')!.amount.minor).toBe(20);
  expect(waves.pot.minor + waves.releaseToSeller.minor).toBe(
    waves.heldFromSettled.minor + waves.sellerPenalty.minor,
  );
  expect(
    (await balances([sellerDepositAccount(sellerId)])).get(sellerDepositAccount(sellerId)),
  ).toBe(0n);
  expect((await db.query('SELECT sum(amount)::text n FROM pgledger_entries')).rows[0].n).toBe('0');
}, 90000);

for (const returned of [false, true])
  it(
    'atomic funded seller recovery, capacity fallback, replay and ' +
      (returned ? 'return' : 'cancellation'),
    async () => {
      const { id, at, sellerId } = await setup();
      const reserveBefore = (await balances([poolReserveAccount])).get(poolReserveAccount) ?? 0n;
      const recover = () => defaultSeller(db, id, sellerId, 'ops', at + 3);
      const oldCode = await issueHandoverCode(db, id + ':order:0', at + 10000, at + 2);
      // Deliberately remove only this run's reserve liquidity through a balanced transfer when a prior test funded it.
      // Fresh test DB runs sequentially; use enough required gap to exceed the preceding test's residual reserve.
      if (reserveBefore > 0n) {
        const { command } = await import('../src/store.ts');
        await command(db, id + ':reserve-isolate', 'test', id + ':reserve-isolate', {}, () => ({
          state: {},
          events: [{ type: 'TEST_RESERVE_ISOLATION' }],
          postings: [
            {
              from: poolReserveAccount,
              to: id + ':reserved-for-other-work',
              minor: Number(reserveBefore),
              key: id + ':reserve-isolate',
            },
          ],
        }));
      }
      await expect(recover()).rejects.toThrow(/insufficient seller deposit/);
      expect(
        (await db.query('SELECT data FROM orders WHERE pool_id=$1', [id])).rows.every(
          (r) => r.data.sellerId === sellerId,
        ),
      ).toBe(true);
      await fundDefaultAccount(
        db,
        { sellerId },
        e.money('INR', 500),
        id + ':deposit-receipt',
        'ops',
      );
      await expect(recover()).rejects.toThrow(/insufficient seller deposit/);
      const funding = () =>
        fundDefaultAccount(db, 'RESERVE', e.money('INR', 2000), id + ':reserve-receipt', 'ops');
      await funding();
      await funding();
      await expect(
        fundDefaultAccount(db, { sellerId }, e.money('INR', 2000), id + ':reserve-receipt', 'ops'),
      ).rejects.toThrow(/idempotency key reused/);
      const result = await recover();
      expect(result.backupCostGap.minor).toBe(2000);
      expect(result.compensation.minor).toBe(100);
      expect(result.fromDeposit.minor + result.fromReserve.minor).toBe(2100);
      expect(result.affected.map((o) => o.status)).toEqual(['PAID', 'CANCELLED_BY_SELLER']);
      expect(result.affected[0]!.split.buyerTotal.minor).toBe(11000);
      expect(result.affected[0]!.split.holds[0]!.amount.minor).toBe(2400);
      const count = (await db.query('SELECT count(*)::int n FROM money_events')).rows[0].n;
      expect(await recover()).toEqual(result);
      expect((await db.query('SELECT count(*)::int n FROM money_events')).rows[0].n).toBe(count);
      expect(await handover(db, id + ':order:0', oldCode, {}, at + 4)).toEqual({
        ok: false,
        reason: 'ALREADY_USED',
      });
      if (returned) {
        const code = await issueHandoverCode(db, id + ':order:0', at + 10000, at + 4);
        expect(code).not.toBe(oldCode);
        expect((await handover(db, id + ':order:0', code, {}, at + 5)).ok).toBe(true);
      }
      const terminal = await orderCommand(db, id + ':order:0', id + ':terminal', {}, (o) =>
        returned ? e.returnOrder(o!, 'DEFECTIVE', at + 6) : e.buyerCancels(o!, at + 6),
      );
      expect(terminal.defaultFundingReturned).toBe(true);
      const names = [
        id + ':order:0:held',
        id + ':order:1:held',
        sellerDepositAccount(sellerId),
        poolReserveAccount,
      ];
      const balancesAfter = await balances(names);
      expect(balancesAfter.get(names[0]!)).toBe(0n);
      expect(balancesAfter.get(names[1]!)).toBe(0n);
      expect(balancesAfter.get(names[2]!)! + balancesAfter.get(names[3]!)!).toBe(2400n);
      expect((await db.query('SELECT sum(amount)::text n FROM pgledger_entries')).rows[0].n).toBe(
        '0',
      );
      expect(
        (
          await db.query(
            "SELECT count(*)::int n FROM pgledger_accounts WHERE balance < 0 AND name NOT LIKE 'external:%'",
          )
        ).rows[0].n,
      ).toBe(0);
      const events = (
        await db.query('SELECT data FROM audit_events WHERE aggregate_id=$1 ORDER BY sequence', [
          id + ':order:0',
        ])
      ).rows.map((r) => r.data as e.OrderEvent);
      expect(e.rebuildOrder(events)).toEqual(terminal);
    },
    90000,
  );

it('ops cancellation refunds all accepted orders atomically and replay posts nothing', async () => {
  const { id, at } = await setup();
  const cancel = () => cancelPoolAndOrders(db, id, id + ':ops-cancel', at + 3);
  const pool = await cancel();
  expect(pool.state).toBe('CANCELLED');
  const rows = await db.query('SELECT data FROM orders WHERE pool_id=$1', [id]);
  expect(rows.rows.every((r) => r.data.status === 'CANCELLED_BY_BUYER')).toBe(true);
  expect(
    [...(await balances([id + ':order:0:held', id + ':order:1:held']))].map(([, n]) => n),
  ).toEqual([0n, 0n]);
  const before = (await db.query('SELECT count(*)::int n FROM money_events')).rows[0].n;
  expect(await cancel()).toEqual(pool);
  expect((await db.query('SELECT count(*)::int n FROM money_events')).rows[0].n).toBe(before);
}, 90000);

it('ops cancellation of a delivered pool rolls back refunds already planned for earlier orders', async () => {
  const { id, at } = await setup();
  const code = await issueHandoverCode(db, id + ':order:1', at + 10000, at + 3);
  expect((await handover(db, id + ':order:1', code, {}, at + 4)).ok).toBe(true);
  const before = (await db.query('SELECT count(*)::int n FROM money_events')).rows[0].n;
  await expect(cancelPoolAndOrders(db, id, id + ':ops-cancel', at + 5)).rejects.toThrow(
    /delivered orders/,
  );
  expect((await db.query('SELECT count(*)::int n FROM money_events')).rows[0].n).toBe(before);
  expect((await db.query('SELECT data FROM pools WHERE id=$1', [id])).rows[0].data.state).toBe(
    'AWARDED',
  );
  expect(
    (await db.query('SELECT data FROM orders WHERE id=$1', [id + ':order:0'])).rows[0].data.status,
  ).toBe('PAID');
}, 90000);
