import { type Money, assertSameCurrency } from './money.ts';
import { isListable, type Policy } from './policy.ts';
import { lineTotal, type PriceBasis, type Quantity } from './quantity.ts';
import { holdPerUnit, type Slab, validateSlabs } from './wave-drop.ts';

export class BidError extends Error {
  override name = 'BidError';
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

export interface Bid {
  readonly id: string;
  readonly poolId: string;
  readonly sellerId: string;
  readonly revision: number;
  /** Guaranteed all-in price per unit (or per kg): delivery, installation if included, taxes, fees inside. */
  readonly price: Money;
  readonly basis: PriceBasis;
  /** Max quantity this seller can fulfil in this pool (units or grams). */
  readonly capacity: number;
  /** Latest delivery/pickup date the seller commits to (epoch ms). */
  readonly deliverBy: number;
  readonly warrantyMonths: number;
  readonly installationIncluded: boolean;
  /** Option values this bid covers, e.g. ["cut:curry", "cut:boneless"]. Empty = pool has no options. */
  readonly optionsCovered: readonly string[];
  readonly slabs: readonly Slab[];
  /** Bid must stay valid until at least pool close + accept window. */
  readonly validUntil: number;
  readonly submittedAt: number;
}

export interface BidContext {
  readonly policy: Policy;
  readonly poolClosesAt: number;
  readonly now: number;
  readonly basis: PriceBasis;
  /** Cap on a slab as bps of the unit price (sellers must keep slabs below their margin). GUESS 1000 = 10%. */
  readonly maxSlabBpsOfPrice: number;
}

/**
 * Validate a new bid or a revision. Default C: a seller may only LOWER its price before close.
 */
export function acceptBid(ctx: BidContext, previous: Bid | undefined, next: Bid): Bid {
  if (ctx.now >= ctx.poolClosesAt) throw new BidError('POOL_CLOSED', 'bids are not accepted after the pool closes');
  if (next.price.currency !== ctx.policy.currency) throw new BidError('CURRENCY', 'bid currency does not match the pool region');
  if (next.basis !== ctx.basis) throw new BidError('BASIS', 'bid basis does not match the pool');
  if (next.price.minor <= 0) throw new BidError('PRICE', 'price must be positive');
  if (!Number.isSafeInteger(next.capacity) || next.capacity <= 0) throw new BidError('CAPACITY', 'capacity must be a positive integer');
  const mustStayValidUntil = ctx.poolClosesAt + ctx.policy.acceptWindowMinutes * 60_000;
  if (next.validUntil < mustStayValidUntil) throw new BidError('VALIDITY', 'bid must stay valid through the accept window');
  const slabCap = Math.floor((next.price.minor * ctx.maxSlabBpsOfPrice) / 10_000);
  try {
    validateSlabs(next.slabs, slabCap);
  } catch (e) {
    throw new BidError('SLABS', (e as Error).message);
  }
  if (holdPerUnit(next.slabs) >= next.price.minor) throw new BidError('SLABS', 'slab hold cannot exceed the price');
  if (previous) {
    if (previous.sellerId !== next.sellerId || previous.poolId !== next.poolId) throw new BidError('OWNER', 'revision must be by the same seller for the same pool');
    if (next.revision !== previous.revision + 1) throw new BidError('REVISION', 'revision number must increase by one');
    assertSameCurrency(previous.price, next.price);
    if (next.price.minor > previous.price.minor) throw new BidError('RAISE_NOT_ALLOWED', 'a bid can only be lowered before close');
  } else if (next.revision !== 1) {
    throw new BidError('REVISION', 'first bid must be revision 1');
  }
  return next;
}

/** Latest revision per seller. */
export function latestBids(bids: readonly Bid[]): Bid[] {
  const bySeller = new Map<string, Bid>();
  for (const b of bids) {
    const cur = bySeller.get(b.sellerId);
    if (!cur || b.revision > cur.revision) bySeller.set(b.sellerId, b);
  }
  return [...bySeller.values()];
}

/** Flag bids more than `bidAnomalyBps` below the median (needs ≥ 3 bids). Flagged bids need an ops check before award. */
export function anomalousBids(policy: Policy, bids: readonly Bid[]): Set<string> {
  const flagged = new Set<string>();
  if (bids.length < 3) return flagged;
  const prices = bids.map((b) => b.price.minor).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 === 1 ? prices[mid]! : (prices[mid - 1]! + prices[mid]!) / 2;
  const threshold = median * (1 - policy.bidAnomalyBps / 10_000);
  for (const b of bids) if (b.price.minor < threshold) flagged.add(b.id);
  return flagged;
}

export interface ServiceMinimums {
  /** Delivery must be on or before this (epoch ms). */
  readonly deliverBy: number;
  readonly minWarrantyMonths: number;
  readonly installationRequired: boolean;
}

export interface SellerFacts {
  readonly verified: boolean;
  /** Rating from settled orders only (0–5, higher is better); undefined = no history. */
  readonly settledRating?: number;
}

/**
 * The published winner rule: among eligible bids (verified seller, meets service minimums,
 * not flagged or cleared by ops), rank by lowest price, then earliest delivery, then better
 * settled rating, then earliest submission, then id. POOL's fee is never a factor.
 */
export function rankBids(
  bids: readonly Bid[],
  minimums: ServiceMinimums,
  sellers: ReadonlyMap<string, SellerFacts>,
  blocked: ReadonlySet<string> = new Set(),
): Bid[] {
  return latestBids(bids)
    .filter((b) => {
      const s = sellers.get(b.sellerId);
      return (
        s?.verified === true &&
        !blocked.has(b.id) &&
        b.deliverBy <= minimums.deliverBy &&
        b.warrantyMonths >= minimums.minWarrantyMonths &&
        (!minimums.installationRequired || b.installationIncluded)
      );
    })
    .sort(
      (a, b) =>
        a.price.minor - b.price.minor ||
        a.deliverBy - b.deliverBy ||
        (sellers.get(b.sellerId)?.settledRating ?? -1) - (sellers.get(a.sellerId)?.settledRating ?? -1) ||
        a.submittedAt - b.submittedAt ||
        a.id.localeCompare(b.id),
    );
}

export interface CommittedMember {
  readonly memberId: string;
  readonly joinedAt: number;
  readonly qty: Quantity;
  /** Option values the member needs, e.g. ["cut:curry"]. */
  readonly options: readonly string[];
  /** Member's best verified outside all-in total for the same quantity (for the listing rule). */
  readonly outsideBest: Money;
}

export interface Assignment {
  readonly memberId: string;
  readonly bidId: string;
  readonly sellerId: string;
  /** Guaranteed price per unit/kg for this buyer; never goes up. */
  readonly price: Money;
  readonly total: Money;
  /** Next-best eligible bid that could serve this member if the assigned seller defaults. */
  readonly backupBidId: string | undefined;
}

export interface AwardResult {
  readonly assignments: readonly Assignment[];
  /** Members no eligible bid could serve at a listable price, or beyond total capacity → refunded. */
  readonly unserved: ReadonlyArray<{ memberId: string; reason: 'NO_CAPACITY' | 'NOT_LISTABLE' | 'OPTIONS_NOT_COVERED' }>;
}

/**
 * Award (default A): walk members in join order; give each the best-ranked bid that still has capacity,
 * covers their options, and is listable against their outside price. Earliest joiners get the best price.
 */
export function award(policy: Policy, ranked: readonly Bid[], members: readonly CommittedMember[]): AwardResult {
  const remaining = new Map(ranked.map((b) => [b.id, b.capacity]));
  const assignments: Assignment[] = [];
  const unserved: AwardResult['unserved'][number][] = [];
  const ordered = [...members].sort((a, b) => a.joinedAt - b.joinedAt || a.memberId.localeCompare(b.memberId));
  for (const m of ordered) {
    const covering = ranked.filter((b) => m.options.every((o) => b.optionsCovered.includes(o)));
    if (covering.length === 0) {
      unserved.push({ memberId: m.memberId, reason: 'OPTIONS_NOT_COVERED' });
      continue;
    }
    const withCapacity = covering.filter((b) => (remaining.get(b.id) ?? 0) >= m.qty.amount);
    if (withCapacity.length === 0) {
      unserved.push({ memberId: m.memberId, reason: 'NO_CAPACITY' });
      continue;
    }
    const chosen = withCapacity[0]!;
    const total = lineTotal(chosen.price, m.qty);
    if (!isListable(policy, total, m.outsideBest)) {
      unserved.push({ memberId: m.memberId, reason: 'NOT_LISTABLE' });
      continue;
    }
    remaining.set(chosen.id, (remaining.get(chosen.id) ?? 0) - m.qty.amount);
    const backup = covering.find((b) => b.id !== chosen.id);
    assignments.push({ memberId: m.memberId, bidId: chosen.id, sellerId: chosen.sellerId, price: chosen.price, total, backupBidId: backup?.id });
  }
  return { assignments, unserved };
}
