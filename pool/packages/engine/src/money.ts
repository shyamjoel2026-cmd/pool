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
  if (currency !== 'INR' && currency !== 'USD') throw new MoneyError('unsupported currency');
  assertSafe(minor, 'money.minor');
  return { currency, minor };
}

export const zero = (currency: Currency): Money => money(currency, 0);

export function assertSameCurrency(a: Money, b: Money): void {
  money(a.currency, a.minor);
  money(b.currency, b.minor);
  if (a.currency !== b.currency)
    throw new MoneyError(`currency mismatch: ${a.currency} vs ${b.currency}`);
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
  return divideBigInt(BigInt(numerator), BigInt(denominator));
}

function divideBigInt(numerator: bigint, denominator: bigint): number {
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator * sign;
  const result = Number(
    sign * (absolute / denominator + (2n * (absolute % denominator) >= denominator ? 1n : 0n)),
  );
  assertSafe(result, 'rounded result');
  return result;
}

/** Exact integer intermediates even when a valid result's multiplication exceeds Number.MAX_SAFE_INTEGER. */
export function mulDivRoundHalfUp(value: number, multiplier: number, denominator: number): number {
  assertSafe(value, 'value');
  assertSafe(multiplier, 'multiplier');
  assertSafe(denominator, 'denominator');
  if (denominator <= 0) throw new MoneyError('denominator must be positive');
  return divideBigInt(BigInt(value) * BigInt(multiplier), BigInt(denominator));
}

/** m × bps / 10 000, rounded half-up. 1 bps = 0.01 %. */
export function percentOf(m: Money, bps: number): Money {
  assertSafe(bps, 'bps');
  return money(m.currency, mulDivRoundHalfUp(m.minor, bps, 10_000));
}

/**
 * Split `total` into parts proportional to integer `weights` so that the parts
 * sum EXACTLY to `total` (largest-remainder method; ties go to the lower index,
 * so the result is deterministic).
 */
export function allocate(total: Money, weights: readonly number[]): Money[] {
  if (weights.length === 0) throw new MoneyError('allocate needs at least one weight');
  if (total.minor < 0) throw new MoneyError('allocate expects a non-negative total');
  let weightSum = 0n;
  for (const w of weights) {
    assertSafe(w, 'weight');
    if (w < 0) throw new MoneyError('weights must be non-negative');
    weightSum += BigInt(w);
  }
  if (weightSum === 0n) throw new MoneyError('weights must not all be zero');
  const base: number[] = [];
  const remainders: { i: number; r: bigint }[] = [];
  let allocated = 0;
  weights.forEach((w, i) => {
    const product = BigInt(total.minor) * BigInt(w);
    const q = Number(product / weightSum);
    base.push(q);
    allocated += q;
    remainders.push({ i, r: product % weightSum });
  });
  let left = total.minor - allocated;
  remainders.sort((a, b) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1));
  for (const { i } of remainders) {
    if (left === 0) break;
    base[i] = (base[i] ?? 0) + 1;
    left--;
  }
  return base.map((v) => money(total.currency, v));
}
