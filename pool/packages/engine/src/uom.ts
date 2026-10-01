import { mulDivRoundHalfUp, money, type Money, MoneyError } from './money.ts';

/**
 * Units of measure are DATA, not code. Any product can be pooled: pieces, kg, litres, metres, packs, hours…
 *
 * A price is quoted per 1 `code` (e.g. ₹ per kg). Quantities are stored as integer BASE units so
 * nothing is ever fractional: 1 kg = 1000 base units (grams), 1 litre = 1000 (ml), 1 piece = 1.
 */
export interface UnitOfMeasure {
  /** What prices are quoted per, e.g. "piece", "kg", "litre", "metre", "pack". */
  readonly code: string;
  /** How many base units make one `code`. */
  readonly baseScale: number;
  /** Name of the base unit, e.g. "g", "ml", "piece". */
  readonly baseLabel: string;
}

export function defineUom(code: string, baseScale: number, baseLabel: string): UnitOfMeasure {
  if (!code.trim()) throw new MoneyError('uom code is required');
  if (!Number.isSafeInteger(baseScale) || baseScale < 1)
    throw new MoneyError('baseScale must be a positive integer');
  return { code: code.trim().toLowerCase(), baseScale, baseLabel };
}

export interface Quantity {
  readonly uom: string;
  /** Integer number of base units (> 0). */
  readonly base: number;
}

export function qty(uom: UnitOfMeasure, base: number): Quantity {
  if (!Number.isSafeInteger(base) || base <= 0)
    throw new MoneyError(
      `quantity must be a positive integer number of ${uom.baseLabel}, got ${base}`,
    );
  return { uom: uom.code, base };
}

/** Price for a quantity: price-per-uom × base / baseScale, rounded half-up once. */
export function lineTotal(pricePerUom: Money, q: Quantity, uom: UnitOfMeasure): Money {
  if (q.uom !== uom.code) throw new MoneyError(`quantity is in ${q.uom}, price is per ${uom.code}`);
  if (!Number.isSafeInteger(q.base) || q.base <= 0)
    throw new MoneyError('quantity must be a positive integer');
  return money(pricePerUom.currency, mulDivRoundHalfUp(pricePerUom.minor, q.base, uom.baseScale));
}

/**
 * Quantity rules are set per pool by whoever creates it (the team or the buyer, within limits).
 * Nothing is assumed about the product: e.g. mutton might be min 500 g, step 250 g, max 2 kg per buyer;
 * a TV min 1, step 1, max 2 per household. Maximums are optional.
 */
export interface QuantityRule {
  readonly uom: UnitOfMeasure;
  readonly minBase: number;
  readonly stepBase: number;
  readonly maxPerBuyerBase?: number;
  readonly maxPerHouseholdBase?: number;
}

export class QuantityError extends Error {
  override name = 'QuantityError';
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function validateQuantityRule(r: QuantityRule): void {
  for (const [k, v] of [
    ['minBase', r.minBase],
    ['stepBase', r.stepBase],
  ] as const) {
    if (!Number.isSafeInteger(v) || v < 1)
      throw new QuantityError('RULE', `${k} must be a positive integer`);
  }
  if (r.maxPerBuyerBase !== undefined && r.maxPerBuyerBase < r.minBase)
    throw new QuantityError('RULE', 'maxPerBuyer below min');
  if (r.maxPerHouseholdBase !== undefined && r.maxPerHouseholdBase < r.minBase)
    throw new QuantityError('RULE', 'maxPerHousehold below min');
}

export function checkQuantity(r: QuantityRule, q: Quantity): void {
  if (!Number.isSafeInteger(q.base) || q.base <= 0)
    throw new QuantityError('QUANTITY', 'quantity must be a positive integer');
  if (q.uom !== r.uom.code) throw new QuantityError('UOM', `this pool is priced per ${r.uom.code}`);
  if (q.base < r.minBase)
    throw new QuantityError('MIN', `minimum is ${r.minBase} ${r.uom.baseLabel}`);
  if ((q.base - r.minBase) % r.stepBase !== 0)
    throw new QuantityError(
      'STEP',
      `quantity must go up in steps of ${r.stepBase} ${r.uom.baseLabel}`,
    );
  if (r.maxPerBuyerBase !== undefined && q.base > r.maxPerBuyerBase)
    throw new QuantityError(
      'MAX_BUYER',
      `maximum per buyer is ${r.maxPerBuyerBase} ${r.uom.baseLabel}`,
    );
}

/** How a quantity counts toward the Wave Drop — chosen per pool. */
export type WaveCountMode = 'per_order' | 'per_uom';

export function waveCount(q: Quantity, uom: UnitOfMeasure, mode: WaveCountMode): number {
  return mode === 'per_order' ? 1 : Math.max(1, Math.floor(q.base / uom.baseScale));
}
