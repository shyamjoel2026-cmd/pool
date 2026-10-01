import { divRoundHalfUp, percentOf, type Paise } from './money';

/**
 * India GST inside a GST-inclusive price.
 * Same state (seller GSTIN state = place of supply) → CGST + SGST, each half.
 * Different state → IGST. Place of supply for goods = where the movement ends (IGST Act s.10).
 */
export interface GstSplit {
  total: Paise;
  taxable: Paise;
  tax: Paise;
  rateBps: number;
  interState: boolean;
  cgst: Paise;
  sgst: Paise;
  igst: Paise;
}

export function gstSplit(total: Paise, rateBps: number, interState: boolean): GstSplit {
  const taxable = divRoundHalfUp(total * 10_000, 10_000 + rateBps);
  const tax = total - taxable;
  if (interState) return { total, taxable, tax, rateBps, interState, cgst: 0, sgst: 0, igst: tax };
  const cgst = Math.ceil(tax / 2);
  return { total, taxable, tax, rateBps, interState, cgst, sgst: tax - cgst, igst: 0 };
}

/** India platform deductions from the seller's share (engine policy.ts, INDIA_POLICY). */
export const INDIA = {
  tcsBps: 50, // GST TCS 0.5% of net taxable value (CGST s.52)
  tdsBps: 10, // Income-tax TDS 0.1% (s.393(1), was 194-O)
  gstOnCommissionBps: 1800,
  recommendedMinSavingFloor: 1_000_00,
  recommendedMinSavingBps: 200,
  acceptWindowHours: 24,
  minPoolMinutes: 60,
  maxPoolDays: 30,
  bidAnomalyBps: 1500,
  maxSlabBpsOfPrice: 1000,
  pricingWindowHours: 4,
};

/** GST contained inside POOL's margin (the margin is the seller's commission to POOL, GST-inclusive). */
export const gstInMargin = (margin: Paise): Paise =>
  margin > 0 ? divRoundHalfUp(margin * INDIA.gstOnCommissionBps, 10_000 + INDIA.gstOnCommissionBps) : 0;

/** Recommended (never enforced) minimum saving shown to the team: ₹1,000 or 2% of outside best, whichever is higher. */
export const recommendedMinSaving = (outsideBest: Paise): Paise =>
  Math.max(INDIA.recommendedMinSavingFloor, percentOf(outsideBest, INDIA.recommendedMinSavingBps));
