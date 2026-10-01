import { allocate, money, type Currency, type Money, MoneyError, sub, sum } from './money.ts';

/**
 * Wave Drop — the founder's settled-volume bonus, redesigned as a SLAB POT.
 *
 * - The seller publishes slabs: "from the Nth settled unit, each unit adds ₹X to the pot".
 * - Pot(N) = sum of slab(i) for i = 1..N  (plus any penalty slabs from seller-cancelled orders).
 * - The pot is split among settled buyers in proportion to their counted units.
 *
 * Why not "every buyer gets the tier amount" (the original design)? With whole-group tiers the
 * unit that crosses a tier can COST the seller money (e.g. ₹13,900 at unit 50 with a ₹1,800 margin),
 * so the seller is paid to stall at 49. With a slab pot, adding unit N+1 changes the seller's profit
 * by (margin − slab(N+1)), which is never negative as long as every slab ≤ the seller's margin.
 */
export interface Slab {
  /** 1-based position of the settled unit from which this amount applies. */
  readonly fromUnit: number;
  /** Amount added to the pot by each settled unit at/after `fromUnit` (minor units, ≥ 0). */
  readonly perUnitMinor: number;
}

export class WaveDropError extends Error {
  override name = 'WaveDropError';
}

export function validateSlabs(slabs: readonly Slab[], maxPerUnitMinor: number): void {
  let prev = 0;
  for (const s of slabs) {
    if (!Number.isSafeInteger(s.fromUnit) || s.fromUnit < 1)
      throw new WaveDropError('fromUnit must be a positive integer');
    if (s.fromUnit <= prev)
      throw new WaveDropError('slabs must be sorted by strictly increasing fromUnit');
    if (!Number.isSafeInteger(s.perUnitMinor) || s.perUnitMinor < 0)
      throw new WaveDropError('perUnitMinor must be a non-negative integer');
    if (s.perUnitMinor > maxPerUnitMinor)
      throw new WaveDropError(`slab ${s.perUnitMinor} exceeds cap ${maxPerUnitMinor}`);
    prev = s.fromUnit;
  }
}

/** Amount that the i-th settled unit adds to the pot. */
export function slabAt(slabs: readonly Slab[], i: number): number {
  let amount = 0;
  for (const s of slabs) {
    if (s.fromUnit <= i) amount = s.perUnitMinor;
    else break;
  }
  return amount;
}

/** Largest slab: the amount held back from EACH counted unit's payout until the pool closes. */
export function holdPerUnit(slabs: readonly Slab[]): number {
  return slabs.reduce((m, s) => Math.max(m, s.perUnitMinor), 0);
}

/** Pot for N settled units. */
export function potFor(slabs: readonly Slab[], settledUnits: number): number {
  let total = 0;
  for (let i = 1; i <= settledUnits; i++) total += slabAt(slabs, i);
  return total;
}

export interface WaveOrder {
  readonly orderId: string;
  /** Units counted toward the wave (units for per-unit goods, 1 per order for weighed goods). */
  readonly count: number;
  readonly outcome: 'settled' | 'seller_cancelled' | 'buyer_cancelled' | 'returned';
}

export interface WaveCloseResult {
  readonly currency: Currency;
  readonly settledUnits: number;
  readonly pot: Money;
  /** Partial refund owed to each settled order's buyer. */
  readonly refunds: ReadonlyArray<{ orderId: string; amount: Money }>;
  /** Total held from settled orders' payouts. */
  readonly heldFromSettled: Money;
  /** Penalty slabs owed by the seller for orders it cancelled (taken from its deposit). */
  readonly sellerPenalty: Money;
  /** Held money released back to the seller at close. */
  readonly releaseToSeller: Money;
}

/**
 * Close a wave. Only settled orders earn a share. Seller-cancelled orders still pay their slab
 * into the pot (from the seller deposit) so a seller never gains by failing an order.
 * Invariant (tested): sum(refunds) = pot  and  releaseToSeller + pot = heldFromSettled + sellerPenalty.
 */
export function closeWave(
  currency: Currency,
  slabs: readonly Slab[],
  orders: readonly WaveOrder[],
): WaveCloseResult {
  const hold = holdPerUnit(slabs);
  const settled = orders.filter((o) => o.outcome === 'settled');
  const cancelledBySeller = orders.filter((o) => o.outcome === 'seller_cancelled');
  const settledUnits = settled.reduce((n, o) => n + o.count, 0);
  const cancelledUnits = cancelledBySeller.reduce((n, o) => n + o.count, 0);

  // Positions 1..settledUnits earn slabs; seller-cancelled units are charged the slab they would have added next.
  const earned = potFor(slabs, settledUnits);
  // Penalty only when someone can receive it. With zero settled buyers there is no pot to share, and the
  // buyers of seller-cancelled orders are compensated separately (full refund + return-cost compensation).
  const penalty = settledUnits === 0 ? 0 : potFor(slabs, settledUnits + cancelledUnits) - earned;
  const pot = money(currency, earned + penalty);

  const refunds =
    settled.length === 0 || pot.minor === 0
      ? settled.map((o) => ({ orderId: o.orderId, amount: money(currency, 0) }))
      : allocate(
          pot,
          settled.map((o) => o.count),
        ).map((amount, i) => ({ orderId: settled[i]!.orderId, amount }));

  const heldFromSettled = money(currency, hold * settledUnits);
  const sellerPenalty = money(currency, penalty);
  const releaseToSeller = sub(money(currency, heldFromSettled.minor + sellerPenalty.minor), pot);
  if (releaseToSeller.minor < 0)
    throw new WaveDropError('pot exceeds held money — slabs above hold');
  if (
    sum(
      currency,
      refunds.map((r) => r.amount),
    ).minor !== pot.minor
  )
    throw new MoneyError('refunds do not sum to pot');
  return { currency, settledUnits, pot, refunds, heldFromSettled, sellerPenalty, releaseToSeller };
}
