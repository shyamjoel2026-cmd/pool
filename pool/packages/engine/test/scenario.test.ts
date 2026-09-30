import { describe, expect, it } from 'vitest';
import {
  acceptBid,
  addProof,
  applyAward,
  award,
  close,
  closeWave,
  confirmBooking,
  confirmBySeller,
  confirmInstalled,
  createPool,
  decide,
  dispatch,
  handOver,
  holdPerUnit,
  INDIA_POLICY,
  issueCode,
  join,
  markPaid,
  money,
  type Order,
  type OrderEvent,
  rankBids,
  settle,
  splitOrder,
  units,
  verifyCode,
  type Bid,
} from '../src/index.ts';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2026, 10, 16, 4, 30);
const SECRET = 'scenario-secret-that-is-at-least-32-chars';

describe('end-to-end: 30 buyers, 2 sellers, TV pool in Kondapur', () => {
  it('runs the full lifecycle and every paisa is accounted for', () => {
    const P = INDIA_POLICY;
    // 1. A buyer starts a pool and chooses to close it in 3 days.
    let pool = createPool(P, { id: 'pool-tv', category: 'tv', productKey: 'samsung-55-crystal-2026', areaKey: 'kondapur', basis: 'unit', createdBy: 'u0', createdAt: T0, closesAt: T0 + 3 * DAY }, T0).value;

    // 2. 30 households join and pay a booking.
    const ids = Array.from({ length: 30 }, (_, i) => `m${i + 1}`);
    ids.forEach((id, i) => {
      pool = join(P, pool, { memberId: id, userId: `u-${id}`, householdKey: `flat-${id}`, payerKey: `pay-${id}`, qty: units(1), options: [], needBy: T0 + 14 * DAY }, T0 + i * HOUR).value;
      pool = confirmBooking(pool, id, T0 + i * HOUR + 60_000).value;
    });

    // 3. Two verified sellers bid (sealed). Seller B lowers its bid once (allowed); capacity forces a split.
    const ctx = { policy: P, poolClosesAt: pool.closesAt, now: T0 + DAY, basis: 'unit' as const, maxSlabBpsOfPrice: 1000 };
    const base: Omit<Bid, 'id' | 'sellerId' | 'price' | 'capacity' | 'revision'> = {
      poolId: pool.id, basis: 'unit', deliverBy: pool.closesAt + 3 * DAY, warrantyMonths: 12, installationIncluded: true,
      optionsCovered: [], slabs: [{ fromUnit: 10, perUnitMinor: 300_00 }, { fromUnit: 25, perUnitMinor: 700_00 }],
      validUntil: pool.closesAt + 2 * DAY, submittedAt: T0 + DAY,
    };
    const a1 = acceptBid(ctx, undefined, { ...base, id: 'A1', sellerId: 'A', revision: 1, price: money('INR', 28_400_00), capacity: 20 });
    const b1 = acceptBid(ctx, undefined, { ...base, id: 'B1', sellerId: 'B', revision: 1, price: money('INR', 28_700_00), capacity: 30 });
    const b2 = acceptBid(ctx, b1, { ...b1, id: 'B2', revision: 2, price: money('INR', 28_550_00) });

    // 4. Close at the chosen time; rank by the published rule; award by join order.
    pool = close(pool, pool.closesAt).value;
    const sellers = new Map([['A', { verified: true, settledRating: 4.5 }], ['B', { verified: true, settledRating: 4.1 }]]);
    const ranked = rankBids([a1, b1, b2], { deliverBy: pool.closesAt + 5 * DAY, minWarrantyMonths: 12, installationRequired: true }, sellers);
    expect(ranked.map((b) => b.id)).toEqual(['A1', 'B2']);
    const members = pool.members.filter((m) => m.status === 'COMMITTED').map((m) => ({ memberId: m.memberId, joinedAt: m.joinedAt, qty: m.qty, options: m.options, outsideBest: money('INR', 29_600_00) }));
    const result = award(P, ranked, members);
    expect(result.assignments.filter((a) => a.sellerId === 'A')).toHaveLength(20);
    expect(result.assignments.filter((a) => a.sellerId === 'B')).toHaveLength(10);
    pool = applyAward(P, pool, new Set(result.assignments.map((a) => a.memberId)), pool.closesAt).value;

    // 5. 26 accept, 2 walk away, 2 don't reply (timeout → refund).
    const acceptors = result.assignments.slice(0, 26);
    for (const a of acceptors) pool = decide(pool, a.memberId, 'ACCEPTED', pool.closesAt + HOUR).value;
    for (const a of result.assignments.slice(26, 28)) pool = decide(pool, a.memberId, 'WALKED_AWAY', pool.closesAt + HOUR).value;

    // 6. Orders: pay, confirm, dispatch, code handover (open-box), install, settle.
    const bidById = new Map(ranked.map((b) => [b.id, b]));
    let collected = 0;
    const released: Record<string, number> = {};
    const allEvents: OrderEvent[] = [];
    const settledOrders: Order[] = [];
    acceptors.forEach((a, i) => {
      const bidUsed = bidById.get(a.bidId)!;
      const split = splitOrder(P, 'tv', a.total, { installationIncluded: true, waveHoldMinor: holdPerUnit(bidUsed.slabs) });
      let o: Order = { id: `o-${a.memberId}`, poolId: pool.id, buyerId: a.memberId, sellerId: a.sellerId, category: 'tv', split,
        promisedBy: bidUsed.deliverBy, installationIncluded: true, returnCost: money('INR', 500_00), status: 'AWAITING_PAYMENT', proofs: [], openIssue: false };
      const at = pool.closesAt + 2 * HOUR;
      o = markPaid(o, at).order;
      collected += split.total.minor;
      o = confirmBySeller(addProof(o, { kind: 'SELLER_CONFIRMATION', ref: 'ok', by: a.sellerId, at }), at).order;
      o = dispatch(addProof(o, { kind: 'DISPATCH_PHOTO', ref: 'photo', by: a.sellerId, at }), at).order;
      const { plain, stored } = issueCode(SECRET, o.id, 'DELIVERY', at + DAY);
      const v = verifyCode(SECRET, stored, plain, at + HOUR, { rightModel: true, noDamage: true, serialMatches: true });
      expect(v.ok).toBe(true);
      o = addProof(o, { kind: 'CODE_VERIFIED', ref: 'code', by: a.memberId, at: at + HOUR });
      const late = i === 0; // one delivery arrives after the promised date
      const h = handOver(P, o, late ? o.promisedBy + HOUR : at + HOUR);
      allEvents.push(...h.events);
      const inst = confirmInstalled(addProof(h.order, { kind: 'INSTALL_JOB', ref: 'JOB-1', by: 'brand', at: at + DAY }), at + DAY);
      allEvents.push(...inst.events);
      settledOrders.push(settle(P, inst.order, (h.order.handedOverAt ?? at) + 8 * DAY).order);
    });

    // 7. Wave Drop per seller (each seller's own slabs and settled units).
    const waveBySeller = (['A', 'B'] as const).map((s) => {
      const bidUsed = ranked.find((b) => b.sellerId === s)!;
      return closeWave('INR', bidUsed.slabs, settledOrders.filter((o) => o.sellerId === s).map((o) => ({ orderId: o.id, count: 1, outcome: 'settled' as const })));
    });

    // 8. Conservation: money collected = seller releases + late credits + POOL fee + GST on fee + TCS + TDS + Wave Drop refunds + wave release to seller.
    for (const e of allEvents) if (e.type === 'PAYOUT_RELEASE') released[e.orderId] = (released[e.orderId] ?? 0) + e.amount.minor;
    const lateCredits = allEvents.filter((e) => e.type === 'LATE_CREDIT').reduce((n, e) => n + ('amount' in e ? e.amount.minor : 0), 0);
    const payouts = Object.values(released).reduce((a, b) => a + b, 0);
    const platformAndTax = settledOrders.reduce((n, o) => n + o.split.fee.minor + o.split.gstOnFee.minor + o.split.tcs.minor + o.split.tds.minor, 0);
    const waveRefunds = waveBySeller.reduce((n, w) => n + w.pot.minor, 0);
    const waveRelease = waveBySeller.reduce((n, w) => n + w.releaseToSeller.minor, 0);
    expect(payouts + lateCredits + platformAndTax + waveRefunds + waveRelease).toBe(collected);

    // Seller A had 20 settled units at slabs 300 (from 10) → pot ₹3,300; seller B had 6 → pot ₹0.
    expect(waveBySeller[0]!.pot.minor).toBe(11 * 300_00);
    expect(waveBySeller[1]!.pot.minor).toBe(0);
    expect(lateCredits).toBe(P.lateCreditMinor);
    // Walked-away and timed-out members never produced an order or a charge.
    expect(settledOrders).toHaveLength(26);
  });
});
