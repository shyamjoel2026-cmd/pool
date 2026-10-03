/** Money is always integer paise. No floats in money paths (engine rule). */
export type Paise = number;

export const rs = (rupees: number): Paise => Math.round(rupees * 100);

/** Round-half-up integer division for non-negative numerators (mirrors engine money.ts). */
export function divRoundHalfUp(n: number, d: number): number {
  if (d <= 0) throw new Error('divisor must be positive');
  const sign = n < 0 ? -1 : 1;
  const a = Math.abs(n);
  const q = Math.floor(a / d);
  const r = a - q * d;
  return sign * (r * 2 >= d ? q + 1 : q);
}

/** bps share of an amount, rounded half-up. 1% = 100 bps. */
export const percentOf = (minor: Paise, bps: number): Paise => divRoundHalfUp(minor * bps, 10_000);

/** Split `total` across weights by largest remainder; parts always sum exactly to total. */
export function allocate(total: Paise, weights: number[]): Paise[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0) return [];
  if (sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const floors = raw.map((x) => Math.floor(x));
  let rest = total - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rest > 0; k++, rest--) floors[order[k % order.length].i] += 1;
  return floors;
}

const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, minimumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 2 });

/** ₹45,99,900 style. Shows paise only when there are any (or when `exact`). */
export function inr(p: Paise, opts: { exact?: boolean; sign?: boolean } = {}): string {
  const abs = Math.abs(p);
  const s = opts.exact || abs % 100 !== 0 ? inr2.format(abs / 100) : inr0.format(abs / 100);
  const signed = p < 0 ? `−${s}` : opts.sign && p > 0 ? `+${s}` : s;
  return signed;
}

/** Compact: ₹1.24 Cr, ₹45.9 L, ₹12.4K for dashboards. */
export function inrCompact(p: Paise): string {
  const r = p / 100;
  const a = Math.abs(r);
  if (a >= 1e7) return `₹${(r / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `₹${(r / 1e5).toFixed(1)} L`;
  if (a >= 1e3) return `₹${(r / 1e3).toFixed(1)}K`;
  return inr0.format(r);
}

export const fmtInt = (n: number) => new Intl.NumberFormat('en-IN').format(n);
export const fmtPct = (bps: number, digits = 1) => `${(bps / 100).toFixed(digits).replace(/\.0+$/, '')}%`;
