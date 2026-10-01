import { beforeAll, afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { connect } from '@pool/db';
import { migrate } from '../../db/src/migrate.ts';
import * as e from '@pool/engine';
import { poolCommand, orderCommand } from '../src/index.ts';
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
  const rows = await db.query(
    'SELECT name,balance::text FROM pgledger_accounts WHERE name=ANY($1::text[])',
    [names],
  );
  return new Map<string, bigint>(rows.rows.map((r) => [r.name, BigInt(r.balance)]));
}

async function setup() {
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
  for (let i = 0; i < 2; i++) {
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
        capacityBase: i ? 1 : 2,
        deliverBy: at + 5000,
        modes: ['pickup'],
        terms: {},
        optionsCovered: [],
        slabs: [],
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
  await publishPersistedOffers(db, id, id + ':offers', at);
  for (let i = 0; i < 2; i++) {
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
      0,
      at + 1,
    );
    await orderCommand(db, orderId, orderId + ':pay', {}, (o) =>
      e.collectBalance(o!, e.money('INR', 10000), orderId + ':receipt', 'UPI', at + 2),
    );
  }
  return { id, at, sellerId: id + ':seller:0' };
}

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
