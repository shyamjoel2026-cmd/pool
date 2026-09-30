import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { allocate, divRoundHalfUp, money, percentOf, sum } from '../src/index.ts';

describe('divRoundHalfUp', () => {
  it('rounds half away from zero', () => {
    expect(divRoundHalfUp(5, 10)).toBe(1);
    expect(divRoundHalfUp(4, 10)).toBe(0);
    expect(divRoundHalfUp(-5, 10)).toBe(-1);
    expect(divRoundHalfUp(15, 10)).toBe(2);
  });
  it('is within half a unit of the exact quotient', () => {
    fc.assert(
      fc.property(fc.integer({ min: -1e9, max: 1e9 }), fc.integer({ min: 1, max: 1e6 }), (n, d) => {
        expect(Math.abs(divRoundHalfUp(n, d) - n / d)).toBeLessThanOrEqual(0.5 + 1e-9);
      }),
    );
  });
});

describe('percentOf', () => {
  it('computes basis points with half-up rounding', () => {
    expect(percentOf(money('INR', 28_400_00), 300).minor).toBe(85_200);
    expect(percentOf(money('INR', 85_200), 1800).minor).toBe(15_336);
    expect(percentOf(money('INR', 1), 5000).minor).toBe(1);
  });
});

describe('allocate', () => {
  it('always sums exactly to the total (property)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1e10 }),
        fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 1, maxLength: 60 }).filter((w) => w.some((x) => x > 0)),
        (total, weights) => {
          const parts = allocate(money('INR', total), weights);
          expect(sum('INR', parts).minor).toBe(total);
          parts.forEach((p, i) => {
            const exact = (total * weights[i]!) / weights.reduce((a, b) => a + b, 0);
            expect(Math.abs(p.minor - exact)).toBeLessThan(1);
          });
        },
      ),
    );
  });
  it('equal weights differ by at most one minor unit, extra goes to earlier parts', () => {
    const parts = allocate(money('INR', 1_150_000), Array(34).fill(1));
    const values = parts.map((p) => p.minor);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
    expect(values.reduce((a, b) => a + b, 0)).toBe(1_150_000);
    expect(values[0]).toBeGreaterThanOrEqual(values[33]!);
  });
  it('rejects bad input', () => {
    expect(() => allocate(money('INR', 10), [])).toThrow();
    expect(() => allocate(money('INR', 10), [0, 0])).toThrow();
    expect(() => allocate(money('INR', -1), [1])).toThrow();
    expect(() => money('INR', 1.5)).toThrow();
  });
});
