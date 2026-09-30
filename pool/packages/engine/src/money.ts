/**
 * Money in integer minor units (paise for INR, cents for USD).
 * Never use floating point for money. Every function either returns an exact
 * integer result or rounds half-up in exactly one place and says so.
 */
export type Currency = 'INR' | 'USD';

export interface Money {
  readonly currency: Currency;
  /** Integer minor units. May be negative only for explicit deltas. */
  readonly minor: number;
}

export class MoneyError extends Error {
  override name = 'MoneyError';
}

function assertSafe(n: number, what: string): void {
  if (!Number.isSafeInteger(n)) throw new MoneyError(`${what} must be a safe integer, got ${n}`);
}

export function money(currency: Currency, minor: number): Money {
  assertSafe(minor, 'money.minor');
  return { currency, minor };
}

export const zero = (currency: Currency): Money => money(currency, 0);

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) throw new MoneyError(`currency mismatch: ${a.currency} vs ${b.currency}`);
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.currency, a.minor + b.minor);
}

export function sub(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.currency, a.minor - b.minor);
}

export function sum(currency: Currency, items: readonly Money[]): Money {
  return items.reduce((acc, m) => add(acc, m), zero(currency));
}

export function min(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return a.minor <= b.minor ? a : b;
}

export function max(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return a.minor >= b.minor ? a : b;
}

/** Integer division rounding half away from zero. */
export function divRoundHalfUp(numerator: number, denominator: number): number {
  assertSafe(numerator, 'numerator');
  assertSafe(denominator, 'denominator');
  if (denominator <= 0) throw new MoneyError('denominator must be positive');
  const sign = numerator < 0 ? -1 : 1;
  const abs = Math.abs(numerator);
  const q = Math.floor(abs / denominator);
  const r = abs - q * denominator;
  return sign * (2 * r >= denominator ? q + 1 : q);
}

/** m × bps / 10 000, rounded half-up. 1 bps = 0.01 %. */
export function percentOf(m: Money, bps: number): Money {
  assertSafe(bps, 'bps');
  const product = m.minor * bps;
  assertSafe(product, 'minor × bps');
  return money(m.currency, divRoundHalfUp(product, 10_000));
}

/**
 * Split `total` into parts proportional to integer `weights` so that the parts
 * sum EXACTLY to `total` (largest-remainder method; ties go to the lower index,
 * so the result is deterministic).
 */
export function allocate(total: Money, weights: readonly number[]): Money[] {
  if (weights.length === 0) throw new MoneyError('allocate needs at least one weight');
  if (total.minor < 0) throw new MoneyError('allocate expects a non-negative total');
  let weightSum = 0;
  for (const w of weights) {
    assertSafe(w, 'weight');
    if (w < 0) throw new MoneyError('weights must be non-negative');
    weightSum += w;
  }
  if (weightSum === 0) throw new MoneyError('weights must not all be zero');
  const base: number[] = [];
  const remainders: { i: number; r: number }[] = [];
  let allocated = 0;
  weights.forEach((w, i) => {
    const product = total.minor * w;
    assertSafe(product, 'total × weight');
    const q = Math.floor(product / weightSum);
    base.push(q);
    allocated += q;
    remainders.push({ i, r: product - q * weightSum });
  });
  let left = total.minor - allocated;
  remainders.sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of remainders) {
    if (left === 0) break;
    base[i] = (base[i] ?? 0) + 1;
    left--;
  }
  return base.map((v) => money(total.currency, v));
}
