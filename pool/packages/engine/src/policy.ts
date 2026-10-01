import { max, money, percentOf, type Currency, type Money, sub } from './money.ts';

export type Region = 'IN' | 'US';

/**
 * Region-level rules only. Nothing here is product-specific: products, units, fulfilment steps,
 * holds, return windows and tax rates are set per pool (see Pool, FulfilmentProfile).
 * Values marked GUESS are placeholders until the founder confirms them.
 */
export interface Policy {
  readonly region: Region;
  readonly currency: Currency;
  /** Sellers need at least this long to bid; a platform limit, not a default pool length. GUESS. */
  readonly minPoolMinutes: number;
  /** Longest a pool can stay open (US card holds ≈ 29 days; India booking-refund promise). */
  readonly maxPoolDays: number;
  /** Accept window after prices are published. No reply = walk away + full refund (default B). GUESS 24 h. */
  readonly acceptWindowMinutes: number;
  /** Bids this far below the median are flagged for a check before award. */
  readonly bidAnomalyBps: number;
  /** India: GST on POOL's commission (18%), contained in POOL's margin. */
  readonly gstOnCommissionBps: number;
  /** India: GST TCS on net taxable value (0.5%) and income-tax TDS on gross (0.1%). CA to confirm bases. */
  readonly tcsBps: number;
  readonly tdsBps: number;
  /**
   * The POOL TEAM sets each pool's buyer price (founder decision, 30 Sep 2026). These are only the
   * "recommended saving" figures shown to the team next to the outside price — never a block.
   */
  readonly recommendedMinSavingFloorMinor: number;
  readonly recommendedMinSavingBps: number;
  /** May the team price below the seller's price (POOL-funded discount)? Off unless the founder says so. */
  readonly allowBelowSellerPrice: boolean;
}

export const INDIA_POLICY: Policy = {
  region: 'IN',
  currency: 'INR',
  minPoolMinutes: 60, // GUESS
  maxPoolDays: 30,
  acceptWindowMinutes: 24 * 60, // GUESS
  bidAnomalyBps: 1500,
  gstOnCommissionBps: 1800,
  tcsBps: 50,
  tdsBps: 10,
  recommendedMinSavingFloorMinor: 1_000_00, // ₹1,000 — shown to the team, not enforced
  recommendedMinSavingBps: 200,
  allowBelowSellerPrice: false,
};

export const US_POLICY: Policy = {
  region: 'US',
  currency: 'USD',
  minPoolMinutes: 60, // GUESS
  maxPoolDays: 29, // Visa extended authorisation ≈ 29 d 18 h (Stripe docs)
  acceptWindowMinutes: 24 * 60, // GUESS
  bidAnomalyBps: 1500,
  gstOnCommissionBps: 0,
  tcsBps: 0,
  tdsBps: 0,
  recommendedMinSavingFloorMinor: 20_00, // GUESS, shown to the team, not enforced
  recommendedMinSavingBps: 200,
  allowBelowSellerPrice: false,
};

export function policyFor(region: Region): Policy {
  return region === 'IN' ? INDIA_POLICY : US_POLICY;
}

export function recommendedMinSaving(policy: Policy, outsideBest: Money): Money {
  return max(
    money(outsideBest.currency, policy.recommendedMinSavingFloorMinor),
    percentOf(outsideBest, policy.recommendedMinSavingBps),
  );
}

/** Information for the team and the buyer's honest comparison card. Never blocks a price. */
export function compareToOutside(
  policy: Policy,
  buyerTotal: Money,
  outsideBest: Money | undefined,
) {
  if (!outsideBest) return { known: false as const };
  const saving = sub(outsideBest, buyerTotal);
  return {
    known: true as const,
    outsideBest,
    saving,
    cheaperThanOutside: saving.minor > 0,
    meetsRecommendedSaving: saving.minor >= recommendedMinSaving(policy, outsideBest).minor,
  };
}
