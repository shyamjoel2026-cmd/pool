import { describe, expect, it } from 'vitest';
import {
  acceptBid, applyAward, award, type Bid, close, closeWave, completeStep, confirmBooking, createPool, decide,
  type FulfilmentProfile, handOver, holdPerUnit, INDIA_POLICY, issueCode, join, makeOffers, markPaid, money,
  type Order, type OrderEvent, type Policy, type PriceDecision, PROFILES, qty, type QuantityRule, rankBids,
  releaseDueHolds, settle, splitOrder, type TermRequirement, type Terms, UOM, type UnitOfMeasure, US_POLICY,
  verifyCode, waveCount, type WaveCountMode,
} from '../src/index.ts';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = Date.UTC(2026, 10, 16, 4, 30);
const SECRET = 'scenario-secret-that-is-at-least-32-chars';

interface Case {
  name: string;
  policy: Policy;
  categoryPath: string[];
  uom: UnitOfMeasure;
  rule: QuantityRule;
  buyerQtyBase: number;
  profile: FulfilmentProfile;
  goodsTaxBps: number;
  waveCountMode: WaveCountMode;
  terms: Terms;
  requirements: TermRequirement[];
  sellerPrices: [number, number]; // seller A, seller B per uom (minor)
  capacityA: number; // base units
  teamPrices: [number, number]; // team's buyer price for A's and B's bid
  slabs: Bid['slabs'];
}

const cases: Case[] = [
  {
    name: 'TV, India — delivery + installation, 18% GST, seller ₹40,000 → team ₹43,000',
    policy: INDIA_POLICY, categoryPath: ['electronics', 'tv'], uom: UOM.piece,
    rule: { uom: UOM.piece, minBase: 1, stepBase: 1, maxPerHouseholdBase: 2 }, buyerQtyBase: 1,
    profile: PROFILES.delivery_with_installation!, goodsTaxBps: 1800, waveCountMode: 'per_uom',
    terms: { warranty_months: 12 }, requirements: [{ key: 'warranty_months', op: 'gte', value: 12 }],
    sellerPrices: [40_000_00, 40_300_00], capacityA: 20, teamPrices: [43_000_00, 43_000_00],
    slabs: [{ fromUnit: 10, perUnitMinor: 300_00 }, { fromUnit: 25, perUnitMinor: 700_00 }],
  },
  {
    name: 'Meat, India — 1 kg each, store pickup, 0% GST, seller ₹800/kg → team ₹860/kg',
    policy: INDIA_POLICY, categoryPath: ['food', 'meat'], uom: UOM.kg,
    rule: { uom: UOM.kg, minBase: 500, stepBase: 250, maxPerHouseholdBase: 2000 }, buyerQtyBase: 1000,
    profile: PROFILES.store_pickup!, goodsTaxBps: 0, waveCountMode: 'per_order',
    terms: { same_day_prep: true }, requirements: [{ key: 'same_day_prep', op: 'eq', value: true }],
    sellerPrices: [800_00, 820_00], capacityA: 20_000, teamPrices: [860_00, 860_00],
    slabs: [{ fromUnit: 10, perUnitMinor: 10_00 }, { fromUnit: 20, perUnitMinor: 20_00 }],
  },
  {
    name: 'Any product, USA — home delivery, USD, seller $850 → team $899',
    policy: US_POLICY, categoryPath: ['home', 'furniture'], uom: UOM.piece,
    rule: { uom: UOM.piece, minBase: 1, stepBase: 1 }, buyerQtyBase: 1,
    profile: PROFILES.home_delivery!, goodsTaxBps: 0, waveCountMode: 'per_uom',
    terms: {}, requirements: [],
    sellerPrices: [850_00, 860_00], capacityA: 20, teamPrices: [899_00, 905_00],
    slabs: [{ fromUnit: 5, perUnitMinor: 10_00 }],
  },
];

describe.each(cases)('end-to-end: $name', (c) => {
  it('30 buyers, 2 sealed bids, team pricing, fulfilment, settlement, Wave Drop — every minor unit accounted for', () => {
    const P = c.policy;
    const cur = P.currency;
    // Pool: a buyer starts it and chooses to close it in 3 days.
    let pool = createPool(P, { id: 'pool', categoryPath: c.categoryPath, productKey: 'prod-1', areaKey: 'area-1', quantityRule: c.rule, fulfilmentProfileId: c.profile.id, waveCountMode: c.waveCountMode, createdBy: 'u0', createdAt: T0, closesAt: T0 + 3 * DAY }, T0).value;
    const ids = Array.from({ length: 30 }, (_, i) => `m${i + 1}`);
    ids.forEach((id, i) => {
      pool = join(P, pool, { memberId: id, userId: `u-${id}`, householdKey: `h-${id}`, payerKey: `p-${id}`, qty: qty(c.uom, c.buyerQtyBase), options: [], needBy: T0 + 14 * DAY }, T0 + i * HOUR).value;
      pool = confirmBooking(pool, id, T0 + i * HOUR + 1).value;
    });

    // Two verified sellers bid their OWN prices (sealed). Seller A's capacity forces a split (default A).
    const ctx = { policy: P, poolClosesAt: pool.closesAt, now: T0 + DAY, uom: c.uom, maxSlabBpsOfPrice: 1000 };
    const common = { poolId: pool.id, uom: c.uom.code, deliverBy: pool.closesAt + 2 * DAY, modes: c.profile.modes, terms: c.terms, optionsCovered: [], slabs: c.slabs, validUntil: pool.closesAt + 2 * DAY, submittedAt: T0 + DAY, revision: 1 };
    const bidA = acceptBid(ctx, undefined, { ...common, id: 'A', sellerId: 'A', sellerPrice: money(cur, c.sellerPrices[0]), capacityBase: c.capacityA });
    const bidB = acceptBid(ctx, undefined, { ...common, id: 'B', sellerId: 'B', sellerPrice: money(cur, c.sellerPrices[1]), capacityBase: 1_000_000 });

    pool = close(pool, pool.closesAt).value;
    const ranked = rankBids([bidA, bidB], { deliverBy: pool.closesAt + 5 * DAY, acceptableModes: c.profile.modes, terms: c.requirements }, new Map([['A', { verified: true }], ['B', { verified: true }]]));
    expect(ranked.map((b) => b.id)).toEqual(['A', 'B']);
    const committed = pool.members.filter((x) => x.status === 'COMMITTED');
    const { assignments, unserved } = award(ranked, committed.map((x) => ({ memberId: x.memberId, joinedAt: x.joinedAt, qty: x.qty, options: x.options })));
    expect(unserved).toEqual([]);

    // The TEAM sets the buyer price for each awarded bid (no fixed fee).
    const decisions = new Map<string, PriceDecision>([
      ['A', { poolId: pool.id, bidId: 'A', buyerPrice: money(cur, c.teamPrices[0]), decidedBy: 'team', decidedAt: pool.closesAt }],
      ['B', { poolId: pool.id, bidId: 'B', buyerPrice: money(cur, c.teamPrices[1]), decidedBy: 'team', decidedAt: pool.closesAt }],
    ]);
    const offers = makeOffers(P, c.uom, assignments.map((a) => ({ memberId: a.memberId, bidId: a.bidId, sellerId: a.sellerId, sellerPrice: a.sellerPrice, qty: a.qty })), decisions);
    pool = applyAward(P, pool, new Set(offers.map((o) => o.memberId)), pool.closesAt).value;

    // 26 accept, 4 walk away (their bookings are refunded; they never become orders).
    const accepted = offers.slice(0, 26);
    for (const o of accepted) pool = decide(pool, o.memberId, 'ACCEPTED', pool.closesAt + HOUR).value;
    for (const o of offers.slice(26)) pool = decide(pool, o.memberId, 'WALKED_AWAY', pool.closesAt + HOUR).value;

    // Orders run through whatever the fulfilment profile says.
    let collected = 0;
    const events: OrderEvent[] = [];
    const settled: Order[] = [];
    const bidById = new Map(ranked.map((b) => [b.id, b]));
    accepted.forEach((off, i) => {
      const split = splitOrder(P, { buyerTotal: off.buyerTotal, sellerTotal: off.sellerTotal, goodsTaxBps: c.goodsTaxBps, profile: c.profile, waveHoldMinor: holdPerUnit(bidById.get(off.bidId)!.slabs) * waveCount(off.qty, c.uom, c.waveCountMode) });
      let o: Order = { id: `o-${off.memberId}`, poolId: pool.id, buyerId: off.memberId, sellerId: off.sellerId, profile: c.profile, split, promisedBy: bidById.get(off.bidId)!.deliverBy, returnCost: money(cur, 100_00), status: 'AWAITING_PAYMENT', steps: [], holdDeferrals: {}, holdsReleased: [], openIssue: false };
      const at = pool.closesAt + 2 * HOUR;
      o = markPaid(o, at).order;
      collected += split.buyerTotal.minor;
      for (const s of c.profile.steps.filter((x) => !x.afterHandover)) o = completeStep(o, s.key, `${s.proof}-${i}`, o.sellerId, at).order;
      const code = issueCode(SECRET, o.id, c.profile.codeDigits, at + DAY, c.profile.handoverChecklist);
      const v = verifyCode(SECRET, code.stored, code.plain, at + HOUR, Object.fromEntries(c.profile.handoverChecklist.map((k) => [k, true])));
      expect(v.ok).toBe(true);
      const h = handOver(o, `verified-${o.id}`, at + HOUR);
      events.push(...h.events);
      o = h.order;
      // Half the orders complete after-handover steps; the rest release holds by timeout.
      for (const s of c.profile.steps.filter((x) => x.afterHandover)) {
        if (i % 2 === 0) {
          const r = completeStep(o, s.key, `${s.proof}-${i}`, 'partner', at + DAY);
          events.push(...r.events);
          o = r.order;
        }
      }
      const t = releaseDueHolds(o, at + 60 * DAY);
      events.push(...t.events);
      o = t.order;
      settled.push(settle(o, at + 60 * DAY).order);
    });

    // Wave Drop per seller (own slabs, own settled units).
    const waves = ['A', 'B'].map((sid) =>
      closeWave(cur, bidById.get(sid)!.slabs, settled.filter((o) => o.sellerId === sid).map((o) => ({ orderId: o.id, count: waveCount(offers.find((x) => `o-${x.memberId}` === o.id)!.qty, c.uom, c.waveCountMode), outcome: 'settled' as const }))),
    );

    // Conservation: everything the buyers paid = seller payouts + late credits + POOL margin + TCS + TDS + Wave Drop refunds + wave release.
    const sumType = (t: OrderEvent['type']) => events.filter((e) => e.type === t).reduce((n, e) => n + ('amount' in e ? e.amount.minor : 0), 0);
    const margin = settled.reduce((n, o) => n + o.split.margin.minor, 0);
    const taxes = settled.reduce((n, o) => n + o.split.tcs.minor + o.split.tds.minor, 0);
    const waveRefund = waves.reduce((n, w) => n + w.pot.minor, 0);
    const waveRelease = waves.reduce((n, w) => n + w.releaseToSeller.minor, 0);
    expect(sumType('PAYOUT_RELEASE') + sumType('LATE_CREDIT') + margin + taxes + waveRefund + waveRelease).toBe(collected);
    expect(settled).toHaveLength(26);
    expect(margin).toBe(offers.slice(0, 26).reduce((n, o) => n + o.marginTotal.minor, 0));
  });
});
