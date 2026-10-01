import { beforeAll, afterAll, expect, it } from 'vitest';
import fc from 'fast-check';
import { randomUUID } from 'node:crypto';
import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { connect, schema } from '@pool/db';
import { migrate } from '../../db/src/migrate.ts';
import * as e from '@pool/engine';
import {
  saveSeller,
  saveFulfilmentProfile,
  submitBid,
  savePrice,
  awardPersistedPool,
  publishPersistedOffers,
  acceptCheckout,
  issueHandoverCode,
  handover,
  cancelPoolAndOrders,
} from '../src/commerce.ts';
import { poolCommand, orderCommand, command, waveClose } from '../src/index.ts';
const { pool: db, db: orm } = connect();
beforeAll(() => migrate(), 30000);
afterAll(() => db.end());
it('generated allocations conserve every paise in the real ledger and survive replay', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.integer({ min: 1, max: 2_000_000_000 }),
      fc.integer({ min: 0, max: 100 }),
      async (minor, weight) => {
        const id = randomUUID();
        const parts = e.allocate(e.money('INR', minor), [weight, 100 - weight]);
        const run = () =>
          command(db, id, 'allocation-test', id, { minor, weight }, () => ({
            state: { minor, parts },
            events: [{ type: 'ALLOCATION_TEST' }],
            postings: [
              { from: 'external:buyers', to: id + ':held', minor, key: id + ':fund' },
              ...parts.map((part, i) => ({
                from: id + ':held',
                to: 'external:allocation:' + i,
                minor: part.minor,
                key: id + ':part:' + i,
              })),
            ],
          }));
        await run();
        await run();
        expect(
          (
            await db.query('SELECT balance::text FROM pgledger_accounts WHERE name=$1', [
              id + ':held',
            ])
          ).rows[0].balance,
        ).toBe('0');
        const rows = await db.query('SELECT data FROM money_events WHERE event_key LIKE $1', [
          id + ':part:%',
        ]);
        expect(rows.rows.reduce((n, r) => n + BigInt(r.data.minor), 0n)).toBe(BigInt(minor));
        expect(
          (await db.query('SELECT sum(amount)::text total FROM pgledger_entries')).rows[0].total,
        ).toBe('0');
      },
    ),
    { numRuns: 5 },
  );
}, 60000);
function start(id: string, closesAt: number, now: number) {
  return e.createPool(
    e.INDIA_POLICY,
    {
      id,
      categoryPath: ['generic'],
      productKey: 'x',
      areaKey: 'area',
      quantityRule: { uom: e.UOM.piece, minBase: 1, stepBase: 1 },
      fulfilmentProfileId: id + ':profile',
      waveCountMode: 'per_order',
      createdBy: 'u',
      createdAt: now,
      closesAt,
      bookingRule: {
        kind: 'FIXED',
        amountMinor: 100,
        minMinor: 100,
        maxMinor: 100,
      },
      checkoutPlan: 'PREPAY_FULL',
      hsnCode: '9999',
      gstRateBps: 1800,
      bidRequirements: {
        deliverBy: 5000000,
        acceptableModes: ['pickup'],
        terms: [],
      },
    },
    now,
  );
}
it('real PG18 extensions and Drizzle adapter connect', async () => {
  const r = await db.query(
    "SELECT extname FROM pg_extension WHERE extname IN ('postgis','vector','pg_trgm')",
  );
  expect(r.rowCount).toBe(3);
  expect(Array.isArray(await orm.select({ id: schema.pools.id }).from(schema.pools).limit(1))).toBe(
    true,
  );
  const columns = await db.query(
    "SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('pgledger_accounts','pgledger_transfers','pgledger_entries') AND column_name IN ('amount','balance','account_previous_balance','account_current_balance')",
  );
  expect(columns.rows).toHaveLength(5);
  expect(columns.rows.every((c) => c.data_type === 'bigint')).toBe(true);
  expect((await db.query('SHOW server_version')).rows[0].server_version).toMatch(/^18/);
});
it('full pool lifecycle, money postings, retry and append-only audit', async () => {
  const id = randomUUID(),
    now = 1000,
    closeAt = 3601000;
  let p = await poolCommand(db, id, id + ':create', { id }, () => start(id, closeAt, now));
  p = await poolCommand(db, id, id + ':join', {}, (p) =>
    e.join(
      e.INDIA_POLICY,
      p!,
      {
        memberId: 'm',
        userId: 'u',
        payerKey: 'pay',
        householdKey: 'h',
        qty: e.qty(e.UOM.piece, 1),
        options: [],
        needBy: 5000000,
      },
      2000,
    ),
  );
  const booking = () =>
    poolCommand(db, id, id + ':book', {}, (p) =>
      e.confirmBooking(p!, 'm', 2001, {
        amount: e.money('INR', 100),
        paymentRef: id + ':receipt',
        paidAt: 2001,
      }),
    );
  p = await booking();
  expect(await booking()).toEqual(p);
  const bid: e.Bid = {
    id: id + ':bid',
    poolId: id,
    sellerId: id + ':seller',
    revision: 1,
    sellerPrice: e.money('INR', 1000),
    uom: 'piece',
    capacityBase: 1,
    deliverBy: 4000000,
    modes: ['pickup'],
    terms: {},
    optionsCovered: [],
    slabs: [{ fromUnit: 1, perUnitMinor: 10 }],
    validUntil: 100000000,
    submittedAt: 2000,
  };
  const prefix = '36ABCDE1234F1Z';
  await saveSeller(db, bid.sellerId, id + ':seller', {
    verified: true,
    gstin: prefix + e.gstinCheckDigit(prefix),
    stateCode: '36',
  });
  await submitBid(db, bid, id + ':bid', 2000);
  p = await poolCommand(db, id, id + ':close', {}, (p) => e.close(p!, closeAt));
  p = await awardPersistedPool(db, id, id + ':stage', 'ops', closeAt);
  await savePrice(
    db,
    {
      poolId: id,
      bidId: bid.id,
      buyerPrice: e.money('INR', 1100),
      decidedBy: 'ops',
      decidedAt: closeAt,
    },
    id + ':price',
  );
  p = await publishPersistedOffers(db, id, id + ':publish', closeAt);
  const oid = id + ':order';
  const profile: e.FulfilmentProfile = {
    id: id + ':profile',
    label: 'generic',
    modes: ['pickup'],
    steps: [],
    handoverChecklist: [],
    codeDigits: 4,
    holds: [],
    returnWindowDays: 0,
    lateCreditMinor: 0,
  };
  await saveFulfilmentProfile(db, profile, id + ':profile');
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
    waveHoldMinor: 10,
  });
  let order: e.Order = {
    id: oid,
    poolId: id,
    buyerId: 'm',
    sellerId: bid.sellerId,
    profile,
    split,
    promisedBy: 5000000,
    returnCost: e.money('INR', 10),
    status: 'AWAITING_PAYMENT',
    steps: [],
    holdDeferrals: {},
    holdsReleased: [],
    openIssue: false,
  };
  const checkoutTax: e.IndiaTaxContext = {
    hsnCode: '9999',
    gstRateBps: 1800,
    sellerStateCode: '36',
    deliveryStateCode: '36',
    poolStateCode: '36',
    supplyKind: 'MOVEMENT_OF_GOODS',
  };
  await expect(
    acceptCheckout(
      db,
      id,
      'm',
      oid,
      id + ':bad-profile',
      { ...profile, returnWindowDays: 99 },
      checkoutTax,
      4000000,
      e.money('INR', 10),
      10,
      closeAt + 1,
    ),
  ).rejects.toThrow(/immutable/);
  await expect(
    acceptCheckout(
      db,
      id,
      'm',
      oid,
      id + ':bad-hold',
      profile,
      checkoutTax,
      4000000,
      e.money('INR', 10),
      0,
      closeAt + 1,
    ),
  ).rejects.toThrow(/wave hold/);
  await expect(
    acceptCheckout(
      db,
      id,
      'm',
      oid,
      id + ':bad-tax',
      profile,
      { ...checkoutTax, gstRateBps: 0 },
      4000000,
      e.money('INR', 10),
      10,
      closeAt + 1,
    ),
  ).rejects.toThrow(/tax differs/);
  expect(
    (await db.query('SELECT data FROM pools WHERE id=$1', [id])).rows[0].data.members[0].status,
  ).toBe('OFFERED');
  p = await acceptCheckout(
    db,
    id,
    'm',
    oid,
    id + ':accept',
    profile,
    {
      hsnCode: '9999',
      gstRateBps: 1800,
      sellerStateCode: '36',
      deliveryStateCode: '36',
      poolStateCode: '36',
      supplyKind: 'MOVEMENT_OF_GOODS',
    },
    4000000,
    e.money('INR', 10),
    10,
    closeAt + 1,
  );
  order = await orderCommand(db, oid, oid + ':pay', {}, (o) =>
    e.collectBalance(o!, e.money('INR', 1000), oid + ':receipt', 'UPI', closeAt + 2),
  );
  const plain = await issueHandoverCode(db, oid, 5000000);
  expect(await handover(db, oid, plain === '0000' ? '1111' : '0000', {}, 3999999)).toEqual({
    ok: false,
    reason: 'WRONG_CODE',
  });
  expect(
    (await db.query('SELECT data FROM handover_codes WHERE id=$1', [oid])).rows[0].data.attempts,
  ).toBe(1);
  const handed = await handover(db, oid, plain, {}, 4000000);
  expect(handed.ok).toBe(true);
  if (!handed.ok) throw new Error('handover failed');
  order = handed.order;
  order = await orderCommand(db, oid, oid + ':settle', {}, (o) => e.settle(o!, 4000001));
  expect(order.status).toBe('SETTLED');
  const wave = await waveClose(
    db,
    id,
    bid.slabs,
    [{ orderId: oid, count: 1, outcome: 'settled' }],
    4000002,
  );
  expect(wave.pot.minor).toBe(10);
  const balance = await db.query(
    'SELECT coalesce(sum(amount),0)::text AS balance FROM pgledger_entries',
  );
  expect(balance.rows[0].balance).toBe('0');
  const held = await db.query('SELECT balance::text FROM pgledger_accounts WHERE name=$1', [
    oid + ':held',
  ]);
  expect(held.rows[0].balance).toBe('0');
  await expect(
    db.query('UPDATE audit_events SET event_type=event_type WHERE aggregate_id=$1', [id]),
  ).rejects.toThrow(/append-only/);
  await expect(
    poolCommand(db, id, id + ':book', { different: true }, (p) => ({
      value: p!,
      events: [],
    })),
  ).rejects.toThrow(/idempotency/);
  const journal = await db.query(
    'SELECT data FROM audit_events WHERE aggregate_id=$1 ORDER BY sequence',
    [id],
  );
  expect(journal.rowCount).toBeGreaterThan(0);
  expect(e.rebuildPool(journal.rows.map((r) => r.data))).toEqual(p);
}, 30000);
it('rollback leaves no state, audit or transfer after a failed transaction', async () => {
  const id = randomUUID();
  await expect(
    command(db, id, 'test', id, {}, () => ({
      state: { ok: true },
      events: [{ type: 'TEST' }],
      postings: [
        { from: 'rollback-a', to: 'rollback-b', minor: 1, key: id + ':1' },
        { from: 'rollback-a', to: 'rollback-b', minor: -1, key: id + ':2' },
      ],
    })),
  ).rejects.toThrow();
  expect((await db.query('SELECT id FROM aggregates WHERE id=$1', [id])).rowCount).toBe(0);
  expect(
    (await db.query('SELECT id FROM money_events WHERE event_key=$1', [id + ':1'])).rowCount,
  ).toBe(0);
});
function worker(crash = false) {
  return fork(fileURLToPath(new URL('../src/worker.ts', import.meta.url)), [], {
    execArgv: ['--env-file=../../.env'],
    env: {
      ...process.env,
      POOL_TEST_WORKER: '1',
      POOL_TEST_CRASH_BOUNDARY: crash ? '1' : '0',
    },
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
}
function message(child: ChildProcess, type: string, timeout = 30000) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('worker timeout: ' + type));
    }, timeout);
    const onMessage = (m: unknown) => {
      if ((m as { type: string }).type === type) {
        cleanup();
        resolve();
      } else if ((m as { type: string }).type === 'failed') {
        cleanup();
        reject(new Error('worker failed'));
      }
    };
    const cleanup = () => {
      clearTimeout(timer);
      child.off('message', onMessage);
    };
    child.on('message', onMessage);
  });
}
it('kills worker after wave transaction commit, restarts DBOS, and never double posts', async () => {
  const id = randomUUID(),
    now = Date.now();
  await poolCommand(db, id, id + ':create', {}, () => start(id, now + 3600000, now));
  await command(db, id + ':fund', 'test', id + ':fund', {}, () => ({
    state: {},
    events: [{ type: 'TEST_CAPTURE' }],
    postings: [
      {
        from: 'external:buyers',
        to: id + ':o:held',
        minor: 10,
        key: id + ':funded',
      },
    ],
  }));
  // Persist the settled order that owns the held paise; wave close rejects unknown orders.
  await db.query(
    'INSERT INTO orders(id,pool_id,buyer_total_minor,seller_total_minor,data) VALUES($1,$2,1100,1000,$3)',
    [
      id + ':o',
      id,
      {
        id: id + ':o',
        poolId: id,
        sellerId: id + ':seller',
        status: 'SETTLED',
        split: { waveHold: e.money('INR', 10) },
      },
    ],
  );
  let child = worker(true);
  try {
    await message(child, 'ready');
    const committed = message(child, 'committed');
    child.send({ kind: 'wave', id, at: now, workflowId: id + ':workflow' });
    await committed;
    const before = await db.query(
      'SELECT count(*)::int AS n FROM money_events WHERE event_key LIKE $1',
      [id + ':%'],
    );
    expect(before.rows[0].n).toBeGreaterThan(0);
    child.kill('SIGKILL');
    await new Promise<void>((resolve) => child.once('exit', () => resolve()));
    child = worker(false);
    await message(child, 'ready');
    const done = message(child, 'done');
    child.send({ kind: 'wave', id, at: now, workflowId: id + ':workflow' });
    await done;
    const after = await db.query(
      'SELECT count(*)::int AS n FROM money_events WHERE event_key LIKE $1',
      [id + ':%'],
    );
    expect(after.rows[0].n).toBe(before.rows[0].n);
    expect(
      (await db.query('SELECT sum(amount)::text AS balance FROM pgledger_entries')).rows[0].balance,
    ).toBe('0');
  } finally {
    child.kill('SIGKILL');
  }
}, 90000);

it('unfunded internal accounts cannot pay and concurrent idempotent commands post once', async () => {
  const id = randomUUID();
  await expect(
    command(db, id, 'test', id, {}, () => ({
      state: {},
      events: [],
      postings: [
        {
          from: id + ':unfunded',
          to: 'external:buyers',
          minor: 10,
          key: id + ':bad',
        },
      ],
    })),
  ).rejects.toThrow(/negative balance/);
  const run = () =>
    command(db, id, 'test', id + ':fund', {}, () => ({
      state: { funded: true },
      events: [{ type: 'FUND' }],
      postings: [
        {
          from: 'external:buyers',
          to: id + ':held',
          minor: 10,
          key: id + ':ok',
        },
      ],
    }));
  expect(await Promise.all([run(), run(), run()])).toEqual([
    { funded: true },
    { funded: true },
    { funded: true },
  ]);
  expect(
    (await db.query('SELECT count(*)::int n FROM money_events WHERE event_key=$1', [id + ':ok']))
      .rows[0].n,
  ).toBe(1);
}, 30000);
it('database rejects fractional paise and audit deletion', async () => {
  const id = randomUUID();
  await command(db, id, 'test', id, {}, () => ({
    state: {},
    events: [{ type: 'TEST' }],
    postings: [{ from: 'external:buyers', to: id + ':held', minor: 1, key: id }],
  }));
  await expect(
    db.query(
      "SELECT pgledger_create_transfer((SELECT ledger_id FROM ledger_account_map WHERE id='external:buyers'),(SELECT ledger_id FROM ledger_account_map WHERE id=$1),0.5,NULL,NULL)",
      [id + ':held'],
    ),
  ).rejects.toThrow(/integer paise/);
  await expect(db.query('DELETE FROM audit_events WHERE aggregate_id=$1', [id])).rejects.toThrow(
    /append-only/,
  );
});
it('one PA receipt cannot fund bookings across two pools; rejection rolls back the second ledger capture', async () => {
  const prefix = randomUUID(),
    now = 1000,
    receipt = {
      amount: e.money('INR', 100),
      paymentRef: prefix + ':receipt',
      paidAt: 2001,
    };
  for (const suffix of ['a', 'b']) {
    const id = prefix + suffix;
    await poolCommand(db, id, id + ':create', {}, () => start(id, 3601000, now));
    await poolCommand(db, id, id + ':join', {}, (p) =>
      e.join(
        e.INDIA_POLICY,
        p!,
        {
          memberId: 'm',
          userId: 'u',
          payerKey: 'p',
          householdKey: 'h',
          qty: e.qty(e.UOM.piece, 1),
          options: [],
          needBy: 5000000,
        },
        2000,
      ),
    );
  }
  await poolCommand(db, prefix + 'a', prefix + ':book-a', {}, (p) =>
    e.confirmBooking(p!, 'm', 2001, receipt),
  );
  await expect(
    poolCommand(db, prefix + 'b', prefix + ':book-b', {}, (p) =>
      e.confirmBooking(p!, 'm', 2001, receipt),
    ),
  ).rejects.toThrow(/receipt already allocated/);
  expect(
    (await db.query('SELECT data FROM pools WHERE id=$1', [prefix + 'b'])).rows[0].data.members[0]
      .status,
  ).toBe('PENDING_BOOKING');
  expect(
    (
      await db.query('SELECT count(*)::int n FROM money_events WHERE event_key=$1', [
        prefix + 'b:m:booking-capture',
      ])
    ).rows[0].n,
  ).toBe(0);
  expect(
    (
      await db.query('SELECT count(*)::int n FROM payments WHERE pa_reference=$1', [
        receipt.paymentRef,
      ])
    ).rows[0].n,
  ).toBe(1);
}, 30000);
