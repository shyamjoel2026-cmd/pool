import { describe, expect, it } from 'vitest';
import {
  acceptBid,
  anomalousBids,
  award,
  type Bid,
  type BidContext,
  type CommittedMember,
  INDIA_POLICY,
  isListable,
  minSaving,
  money,
  rankBids,
  type SellerFacts,
  units,
} from '../src/index.ts';

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 10, 10);
const CLOSE = NOW + 48 * HOUR;
const ctx: BidContext = { policy: INDIA_POLICY, poolClosesAt: CLOSE, now: NOW, basis: 'unit', maxSlabBpsOfPrice: 1000 };

function bid(overrides: Partial<Bid> = {}): Bid {
  return {
    id: 'b1',
    poolId: 'p1',
    sellerId: 's1',
    revision: 1,
    price: money('INR', 28_400_00),
    basis: 'unit',
    capacity: 10,
    deliverBy: CLOSE + 72 * HOUR,
    warrantyMonths: 12,
    installationIncluded: true,
    optionsCovered: [],
    slabs: [{ fromUnit: 10, perUnitMinor: 300_00 }],
    validUntil: CLOSE + 25 * HOUR,
    submittedAt: NOW,
    ...overrides,
  };
}

describe('minimum saving / listing rule', () => {
  it('India: max(₹1,000, 2%)', () => {
    expect(minSaving(INDIA_POLICY, money('INR', 30_000_00)).minor).toBe(1_000_00);
    expect(minSaving(INDIA_POLICY, money('INR', 80_000_00)).minor).toBe(1_600_00);
    expect(isListable(INDIA_POLICY, money('INR', 28_400_00), money('INR', 29_600_00))).toBe(true); // saves ₹1,200
    expect(isListable(INDIA_POLICY, money('INR', 28_800_00), money('INR', 29_600_00))).toBe(false); // saves ₹800
  });
});

describe('acceptBid (default C: lower only)', () => {
  it('accepts a valid first bid', () => {
    expect(acceptBid(ctx, undefined, bid()).id).toBe('b1');
  });
  it('rejects raising the price', () => {
    expect(() => acceptBid(ctx, bid(), bid({ id: 'b1r2', revision: 2, price: money('INR', 28_500_00) }))).toThrow(/lowered/);
  });
  it('accepts lowering the price', () => {
    expect(acceptBid(ctx, bid(), bid({ id: 'b1r2', revision: 2, price: money('INR', 28_000_00) })).price.minor).toBe(28_000_00);
  });
  it('rejects bids after close, wrong currency, short validity, oversized slabs', () => {
    expect(() => acceptBid({ ...ctx, now: CLOSE }, undefined, bid())).toThrow(/after the pool closes/);
    expect(() => acceptBid(ctx, undefined, bid({ price: money('USD', 100_00) }))).toThrow(/currency/);
    expect(() => acceptBid(ctx, undefined, bid({ validUntil: CLOSE + HOUR }))).toThrow(/accept window/);
    expect(() => acceptBid(ctx, undefined, bid({ slabs: [{ fromUnit: 1, perUnitMinor: 5_000_00 }] }))).toThrow();
  });
});

describe('anomaly flag (>15% below median)', () => {
  it('flags an unusually low bid', () => {
    const bids = [bid({ id: 'a', price: money('INR', 30_000_00) }), bid({ id: 'b', price: money('INR', 29_500_00) }), bid({ id: 'c', price: money('INR', 24_000_00) })];
    expect([...anomalousBids(INDIA_POLICY, bids)]).toEqual(['c']);
  });
  it('needs at least 3 bids', () => {
    expect(anomalousBids(INDIA_POLICY, [bid(), bid({ id: 'z', price: money('INR', 1_00) })]).size).toBe(0);
  });
});

describe('rankBids — published rule', () => {
  const sellers = new Map<string, SellerFacts>([
    ['s1', { verified: true, settledRating: 4.2 }],
    ['s2', { verified: true, settledRating: 4.8 }],
    ['s3', { verified: false }],
  ]);
  const minimums = { deliverBy: CLOSE + 96 * HOUR, minWarrantyMonths: 12, installationRequired: true };
  it('lowest price wins; ties → earlier delivery → better rating; unverified and non-compliant excluded', () => {
    const ranked = rankBids(
      [
        bid({ id: 'cheap-unverified', sellerId: 's3', price: money('INR', 25_000_00) }),
        bid({ id: 's1', sellerId: 's1', price: money('INR', 28_000_00) }),
        bid({ id: 's2', sellerId: 's2', price: money('INR', 28_000_00) }),
        bid({ id: 's2-late', sellerId: 's2', revision: 0, price: money('INR', 27_000_00), deliverBy: CLOSE + 200 * HOUR }),
      ],
      minimums,
      sellers,
    );
    expect(ranked.map((b) => b.id)).toEqual(['s2', 's1']); // same price & delivery → s2's better rating wins
  });
  it('uses the latest revision per seller', () => {
    const ranked = rankBids([bid({ id: 'r1', revision: 1 }), bid({ id: 'r2', revision: 2, price: money('INR', 27_000_00) })], minimums, sellers);
    expect(ranked.map((b) => b.id)).toEqual(['r2']);
  });
});

describe('award (default A: earliest joiners get the best price; capacity respected)', () => {
  const member = (id: string, joinedAt: number, qty = 1, options: string[] = []): CommittedMember => ({
    memberId: id,
    joinedAt,
    qty: units(qty),
    options,
    outsideBest: money('INR', 29_600_00 * qty),
  });
  it('splits by capacity in join order and records a backup', () => {
    const ranked = [bid({ id: 'win', sellerId: 's1', capacity: 2 }), bid({ id: 'next', sellerId: 's2', price: money('INR', 28_500_00), capacity: 5 })];
    const r = award(INDIA_POLICY, ranked, [member('m3', 3), member('m1', 1), member('m2', 2)]);
    expect(r.assignments.map((a) => [a.memberId, a.bidId])).toEqual([
      ['m1', 'win'],
      ['m2', 'win'],
      ['m3', 'next'],
    ]);
    expect(r.assignments[0]!.backupBidId).toBe('next');
    expect(r.unserved).toEqual([]);
  });
  it('never exceeds capacity; excess members are unserved (refunded)', () => {
    const r = award(INDIA_POLICY, [bid({ capacity: 1 })], [member('a', 1), member('b', 2)]);
    expect(r.assignments).toHaveLength(1);
    expect(r.unserved).toEqual([{ memberId: 'b', reason: 'NO_CAPACITY' }]);
  });
  it('members whose options no bid covers are unserved', () => {
    const r = award(INDIA_POLICY, [bid({ optionsCovered: ['cut:curry'] })], [member('a', 1, 1, ['cut:boneless'])]);
    expect(r.unserved).toEqual([{ memberId: 'a', reason: 'OPTIONS_NOT_COVERED' }]);
  });
  it('an offer that does not beat the outside price by the minimum saving is not made', () => {
    const r = award(INDIA_POLICY, [bid({ price: money('INR', 29_000_00) })], [member('a', 1)]);
    expect(r.unserved).toEqual([{ memberId: 'a', reason: 'NOT_LISTABLE' }]);
  });
});
