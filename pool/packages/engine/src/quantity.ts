import { divRoundHalfUp, money, type Money, MoneyError } from './money.ts';

/**
 * What a price is quoted per. Appliances/laptops: per `unit`.
 * Meat and other weighed goods: per `kg`, but quantities are stored in grams
 * so they stay integers (e.g. 1.5 kg = 1500 g).
 */
export type PriceBasis = 'unit' | 'kg';

export interface Quantity {
  readonly basis: PriceBasis;
  /** units when basis = 'unit'; grams when basis = 'kg'. Always a positive integer. */
  readonly amount: number;
}

export function units(n: number): Quantity {
  if (!Number.isSafeInteger(n) || n <= 0) throw new MoneyError(`unit quantity must be a positive integer, got ${n}`);
  return { basis: 'unit', amount: n };
}

export function grams(g: number): Quantity {
  if (!Number.isSafeInteger(g) || g <= 0) throw new MoneyError(`gram quantity must be a positive integer, got ${g}`);
  return { basis: 'kg', amount: g };
}

/** Total price for a quantity: per-unit × units, or per-kg × grams / 1000 (half-up). */
export function lineTotal(pricePerBasis: Money, qty: Quantity): Money {
  if (qty.basis === 'unit') {
    const t = pricePerBasis.minor * qty.amount;
    return money(pricePerBasis.currency, t);
  }
  return money(pricePerBasis.currency, divRoundHalfUp(pricePerBasis.minor * qty.amount, 1000));
}

/**
 * How much of a Wave Drop "count" a quantity represents.
 * Per-unit goods: each unit counts once. Weighed goods: each order counts once.
 */
export function waveCount(qty: Quantity): number {
  return qty.basis === 'unit' ? qty.amount : 1;
}
