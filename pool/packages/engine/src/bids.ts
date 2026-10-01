import { assertSameCurrency, type Money } from './money.ts';
import type { Policy } from './policy.ts';
import { meetsTerms, type TermRequirement, type Terms } from './terms.ts';
import type { Quantity, UnitOfMeasure } from './uom.ts';
import { holdPerUnit, type Slab, validateSlabs } from './wave-drop.ts';

export class BidError extends Error {
  override name = 'BidError';
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** A seller's sealed bid for a pool. Product-agnostic: everything specific lives in `terms` and `optionsCovered`. */
export interface Bid {
  readonly id: string;
  readonly poolId: string;
  readonly sellerId: string;
  readonly revision: number;
  /** The SELLER's price per unit of measure (what the seller receives before taxes/holds). */
  readonly sellerPrice: Money;
  readonly uom: string;
  /** Max quantity this seller can fulfil, in base units. */
  readonly capacityBase: number;
  /** Latest time the seller commits to hand over (epoch ms). */
  readonly deliverBy: number;
  /** Delivery modes the seller offers for this pool, e.g. ["home_delivery"], ["store_pickup"]. */
  readonly modes: readonly string[];
  /** Commitments as data, e.g. { warranty_months: 12 } or { same_day_cut: true }. */
  readonly terms: Terms;
  /** Variant/option values covered, e.g. ["cut:curry", "cut:boneless"] or ["ram:16gb"]. */
  readonly optionsCovered: readonly string[];
  readonly slabs: readonly Slab[];
  /** Disclosed cancellation/return compensation, in paise; supplied as bid data. */
  readonly returnCostMinor?: number;
  readonly validUntil: number;
  readonly submittedAt: number;
}

export interface BidContext {
  readonly policy: Policy;
  readonly poolClosesAt: number;
  readonly now: number;
  readonly uom: UnitOfMeasure;
  /** Cap on each Wave Drop slab as bps of the seller price (slabs must stay below the seller's margin). */
  readonly maxSlabBpsOfPrice: number;
  readonly acceptWindowMinutes?: number;
  readonly pricingDeadline?: number;
}

/** Validate a new bid or revision. Default C: a seller may only LOWER its price before close. */
export function acceptBid(ctx: BidContext, previous: Bid | undefined, next: Bid): Bid {
  if (ctx.now >= ctx.poolClosesAt)
    throw new BidError('POOL_CLOSED', 'bids are not accepted after the pool closes');
  if (next.sellerPrice.currency !== ctx.policy.currency)
    throw new BidError('CURRENCY', 'bid currency does not match the pool region');
  if (next.uom !== ctx.uom.code)
    throw new BidError('UOM', `this pool is priced per ${ctx.uom.code}`);
  if (!Number.isSafeInteger(next.sellerPrice.minor) || next.sellerPrice.minor <= 0)
    throw new BidError('PRICE', 'price must be a positive integer');
  for (const time of [
    ctx.now,
    ctx.poolClosesAt,
    next.deliverBy,
    next.validUntil,
    next.submittedAt,
  ]) {
    if (!Number.isSafeInteger(time))
      throw new BidError('TIME', 'times must be integer UTC epoch milliseconds');
  }
  if (!Number.isSafeInteger(next.capacityBase) || next.capacityBase <= 0)
    throw new BidError('CAPACITY', 'capacity must be a positive integer');
  if (next.modes.length === 0)
    throw new BidError('MODES', 'a bid must offer at least one delivery mode');
  const mustStayValidUntil =
    (ctx.pricingDeadline ?? ctx.poolClosesAt) +
    (ctx.acceptWindowMinutes ?? ctx.policy.acceptWindowMinutes) * 60_000;
  if (next.validUntil < mustStayValidUntil)
    throw new BidError('VALIDITY', 'bid must stay valid through the accept window');
  if (
    !Number.isSafeInteger(ctx.maxSlabBpsOfPrice) ||
    ctx.maxSlabBpsOfPrice < 0 ||
    ctx.maxSlabBpsOfPrice > 10_000
  )
    throw new BidError('SLABS', 'invalid slab cap');
  const slabCap = Number(
    (BigInt(next.sellerPrice.minor) * BigInt(ctx.maxSlabBpsOfPrice)) / 10_000n,
  );
  try {
    validateSlabs(next.slabs, slabCap);
  } catch (e) {
    throw new BidError('SLABS', (e as Error).message);
  }
  if (holdPerUnit(next.slabs) >= next.sellerPrice.minor)
    throw new BidError('SLABS', 'slab hold cannot reach the price');
  if (previous) {
    if (previous.sellerId !== next.sellerId || previous.poolId !== next.poolId)
      throw new BidError('OWNER', 'revision must be by the same seller for the same pool');
    if (next.revision !== previous.revision + 1)
      throw new BidError('REVISION', 'revision number must increase by one');
    assertSameCurrency(previous.sellerPrice, next.sellerPrice);
    if (next.sellerPrice.minor > previous.sellerPrice.minor)
      throw new BidError('RAISE_NOT_ALLOWED', 'a bid can only be lowered before close');
  } else if (next.revision !== 1) {
    throw new BidError('REVISION', 'first bid must be revision 1');
  }
  return next;
}

export function latestBids(bids: readonly Bid[]): Bid[] {
  const bySeller = new Map<string, Bid>();
  for (const b of bids) {
    const key = JSON.stringify([b.poolId, b.sellerId]);
    const cur = bySeller.get(key);
    if (!cur || b.revision > cur.revision) bySeller.set(key, b);
  }
  return [...bySeller.values()];
}

/** Flag bids more than `bidAnomalyBps` below the median seller price (needs ≥ 3 bids). */
export function anomalousBids(policy: Policy, bids: readonly Bid[]): Set<string> {
  const flagged = new Set<string>();
  if (bids.length < 3) return flagged;
  const prices = bids.map((b) => b.sellerPrice.minor).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const medianTwice =
    prices.length % 2 === 1
      ? 2n * BigInt(prices[mid]!)
      : BigInt(prices[mid - 1]!) + BigInt(prices[mid]!);
  for (const b of bids)
    if (BigInt(b.sellerPrice.minor) * 20_000n < medianTwice * BigInt(10_000 - policy.bidAnomalyBps))
      flagged.add(b.id);
  return flagged;
}

/** What the pool requires of every bid — all data. */
export interface PoolRequirements {
  readonly deliverBy: number;
  /** At least one of these delivery modes must be offered. Empty = any. */
  readonly acceptableModes: readonly string[];
  readonly terms: readonly TermRequirement[];
}

export interface SellerFacts {
  readonly verified: boolean;
  /** Rating from settled orders only (0–5); undefined = no history. */
  readonly settledRating?: number;
}

/**
 * Published ranking rule: among eligible bids (verified seller, meets requirements, not blocked),
 * lowest seller price → earliest delivery → better settled rating → earliest submission → id.
 */
export function rankBids(
  bids: readonly Bid[],
  req: PoolRequirements,
  sellers: ReadonlyMap<string, SellerFacts>,
  blocked: ReadonlySet<string> = new Set(),
): Bid[] {
  return latestBids(bids)
    .filter(
      (b) =>
        sellers.get(b.sellerId)?.verified === true &&
        !blocked.has(b.id) &&
        b.deliverBy <= req.deliverBy &&
        (req.acceptableModes.length === 0 ||
          b.modes.some((m) => req.acceptableModes.includes(m))) &&
        meetsTerms(b.terms, req.terms).ok,
    )
    .sort(
      (a, b) =>
        a.sellerPrice.minor - b.sellerPrice.minor ||
        a.deliverBy - b.deliverBy ||
        (sellers.get(b.sellerId)?.settledRating ?? -1) -
          (sellers.get(a.sellerId)?.settledRating ?? -1) ||
        a.submittedAt - b.submittedAt ||
        a.id.localeCompare(b.id),
    );
}

export interface AwardMember {
  readonly memberId: string;
  readonly joinedAt: number;
  readonly qty: Quantity;
  readonly options: readonly string[];
  readonly needBy: number;
}

export interface Assignment {
  readonly memberId: string;
  readonly bidId: string;
  readonly sellerId: string;
  readonly sellerPrice: Money;
  readonly qty: Quantity;
  /** Next-best eligible bid covering this member, used if the assigned seller defaults. */
  readonly backupBidId: string | undefined;
}

export interface AwardResult {
  readonly assignments: readonly Assignment[];
  /** Members no eligible bid can serve → booking refunded. */
  readonly unserved: ReadonlyArray<{
    memberId: string;
    reason: 'NO_CAPACITY' | 'OPTIONS_NOT_COVERED' | 'NEED_BY';
  }>;
}

/**
 * Default A: walk members in join order; each gets the best-ranked bid that covers their options and still
 * has capacity. Earliest joiners get the best seller. The TEAM then sets buyer prices (pricing.ts).
 */
export function award(ranked: readonly Bid[], members: readonly AwardMember[]): AwardResult {
  if (
    new Set(ranked.map((b) => b.id)).size !== ranked.length ||
    new Set(members.map((m) => m.memberId)).size !== members.length
  )
    throw new BidError('DUPLICATE', 'duplicate bids or members');
  const remaining = new Map(ranked.map((b) => [b.id, b.capacityBase]));
  const assignments: Assignment[] = [];
  const unserved: AwardResult['unserved'][number][] = [];
  const ordered = [...members].sort(
    (a, b) => a.joinedAt - b.joinedAt || a.memberId.localeCompare(b.memberId),
  );
  for (const m of ordered) {
    if (!Number.isSafeInteger(m.needBy))
      throw new BidError('NEED_BY', 'needBy must be UTC epoch milliseconds');
    const covering = ranked.filter(
      (b) => b.uom === m.qty.uom && m.options.every((o) => b.optionsCovered.includes(o)),
    );
    if (covering.length === 0) {
      unserved.push({ memberId: m.memberId, reason: 'OPTIONS_NOT_COVERED' });
      continue;
    }
    const onTime = covering.filter((b) => b.deliverBy <= m.needBy);
    if (onTime.length === 0) {
      unserved.push({ memberId: m.memberId, reason: 'NEED_BY' });
      continue;
    }
    const chosen = onTime.find((b) => (remaining.get(b.id) ?? 0) >= m.qty.base);
    if (!chosen) {
      unserved.push({ memberId: m.memberId, reason: 'NO_CAPACITY' });
      continue;
    }
    remaining.set(chosen.id, (remaining.get(chosen.id) ?? 0) - m.qty.base);
    const backup = onTime.find((b) => b.id !== chosen.id && b.sellerId !== chosen.sellerId);
    assignments.push({
      memberId: m.memberId,
      bidId: chosen.id,
      sellerId: chosen.sellerId,
      sellerPrice: chosen.sellerPrice,
      qty: m.qty,
      backupBidId: backup?.id,
    });
  }
  return { assignments, unserved };
}
