import { max, money, percentOf, type Currency, type Money, sub } from './money.ts';

export type Region = 'IN' | 'US';
export type Category = 'large_appliance' | 'tv' | 'laptop' | 'meat' | 'other';

/**
 * Every commercial number lives here, not in logic.
 * Values marked GUESS are placeholders until the founder confirms them with evidence
 * (see POOL_BLUEPRINT.md). Tests pin the CURRENT values so any change is deliberate.
 */
export interface Policy {
  readonly region: Region;
  readonly currency: Currency;
  /** Minimum saving vs the buyer's best outside all-in price: max(floor, bps of outside price). */
  readonly minSavingFloorMinor: number;
  readonly minSavingBps: number;
  /** POOL fee (commission) rate card, taken from the seller payout. GUESS until dealer test. */
  readonly feeBpsByCategory: Readonly<Record<Category, number>>;
  /** GST charged on POOL's fee (India 18%). The seller can claim it back. */
  readonly gstOnFeeBps: number;
  /** India: GST TCS on net taxable value (0.5%) and income-tax TDS on gross (0.1%). CA to confirm bases. */
  readonly tcsBps: number;
  readonly tdsBps: number;
  /** GST rate used to derive taxable value from a GST-inclusive price (18% for the core range). */
  readonly goodsGstBps: number;
  /** Share of the price held until installation is confirmed, when installation is included. */
  readonly installHoldBps: number;
  /** Max household units of one product per pool (per-unit goods). */
  readonly maxUnitsPerHousehold: number;
  /** Max grams per household per pool (weighed goods). GUESS. */
  readonly maxGramsPerHousehold: number;
  /** Bids more than this far below the median get flagged for checks. */
  readonly bidAnomalyBps: number;
  /** Minutes sellers need between pool open and close; ops/product limit, not a default length. */
  readonly minPoolMinutes: number;
  /** Longest allowed pool (US card holds last ~29 days; India booking refund promise). */
  readonly maxPoolDays: number;
  /** Accept window after award. No reply by then = walk away + full refund (default B). */
  readonly acceptWindowMinutes: number;
  /** Installation hold release when not deferred / when deferred. */
  readonly installReleaseDays: number;
  readonly deferredInstallMaxDays: number;
  /** Replacement / DOA window after handover before an order counts as settled. */
  readonly settleAfterDays: number;
  /** Late delivery credit paid by the seller, per late order. GUESS. */
  readonly lateCreditMinor: number;
}

export const INDIA_POLICY: Policy = {
  region: 'IN',
  currency: 'INR',
  minSavingFloorMinor: 1_000_00, // ₹1,000
  minSavingBps: 200, // 2%
  feeBpsByCategory: { large_appliance: 500, tv: 300, laptop: 300, meat: 500, other: 500 }, // GUESS
  gstOnFeeBps: 1800,
  tcsBps: 50,
  tdsBps: 10,
  goodsGstBps: 1800,
  installHoldBps: 1000,
  maxUnitsPerHousehold: 2,
  maxGramsPerHousehold: 5_000, // GUESS: 5 kg
  bidAnomalyBps: 1500,
  minPoolMinutes: 60, // GUESS
  maxPoolDays: 30,
  acceptWindowMinutes: 24 * 60, // GUESS
  installReleaseDays: 5,
  deferredInstallMaxDays: 45,
  settleAfterDays: 7, // GUESS: mirrors the 7-day service-centre replacement window
  lateCreditMinor: 200_00, // GUESS: ₹200
};

export const US_POLICY: Policy = {
  region: 'US',
  currency: 'USD',
  minSavingFloorMinor: 20_00, // GUESS: $20
  minSavingBps: 200, // GUESS: 2%
  feeBpsByCategory: { large_appliance: 500, tv: 300, laptop: 300, meat: 500, other: 500 }, // GUESS
  gstOnFeeBps: 0,
  tcsBps: 0,
  tdsBps: 0,
  goodsGstBps: 0,
  installHoldBps: 1000,
  maxUnitsPerHousehold: 2,
  maxGramsPerHousehold: 5_000,
  bidAnomalyBps: 1500,
  minPoolMinutes: 60,
  maxPoolDays: 29, // Visa extended authorisation ≈ 29 d 18 h (Stripe docs)
  acceptWindowMinutes: 24 * 60,
  installReleaseDays: 5,
  deferredInstallMaxDays: 45,
  settleAfterDays: 7,
  lateCreditMinor: 5_00, // GUESS: $5
};

export function policyFor(region: Region): Policy {
  return region === 'IN' ? INDIA_POLICY : US_POLICY;
}

/** Minimum saving a pooled offer must beat the buyer's best outside all-in price by. */
export function minSaving(policy: Policy, outsideBest: Money): Money {
  return max(money(outsideBest.currency, policy.minSavingFloorMinor), percentOf(outsideBest, policy.minSavingBps));
}

/** Rule: only call it a POOL deal when it beats the best outside option by the minimum saving. */
export function isListable(policy: Policy, offerTotal: Money, outsideBest: Money): boolean {
  const saving = sub(outsideBest, offerTotal);
  return saving.minor >= minSaving(policy, outsideBest).minor;
}
