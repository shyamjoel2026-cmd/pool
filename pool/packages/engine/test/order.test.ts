import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  backupCostGap,
  buyerCancels,
  completeStep,
  deferHold,
  type FulfilmentProfile,
  handOver as engineHandOver,
  issueCode,
  holdsDue,
  INDIA_POLICY,
  markPaid,
  money,
  type Order,
  PROFILES,
  releaseDueHolds,
  returnOrder,
  sellerCancels,
  settle,
  splitOrder,
  US_POLICY,
  validateProfile,
} from '../src/index.ts';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 16, 4, 30);
const installProfile = PROFILES.delivery_with_installation!;
const pickupProfile = PROFILES.store_pickup!;

describe('splitOrder — team-priced (blueprint v2.2 bridge example: seller ₹40,000 → buyer ₹43,000)', () => {
  it('every line to the paisa', () => {
    const s = splitOrder(INDIA_POLICY, {
      buyerTotal: money('INR', 43_000_00),
      sellerTotal: money('INR', 40_000_00),
      indiaTax: {
        hsnCode: '9999',
        gstRateBps: 1800,
        sellerStateCode: '36',
        deliveryStateCode: '36',
        poolStateCode: '36',
        supplyKind: 'MOVEMENT_OF_GOODS',
      },
      profile: installProfile,
      waveHoldMinor: 0,
    });
    expect(s.margin.minor).toBe(3_000_00);
    expect(s.gstInMargin.minor).toBe(457_63); // 18/118 of ₹3,000 (v2.2: ≈ ₹458)
    expect(s.tcs.minor).toBe(182_20); // 0.5% of ₹36,440.68 taxable (v2.2: ₹182)
    expect(s.tds.minor).toBe(43_00); // 0.1% of ₹43,000
    expect(s.holds).toEqual([{ key: 'installation', amount: money('INR', 4_000_00) }]);
    expect(s.releaseOnHandover.minor).toBe(40_000_00 - 182_20 - 43_00 - 4_000_00);
  });
  it('a 0% GST product (fresh produce) and a pickup profile with no holds', () => {
    const s = splitOrder(INDIA_POLICY, {
      buyerTotal: money('INR', 860_00),
      sellerTotal: money('INR', 800_00),
      indiaTax: {
        hsnCode: '9999',
        gstRateBps: 0,
        sellerStateCode: '36',
        deliveryStateCode: '36',
        poolStateCode: '36',
        supplyKind: 'MOVEMENT_OF_GOODS',
      },
      profile: pickupProfile,
      waveHoldMinor: 0,
    });
    expect(s.tcs.minor).toBe(0); // exempt supplies excluded from net taxable supplies
    expect(s.holds).toEqual([]);
    expect(s.releaseOnHandover.minor).toBe(800_00 - 86);
  });
  it('US: no GST/TCS/TDS', () => {
    const s = splitOrder(US_POLICY, {
      buyerTotal: money('USD', 899_00),
      sellerTotal: money('USD', 850_00),
      goodsTaxBps: 0,
      profile: PROFILES.home_delivery!,
      waveHoldMinor: 0,
    });
    expect(s.gstInMargin.minor + s.tcs.minor + s.tds.minor).toBe(0);
    expect(s.releaseOnHandover.minor).toBe(850_00);
  });
  it('every rupee is accounted for, for any prices, tax rates and hold rules (property)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_00, max: 50_00_000_00 }),
        fc.integer({ min: 0, max: 3000 }), // team margin in bps of seller price
        fc.constantFrom(0, 500, 1200, 1800, 2800, 4000), // any GST slab
        fc.array(fc.integer({ min: 0, max: 2500 }), { maxLength: 3 }), // any holds
        fc.integer({ min: 0, max: 500 }), // wave hold bps
        (seller, marginBps, gst, holdBps, waveBps) => {
          const profile: FulfilmentProfile = {
            ...PROFILES.home_delivery!,
            holds: holdBps.map((bps, i) => ({
              key: `h${i}`,
              bps,
              releaseAfterDays: 3,
            })),
          };
          const buyer = seller + Math.floor((seller * marginBps) / 10_000);
          const s = splitOrder(INDIA_POLICY, {
            buyerTotal: money('INR', buyer),
            sellerTotal: money('INR', seller),
            indiaTax: {
              hsnCode: '9999',
              gstRateBps: gst,
              sellerStateCode: '36',
              deliveryStateCode: '36',
              poolStateCode: '36',
              supplyKind: 'MOVEMENT_OF_GOODS',
            },
            profile,
            waveHoldMinor: Math.floor((seller * waveBps) / 10_000),
          });
          const parts =
            s.margin.minor +
            s.tcs.minor +
            s.tds.minor +
            s.waveHold.minor +
            s.releaseOnHandover.minor +
            s.holds.reduce((a, h) => a + h.amount.minor, 0);
          expect(parts).toBe(buyer);
          expect(s.releaseOnHandover.minor).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });
});

function order(profile: FulfilmentProfile, over: Partial<Order> = {}): Order {
  return {
    id: 'ord_1',
    poolId: 'pool_1',
    buyerId: 'buyer_1',
    sellerId: 'seller_1',
    profile,
    split: splitOrder(INDIA_POLICY, {
      buyerTotal: money('INR', 43_000_00),
      sellerTotal: money('INR', 40_000_00),
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
    }),
    promisedBy: T0 + 3 * DAY,
    returnCost: money('INR', 500_00),
    status: 'AWAITING_PAYMENT',
    steps: [],
    holdDeferrals: {},
    holdsReleased: [],
    openIssue: false,
    ...over,
  };
}

const paid = (p: FulfilmentProfile) => markPaid(order(p), T0).order;
function readyForHandover(p: FulfilmentProfile): Order {
  let o = paid(p);
  for (const s of p.steps.filter((x) => !x.afterHandover))
    o = completeStep(o, s.key, `${s.key}-proof`, 'seller_1', T0).order;
  return o;
}

describe('fulfilment follows the profile data', () => {
  it('profiles validate', () => {
    for (const p of Object.values(PROFILES)) expect(() => validateProfile(p)).not.toThrow();
    expect(() => validateProfile({ ...PROFILES.home_delivery!, modes: [] })).toThrow();
  });
  it('steps must be done in order and need proof', () => {
    const o = paid(installProfile);
    expect(() => completeStep(o, 'dispatched', 'photo', 's', T0)).toThrow(/seller_confirmed first/);
    expect(() => completeStep(o, 'seller_confirmed', '  ', 's', T0)).toThrow(/needs proof/);
    expect(() => completeStep(o, 'teleported', 'x', 's', T0)).toThrow(/not in profile/);
  });
  it('handover needs every pre-handover step, then releases the seller amount', () => {
    expect(() => handOver(paid(installProfile), 'code-ok', T0)).toThrow(/first/);
    const { events } = handOver(readyForHandover(installProfile), 'code-ok', T0 + DAY);
    expect(events.find((e) => e.type === 'PAYOUT_RELEASE')).toMatchObject({
      reason: 'HANDOVER_CODE',
    });
  });
  it('an after-handover step (installation here) releases its hold; otherwise it releases on timeout or deferral cap', () => {
    const handed = handOver(readyForHandover(installProfile), 'code-ok', T0).order;
    const installed = completeStep(handed, 'installed', 'JOB-77', 'brand', T0 + DAY);
    expect(installed.events.find((e) => e.type === 'PAYOUT_RELEASE')).toMatchObject({
      amount: money('INR', 4_000_00),
    });
    expect(holdsDue(handed)).toEqual([{ key: 'installation', dueAt: T0 + 5 * DAY }]);
    expect(
      releaseDueHolds(handed, T0 + 4 * DAY).events.filter((e) => e.type !== 'ORDER_SNAPSHOT'),
    ).toEqual([]);
    expect(
      releaseDueHolds(handed, T0 + 5 * DAY).events.filter((e) => e.type === 'PAYOUT_RELEASE'),
    ).toHaveLength(1);
    expect(
      releaseDueHolds({ ...handed, openIssue: true }, T0 + 9 * DAY).events.filter(
        (e) => e.type !== 'ORDER_SNAPSHOT',
      ),
    ).toEqual([]);
    expect(holdsDue(deferHold(handed, 'installation', T0 + 90 * DAY, T0).order)).toEqual([
      { key: 'installation', dueAt: T0 + 45 * DAY },
    ]);
  });
  it('a pickup profile has a short return window and no holds', () => {
    const handed = handOver(readyForHandover(pickupProfile), 'code-ok', T0).order;
    expect(holdsDue(handed)).toEqual([]);
    expect(settle(handed, T0 + DAY).order.status).toBe('SETTLED');
  });
  it('late credit comes from the profile; none if the profile sets 0', () => {
    const lateProfile = { ...PROFILES.home_delivery!, lateCreditMinor: 200_00 };
    const late = handOver(readyForHandover(lateProfile), 'code-ok', T0 + 4 * DAY).events;
    expect(late.find((e) => e.type === 'LATE_CREDIT')).toMatchObject({
      amount: money('INR', 200_00),
    });
    expect(
      handOver(readyForHandover(PROFILES.home_delivery!), 'code-ok', T0 + 4 * DAY).events.some(
        (e) => e.type === 'LATE_CREDIT',
      ),
    ).toBe(false);
  });
  it('settles only after the profile return window with no open issue', () => {
    const handed = handOver(readyForHandover(installProfile), 'code-ok', T0).order;
    expect(() => settle(handed, T0 + 6 * DAY)).toThrow();
    expect(() => settle({ ...handed, openIssue: true }, T0 + 8 * DAY)).toThrow();
    expect(settle(handed, T0 + 7 * DAY).order.status).toBe('SETTLED');
  });
});

describe('cancellation symmetry (E-Commerce Rules 2020, Rule 4)', () => {
  it('free before the return-cost step (e.g. before dispatch)', () => {
    const r = buyerCancels(paid(installProfile), T0).events.find((e) => e.type === 'REFUND');
    expect(r).toMatchObject({ amount: money('INR', 43_000_00) });
  });
  it('after dispatch: buyer pays at most the disclosed return cost', () => {
    const r = buyerCancels(readyForHandover(installProfile), T0).events.find(
      (e) => e.type === 'REFUND',
    );
    expect(r).toMatchObject({ amount: money('INR', 42_500_00) });
  });
  it('seller cancels: full refund plus the same amount as compensation', () => {
    const ev = sellerCancels(paid(installProfile), T0).events;
    expect(ev.find((e) => e.type === 'REFUND')).toMatchObject({
      amount: money('INR', 43_000_00),
    });
    expect(ev.find((e) => e.type === 'SELLER_CHARGE')).toMatchObject({
      amount: money('INR', 500_00),
    });
  });
  it('defective/late return after handover: full refund', () => {
    const handed = handOver(readyForHandover(installProfile), 'code-ok', T0).order;
    expect(
      returnOrder(handed, 'DEFECTIVE', T0).events.find((e) => e.type === 'REFUND'),
    ).toMatchObject({ amount: money('INR', 43_000_00) });
  });
  it('seller default: backup seller-price gap is charged to the defaulting seller, buyer price unchanged', () => {
    expect(backupCostGap(money('INR', 40_000_00), money('INR', 40_600_00)).minor).toBe(600_00);
    expect(backupCostGap(money('INR', 40_000_00), money('INR', 39_000_00)).minor).toBe(0);
  });
  it('money events have stable idempotency keys', () => {
    const o = readyForHandover(installProfile);
    const k = (evs: ReturnType<typeof handOver>['events']) =>
      evs.flatMap((e) => ('idempotencyKey' in e ? [e.idempotencyKey] : []));
    expect(k(handOver(o, 'c', T0).events)).toEqual(k(handOver(o, 'c', T0).events));
  });
});

// Real deterministic verification replaces the former arbitrary proof-string bypass.
function handOver(o: Order, _legacyLabel: string, now: number) {
  const secret = 'test-secret-32-characters-minimum-value';
  const c = issueCode(
    secret,
    o.id,
    o.profile.codeDigits,
    now + 1000,
    1234,
    o.profile.handoverChecklist,
  );
  return engineHandOver(
    o,
    {
      secret,
      stored: c.stored,
      attempt: c.plain,
      checklist: Object.fromEntries(o.profile.handoverChecklist.map((k) => [k, true])),
    },
    now,
  );
}
