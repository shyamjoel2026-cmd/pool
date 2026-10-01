import { expect, it } from 'vitest';
import fc from 'fast-check';
import { allocate, award, money, percentOf, type Bid } from '../src/index.ts';

const bid = (id: string, deliverBy: number): Bid => ({
  id,
  sellerId: id,
  poolId: 'p',
  revision: 1,
  sellerPrice: money('INR', 10000),
  uom: 'piece',
  capacityBase: 5,
  deliverBy,
  modes: ['pickup'],
  terms: {},
  optionsCovered: [],
  slabs: [],
  validUntil: 1000,
  submittedAt: 1,
});
it('skips a cheaper Monday bid for a Friday deadline and uses an on-time backup only', () => {
  const member = {
    memberId: 'm',
    joinedAt: 1,
    qty: { uom: 'piece', base: 1 },
    options: [],
    needBy: 5,
  };
  expect(award([bid('monday', 8), bid('friday', 5)], [member]).assignments[0]).toMatchObject({
    bidId: 'friday',
    backupBidId: undefined,
  });
  expect(award([bid('monday', 8)], [member]).unserved).toEqual([
    { memberId: 'm', reason: 'NEED_BY' },
  ]);
});
it('every assignment meets the deadline (property)', () => {
  fc.assert(
    fc.property(
      fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1 }),
      fc.integer({ min: 1, max: 100 }),
      (days, needBy) => {
        const bids = days.map((d, i) => bid(String(i), d));
        const result = award(bids, [
          { memberId: 'm', joinedAt: 1, qty: { uom: 'piece', base: 1 }, options: [], needBy },
        ]);
        for (const assignment of result.assignments)
          expect(bids.find((b) => b.id === assignment.bidId)!.deliverBy).toBeLessThanOrEqual(
            needBy,
          );
      },
    ),
  );
});
it('allocates full safe-integer totals without overflowing intermediate products (property)', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
      fc.array(fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }), {
        minLength: 1,
        maxLength: 20,
      }),
      (total, weights) => {
        const parts = allocate(money('INR', total), weights);
        expect(parts.reduce((n, p) => n + BigInt(p.minor), 0n)).toBe(BigInt(total));
        const denominator = weights.reduce((n, w) => n + BigInt(w), 0n);
        parts.forEach((part, i) => {
          const numerator = BigInt(total) * BigInt(weights[i]!);
          const difference = BigInt(part.minor) * denominator - numerator;
          expect(difference < denominator && difference > -denominator).toBe(true);
        });
      },
    ),
  );
  expect(percentOf(money('INR', Number.MAX_SAFE_INTEGER), 10000).minor).toBe(
    Number.MAX_SAFE_INTEGER,
  );
});
