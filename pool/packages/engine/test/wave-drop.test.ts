import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { closeWave, holdPerUnit, potFor, slabAt, type Slab, validateSlabs } from '../src/index.ts';

// The founder's example tiers, as slabs (₹, in paise): from unit 10 ₹300, from 25 ₹700, from 50 ₹1,000.
const SLABS: Slab[] = [
  { fromUnit: 10, perUnitMinor: 300_00 },
  { fromUnit: 25, perUnitMinor: 700_00 },
  { fromUnit: 50, perUnitMinor: 1000_00 },
];

describe('slab pot — matches POOL_WORKING_MODEL_v3.md §5 table', () => {
  const cases: Array<[number, number, number]> = [
    // settled units, pot ₹, each buyer ₹ (rounded)
    [10, 300, 30],
    [25, 5_200, 208],
    [34, 11_500, 338],
    [49, 22_000, 449],
    [50, 23_000, 460],
    [100, 73_000, 730],
  ];
  it.each(cases)('N=%i → pot ₹%i, ≈ ₹%i each', (n, potRupees, eachRupees) => {
    expect(potFor(SLABS, n)).toBe(potRupees * 100);
    const orders = Array.from({ length: n }, (_, i) => ({ orderId: `o${i}`, count: 1, outcome: 'settled' as const }));
    const r = closeWave('INR', SLABS, orders);
    expect(r.pot.minor).toBe(potRupees * 100);
    const avgRupees = r.refunds.reduce((a, x) => a + x.amount.minor, 0) / n / 100;
    expect(Math.round(avgRupees)).toBe(eachRupees);
  });

  it('the original whole-group tier design pays the dealer to stall at 49; the slab pot does not', () => {
    const margin = 1800_00; // example margin per unit
    const tier = (n: number) => (n >= 50 ? 1000_00 : n >= 25 ? 700_00 : n >= 10 ? 300_00 : 0);
    const tierProfit = (n: number) => n * (margin - tier(n));
    expect(tierProfit(50) - tierProfit(49)).toBe(-13_900_00); // the 50th sale costs ₹13,900
    const slabProfit = (n: number) => n * margin - potFor(SLABS, n);
    expect(slabProfit(50) - slabProfit(49)).toBe(800_00); // the 50th sale earns ₹800
  });
});

describe('slab pot invariants (property)', () => {
  const slabsArb = fc
    .uniqueArray(fc.integer({ min: 1, max: 80 }), { minLength: 0, maxLength: 5 })
    .chain((starts) => {
      const sorted = [...starts].sort((a, b) => a - b);
      return fc.tuple(fc.constant(sorted), fc.array(fc.integer({ min: 0, max: 2000_00 }), { minLength: sorted.length, maxLength: sorted.length }));
    })
    .map(([starts, amounts]) => starts.map((fromUnit, i) => ({ fromUnit, perUnitMinor: amounts[i]! })));

  it('every extra settled unit never lowers the seller profit when slabs ≤ margin', () => {
    fc.assert(
      fc.property(slabsArb, fc.integer({ min: 1, max: 150 }), (slabs, n) => {
        const margin = holdPerUnit(slabs); // worst case: margin exactly equals the largest slab
        const profit = (k: number) => k * margin - potFor(slabs, k);
        expect(profit(n + 1) - profit(n)).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it('refunds sum to the pot and holds are fully accounted for', () => {
    const outcome = fc.constantFrom('settled', 'seller_cancelled', 'buyer_cancelled', 'returned') as fc.Arbitrary<
      'settled' | 'seller_cancelled' | 'buyer_cancelled' | 'returned'
    >;
    fc.assert(
      fc.property(slabsArb, fc.array(fc.tuple(fc.integer({ min: 1, max: 3 }), outcome), { maxLength: 120 }), (slabs, raw) => {
        const orders = raw.map(([count, o], i) => ({ orderId: `o${i}`, count, outcome: o }));
        const r = closeWave('INR', slabs, orders);
        expect(r.refunds.reduce((a, x) => a + x.amount.minor, 0)).toBe(r.pot.minor);
        expect(r.releaseToSeller.minor + r.pot.minor).toBe(r.heldFromSettled.minor + r.sellerPenalty.minor);
        expect(r.releaseToSeller.minor).toBeGreaterThanOrEqual(0);
      }),
    );
  });
});

describe('seller-cancelled orders still pay their slab', () => {
  it('penalty equals the slabs those units would have added', () => {
    const orders = [
      ...Array.from({ length: 24 }, (_, i) => ({ orderId: `s${i}`, count: 1, outcome: 'settled' as const })),
      { orderId: 'x1', count: 1, outcome: 'seller_cancelled' as const },
    ];
    const r = closeWave('INR', SLABS, orders);
    expect(r.sellerPenalty.minor).toBe(slabAt(SLABS, 25)); // unit 25 → ₹700
    expect(r.pot.minor).toBe(potFor(SLABS, 24) + 700_00);
  });
});

describe('validateSlabs', () => {
  it('rejects unsorted, zero-start and over-cap slabs', () => {
    expect(() => validateSlabs([{ fromUnit: 5, perUnitMinor: 1 }, { fromUnit: 5, perUnitMinor: 2 }], 100)).toThrow();
    expect(() => validateSlabs([{ fromUnit: 0, perUnitMinor: 1 }], 100)).toThrow();
    expect(() => validateSlabs([{ fromUnit: 1, perUnitMinor: 101 }], 100)).toThrow();
    expect(() => validateSlabs(SLABS, 1000_00)).not.toThrow();
  });
});
