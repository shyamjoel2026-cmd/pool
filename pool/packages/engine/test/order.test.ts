import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  addProof,
  buyerCancels,
  confirmBySeller,
  confirmInstalled,
  dispatch,
  handOver,
  INDIA_POLICY,
  installHoldDue,
  markPaid,
  money,
  type Order,
  releaseInstallHoldOnTimeout,
  returnOrder,
  sellerCancels,
  settle,
  splitOrder,
  US_POLICY,
  backupCostGap,
} from '../src/index.ts';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 16, 4, 30); // 16 Nov 2026 10:00 IST

describe('splitOrder — matches POOL_WORKING_MODEL_v3.md §3 (TV ₹28,400 at 3%)', () => {
  it('reproduces every line to the paisa', () => {
    const s = splitOrder(INDIA_POLICY, 'tv', money('INR', 28_400_00), { installationIncluded: true, waveHoldMinor: 1000_00 });
    expect(s.fee.minor).toBe(852_00);
    expect(s.gstOnFee.minor).toBe(153_36);
    expect(s.tcs.minor).toBe(120_34); // 0.5% of ₹24,067.80 taxable value
    expect(s.tds.minor).toBe(28_40);
    expect(s.installHold.minor).toBe(2_840_00);
    expect(s.waveHold.minor).toBe(1_000_00);
    expect(s.releaseOnCode.minor).toBe(23_405_90); // doc rounds to ₹23,406
  });

  it('US has no GST/TCS/TDS lines', () => {
    const s = splitOrder(US_POLICY, 'large_appliance', money('USD', 899_00), { installationIncluded: false, waveHoldMinor: 0 });
    expect(s.gstOnFee.minor + s.tcs.minor + s.tds.minor).toBe(0);
    expect(s.fee.minor).toBe(44_95);
    expect(s.releaseOnCode.minor).toBe(899_00 - 44_95);
  });

  it('every part sums exactly to the total (property)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100_00, max: 5_00_000_00 }),
        fc.boolean(),
        fc.integer({ min: 0, max: 5_000_00 }),
        fc.constantFrom('tv', 'large_appliance', 'laptop', 'meat', 'other') as fc.Arbitrary<'tv' | 'large_appliance' | 'laptop' | 'meat' | 'other'>,
        (total, install, hold, cat) => {
          const s = splitOrder(INDIA_POLICY, cat, money('INR', total), { installationIncluded: install, waveHoldMinor: Math.min(hold, Math.floor(total / 10)) });
          const parts = [s.fee, s.gstOnFee, s.tcs, s.tds, s.installHold, s.waveHold, s.releaseOnCode].reduce((a, m) => a + m.minor, 0);
          expect(parts).toBe(total);
          expect(s.releaseOnCode.minor).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });
});

function newOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord_1',
    poolId: 'pool_1',
    buyerId: 'buyer_1',
    sellerId: 'seller_1',
    category: 'tv',
    split: splitOrder(INDIA_POLICY, 'tv', money('INR', 28_400_00), { installationIncluded: true, waveHoldMinor: 1000_00 }),
    promisedBy: T0 + 3 * DAY,
    installationIncluded: true,
    returnCost: money('INR', 500_00),
    status: 'AWAITING_PAYMENT',
    proofs: [],
    openIssue: false,
    ...overrides,
  };
}

const proof = (kind: Parameters<typeof addProof>[1]['kind'], at = T0) => ({ kind, ref: `${kind}-ref`, by: 'tester', at });

function toDispatched(): Order {
  let o = markPaid(newOrder(), T0).order;
  o = confirmBySeller(addProof(o, proof('SELLER_CONFIRMATION')), T0).order;
  return dispatch(addProof(o, proof('DISPATCH_PHOTO')), T0).order;
}

describe('order lifecycle only moves on proof', () => {
  it('refuses to dispatch without a dispatch photo', () => {
    let o = markPaid(newOrder(), T0).order;
    o = confirmBySeller(addProof(o, proof('SELLER_CONFIRMATION')), T0).order;
    expect(() => dispatch(o, T0)).toThrow(/DISPATCH_PHOTO/);
  });
  it('refuses to skip states', () => {
    expect(() => dispatch(markPaid(newOrder(), T0).order, T0)).toThrow(/not allowed/);
  });

  it('on-time handover releases exactly releaseOnCode', () => {
    const o = addProof(toDispatched(), proof('CODE_VERIFIED'));
    const { events } = handOver(INDIA_POLICY, o, T0 + DAY);
    const release = events.find((e) => e.type === 'PAYOUT_RELEASE');
    expect(release && 'amount' in release && release.amount.minor).toBe(o.split.releaseOnCode.minor);
    expect(events.some((e) => e.type === 'LATE_CREDIT')).toBe(false);
  });

  it('late handover pays a late credit to the buyer out of the seller release', () => {
    const o = addProof(toDispatched(), proof('CODE_VERIFIED'));
    const { events } = handOver(INDIA_POLICY, o, o.promisedBy + 1);
    const credit = events.find((e) => e.type === 'LATE_CREDIT');
    const release = events.find((e) => e.type === 'PAYOUT_RELEASE');
    expect(credit && 'amount' in credit && credit.amount.minor).toBe(INDIA_POLICY.lateCreditMinor);
    expect(release && 'amount' in release && release.amount.minor).toBe(o.split.releaseOnCode.minor - INDIA_POLICY.lateCreditMinor);
  });

  it('installation hold: released on install, or after 5 days, or at deferred date capped at 45 days', () => {
    const handed = handOver(INDIA_POLICY, addProof(toDispatched(), proof('CODE_VERIFIED')), T0).order;
    expect(installHoldDue(INDIA_POLICY, handed)).toBe(T0 + 5 * DAY);
    expect(releaseInstallHoldOnTimeout(INDIA_POLICY, handed, T0 + 4 * DAY)).toEqual([]);
    expect(releaseInstallHoldOnTimeout(INDIA_POLICY, handed, T0 + 5 * DAY)).toHaveLength(1);
    expect(releaseInstallHoldOnTimeout(INDIA_POLICY, { ...handed, openIssue: true }, T0 + 6 * DAY)).toEqual([]);
    const deferred = { ...handed, installDeferredUntil: T0 + 90 * DAY };
    expect(installHoldDue(INDIA_POLICY, deferred)).toBe(T0 + 45 * DAY);
    const installed = confirmInstalled(addProof(handed, proof('INSTALL_JOB')), T0 + DAY);
    expect(installed.events.find((e) => e.type === 'PAYOUT_RELEASE')).toMatchObject({ reason: 'INSTALL_CONFIRMED' });
  });

  it('settles only after the replacement window and with no open issue', () => {
    const handed = handOver(INDIA_POLICY, addProof(toDispatched(), proof('CODE_VERIFIED')), T0).order;
    expect(() => settle(INDIA_POLICY, handed, T0 + 6 * DAY)).toThrow();
    expect(() => settle(INDIA_POLICY, { ...handed, openIssue: true }, T0 + 8 * DAY)).toThrow();
    expect(settle(INDIA_POLICY, handed, T0 + 7 * DAY).order.status).toBe('SETTLED');
  });
});

describe('cancellation symmetry (E-Commerce Rules 2020, Rule 4)', () => {
  it('buyer cancels before dispatch: full refund', () => {
    const paid = markPaid(newOrder(), T0).order;
    const refund = buyerCancels(paid, T0).events.find((e) => e.type === 'REFUND');
    expect(refund && 'amount' in refund && refund.amount.minor).toBe(28_400_00);
  });
  it('buyer refuses after dispatch: pays at most the disclosed return cost', () => {
    const refund = buyerCancels(toDispatched(), T0).events.find((e) => e.type === 'REFUND');
    expect(refund && 'amount' in refund && refund.amount.minor).toBe(28_400_00 - 500_00);
  });
  it('seller cancels: buyer gets full refund AND the same amount as compensation', () => {
    const { events } = sellerCancels(toDispatched(), T0);
    const refund = events.find((e) => e.type === 'REFUND');
    const charge = events.find((e) => e.type === 'SELLER_CHARGE');
    expect(refund && 'amount' in refund && refund.amount.minor).toBe(28_400_00);
    expect(charge && 'amount' in charge && charge.amount.minor).toBe(500_00);
  });
  it('unpaid order cancelled: no refund event', () => {
    expect(buyerCancels(newOrder(), T0).events.some((e) => e.type === 'REFUND')).toBe(false);
  });
  it('defective / late return: full refund', () => {
    const handed = handOver(INDIA_POLICY, addProof(toDispatched(), proof('CODE_VERIFIED')), T0).order;
    const refund = returnOrder(handed, 'DEFECTIVE', T0 + DAY).events.find((e) => e.type === 'REFUND');
    expect(refund && 'amount' in refund && refund.amount.minor).toBe(28_400_00);
  });
  it('seller default: backup price gap is charged to the defaulting seller, never to the buyer', () => {
    expect(backupCostGap(money('INR', 28_400_00), money('INR', 28_900_00)).minor).toBe(500_00);
    expect(backupCostGap(money('INR', 28_400_00), money('INR', 28_000_00)).minor).toBe(0);
  });
});

describe('money events carry idempotency keys', () => {
  it('each money event has a stable key per order and action', () => {
    const o = addProof(toDispatched(), proof('CODE_VERIFIED'));
    const a = handOver(INDIA_POLICY, o, o.promisedBy + 1).events;
    const b = handOver(INDIA_POLICY, o, o.promisedBy + 1).events;
    const keys = (evs: typeof a) => evs.filter((e) => 'idempotencyKey' in e).map((e) => ('idempotencyKey' in e ? e.idempotencyKey : ''));
    expect(keys(a)).toEqual(keys(b));
    expect(new Set(keys(a)).size).toBe(keys(a).length);
  });
});
