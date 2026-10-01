import { describe, expect, it } from 'vitest';
import {
  acceptBid,
  anomalousBids,
  award,
  type Bid,
  type BidContext,
  INDIA_POLICY,
  money,
  qty,
  rankBids,
  type SellerFacts,
  UOM,
} from '../src/index.ts';

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 10, 10);
const CLOSE = NOW + 48 * HOUR;
const ctx: BidContext = {
  policy: INDIA_POLICY,
  poolClosesAt: CLOSE,
  now: NOW,
  uom: UOM.piece,
  maxSlabBpsOfPrice: 1000,
};

const bid = (o: Partial<Bid> = {}): Bid => ({
  id: 'b1',
  poolId: 'p1',
  sellerId: 's1',
  revision: 1,
  sellerPrice: money('INR', 40_000_00),
  uom: 'piece',
  capacityBase: 10,
  deliverBy: CLOSE + 72 * HOUR,
  modes: ['home_delivery'],
  terms: { warranty_months: 12 },
  optionsCovered: [],
  slabs: [{ fromUnit: 10, perUnitMinor: 300_00 }],
  validUntil: CLOSE + 25 * HOUR,
  submittedAt: NOW,
  ...o,
});

describe('acceptBid (default C: lower only)', () => {
  it('accepts a valid first bid and a lower revision', () => {
    expect(acceptBid(ctx, undefined, bid()).id).toBe('b1');
    expect(
      acceptBid(ctx, bid(), bid({ id: 'r2', revision: 2, sellerPrice: money('INR', 39_500_00) }))
        .sellerPrice.minor,
    ).toBe(39_500_00);
  });
  it('rejects raising, late bids, wrong currency/unit, no modes, short validity, oversized slabs', () => {
    expect(() =>
      acceptBid(ctx, bid(), bid({ id: 'r2', revision: 2, sellerPrice: money('INR', 40_500_00) })),
    ).toThrow(/lowered/);
    expect(() => acceptBid({ ...ctx, now: CLOSE }, undefined, bid())).toThrow(
      /after the pool closes/,
    );
    expect(() => acceptBid(ctx, undefined, bid({ sellerPrice: money('USD', 1_00) }))).toThrow(
      /currency/,
    );
    expect(() => acceptBid(ctx, undefined, bid({ uom: 'kg' }))).toThrow(/priced per piece/);
    expect(() => acceptBid(ctx, undefined, bid({ modes: [] }))).toThrow(/delivery mode/);
    expect(() => acceptBid(ctx, undefined, bid({ validUntil: CLOSE + HOUR }))).toThrow(
      /accept window/,
    );
    expect(() =>
      acceptBid(ctx, undefined, bid({ slabs: [{ fromUnit: 1, perUnitMinor: 5_000_00 }] })),
    ).toThrow();
  });
});

describe('anomaly flag (>15% below median seller price)', () => {
  it('flags an unusually low bid, needs ≥ 3 bids', () => {
    const three = [
      bid({ id: 'a', sellerPrice: money('INR', 900_00) }),
      bid({ id: 'b', sellerPrice: money('INR', 880_00) }),
      bid({ id: 'c', sellerPrice: money('INR', 700_00) }),
    ];
    expect([...anomalousBids(INDIA_POLICY, three)]).toEqual(['c']);
    expect(anomalousBids(INDIA_POLICY, three.slice(0, 2)).size).toBe(0);
  });
});

describe('rankBids — requirements are data (terms + modes), published order', () => {
  const sellers = new Map<string, SellerFacts>([
    ['s1', { verified: true, settledRating: 4.2 }],
    ['s2', { verified: true, settledRating: 4.8 }],
    ['s3', { verified: false }],
  ]);
  it('electronics-style pool: needs warranty ≥ 12 months and home delivery', () => {
    const req = {
      deliverBy: CLOSE + 96 * HOUR,
      acceptableModes: ['home_delivery'],
      terms: [{ key: 'warranty_months', op: 'gte' as const, value: 12 }],
    };
    const ranked = rankBids(
      [
        bid({
          id: 'unverified',
          sellerId: 's3',
          sellerPrice: money('INR', 30_000_00),
        }),
        bid({
          id: 'short-warranty',
          sellerId: 's1',
          sellerPrice: money('INR', 35_000_00),
          terms: { warranty_months: 6 },
        }),
        bid({ id: 's2', sellerId: 's2', sellerPrice: money('INR', 40_000_00) }),
      ],
      req,
      sellers,
    );
    expect(ranked.map((b) => b.id)).toEqual(['s2']);
  });
  it('food-style pool: needs store pickup and same-day preparation', () => {
    const req = {
      deliverBy: CLOSE + 24 * HOUR,
      acceptableModes: ['store_pickup'],
      terms: [{ key: 'same_day_prep', op: 'eq' as const, value: true }],
    };
    const ok = bid({
      id: 'fresh',
      uom: 'kg',
      modes: ['store_pickup'],
      terms: { same_day_prep: true },
      deliverBy: CLOSE + 12 * HOUR,
    });
    const noPickup = bid({
      id: 'deliver-only',
      sellerId: 's2',
      uom: 'kg',
      modes: ['home_delivery'],
      terms: { same_day_prep: true },
      deliverBy: CLOSE + 12 * HOUR,
    });
    expect(rankBids([ok, noPickup], req, sellers).map((b) => b.id)).toEqual(['fresh']);
  });
  it('ties: earlier delivery, then better settled rating', () => {
    const req = {
      deliverBy: CLOSE + 96 * HOUR,
      acceptableModes: [],
      terms: [],
    };
    const ranked = rankBids(
      [bid({ id: 'a', sellerId: 's1' }), bid({ id: 'b', sellerId: 's2' })],
      req,
      sellers,
    );
    expect(ranked.map((b) => b.id)).toEqual(['b', 'a']);
  });
});

describe('award (default A: earliest joiners get the best seller; capacity in base units)', () => {
  const m = (id: string, at: number, base: number, options: string[] = []) => ({
    memberId: id,
    joinedAt: at,
    qty: qty(UOM.kg, base),
    options,
    needBy: CLOSE + 96 * HOUR,
  });
  const kgBid = (o: Partial<Bid>) => bid({ uom: 'kg', ...o });
  it('splits kg capacity in join order and records a backup', () => {
    const ranked = [
      kgBid({ id: 'win', sellerId: 's1', capacityBase: 2000 }),
      kgBid({ id: 'next', sellerId: 's2', capacityBase: 10_000 }),
    ];
    const r = award(ranked, [m('c', 3, 1000), m('a', 1, 1000), m('b', 2, 1000)]);
    expect(r.assignments.map((x) => [x.memberId, x.bidId])).toEqual([
      ['a', 'win'],
      ['b', 'win'],
      ['c', 'next'],
    ]);
    expect(r.assignments[0]!.backupBidId).toBe('next');
  });
  it('capacity is never exceeded; options must be covered', () => {
    expect(
      award([kgBid({ capacityBase: 1000 })], [m('a', 1, 1000), m('b', 2, 500)]).unserved,
    ).toEqual([{ memberId: 'b', reason: 'NO_CAPACITY' }]);
    expect(
      award([kgBid({ optionsCovered: ['cut:curry'] })], [m('a', 1, 1000, ['cut:boneless'])])
        .unserved,
    ).toEqual([{ memberId: 'a', reason: 'OPTIONS_NOT_COVERED' }]);
  });
});
