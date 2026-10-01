import { assertSameCurrency, type Money, sub } from './money.ts';
import { compareToOutside, type Policy } from './policy.ts';
import { lineTotal, type Quantity, type UnitOfMeasure } from './uom.ts';

/**
 * Founder decision (30 Sep 2026): there is no fixed POOL fee.
 * The seller quotes ITS price (e.g. ₹40,000 for a TV the market sells at ₹45,000).
 * The POOL team decides the price the buyer sees for that pool (e.g. ₹43,000). POOL keeps the difference.
 *
 * Legal structure (as in blueprint v2.2): the seller invoices the buyer at the buyer price; POOL's
 * difference is recorded as the seller's commission to POOL (with GST in India). Before any foreign
 * investment closes, a lawyer must review this against FDI Press Note 2 ("shall not influence the sale price").
 */
export interface PriceDecision {
  readonly poolId: string;
  readonly bidId: string;
  /** Buyer price per unit of measure, set by the team. */
  readonly buyerPrice: Money;
  readonly decidedBy: string;
  readonly decidedAt: number;
  readonly note?: string;
}

export class PricingError extends Error {
  override name = 'PricingError';
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** Validate a team price decision against the bid's seller price. Returns POOL's margin per unit of measure. */
export function checkPriceDecision(policy: Policy, sellerPrice: Money, d: PriceDecision): Money {
  assertSameCurrency(sellerPrice, d.buyerPrice);
  if (d.buyerPrice.minor <= 0) throw new PricingError('PRICE', 'buyer price must be positive');
  const margin = sub(d.buyerPrice, sellerPrice);
  if (margin.minor < 0 && !policy.allowBelowSellerPrice) {
    throw new PricingError(
      'BELOW_SELLER_PRICE',
      'buyer price is below the seller price (POOL-funded discounts are switched off)',
    );
  }
  return margin;
}

export interface OfferInput {
  readonly memberId: string;
  readonly bidId: string;
  readonly sellerId: string;
  readonly sellerPrice: Money;
  readonly qty: Quantity;
  /** Buyer's best verified outside all-in total for the same quantity, if known. */
  readonly outsideBest?: Money;
  readonly poolId?: string;
}

export interface Offer {
  readonly returnCost?: Money;
  readonly memberId: string;
  readonly bidId: string;
  readonly sellerId: string;
  readonly qty: Quantity;
  readonly sellerPrice: Money;
  readonly buyerPrice: Money;
  readonly sellerTotal: Money;
  /** The guaranteed price the buyer sees; never goes up after it is offered. */
  readonly buyerTotal: Money;
  readonly marginTotal: Money;
  readonly comparison: ReturnType<typeof compareToOutside>;
  readonly decidedBy: string;
}

/**
 * Turn assignments into buyer offers using the team's price decisions.
 * Every assigned bid must have a decision; otherwise offers cannot be published.
 */
export function makeOffers(
  policy: Policy,
  uom: UnitOfMeasure,
  inputs: readonly OfferInput[],
  decisions: ReadonlyMap<string, PriceDecision>,
): Offer[] {
  return inputs.map((i) => {
    const d = decisions.get(i.bidId);
    if (!d)
      throw new PricingError(
        'PRICE_NOT_SET',
        `the team has not set a buyer price for bid ${i.bidId}`,
      );
    if (d.bidId !== i.bidId || (i.poolId !== undefined && d.poolId !== i.poolId))
      throw new PricingError(
        'DECISION_IDENTITY',
        'price decision does not belong to this assignment',
      );
    if (!d.decidedBy.trim() || !Number.isSafeInteger(d.decidedAt))
      throw new PricingError('DECISION_AUDIT', 'price decision needs an actor and UTC timestamp');
    checkPriceDecision(policy, i.sellerPrice, d);
    const sellerTotal = lineTotal(i.sellerPrice, i.qty, uom);
    const buyerTotal = lineTotal(d.buyerPrice, i.qty, uom);
    return {
      memberId: i.memberId,
      bidId: i.bidId,
      sellerId: i.sellerId,
      qty: i.qty,
      sellerPrice: i.sellerPrice,
      buyerPrice: d.buyerPrice,
      sellerTotal,
      buyerTotal,
      marginTotal: sub(buyerTotal, sellerTotal),
      comparison: compareToOutside(policy, buyerTotal, i.outsideBest),
      decidedBy: d.decidedBy,
    };
  });
}
