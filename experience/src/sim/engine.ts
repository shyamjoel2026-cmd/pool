/**
 * Pure rules, mirrored from the POOL engine (pool/packages/engine/src): bids.ts, pricing.ts, order.ts, wave-drop.ts, uom.ts.
 * Nothing here is product-specific: units, terms, profiles and tax rates are data.
 */
import { allocate, divRoundHalfUp, percentOf, type Paise } from '../lib/money';
import { gstInMargin, gstSplit, INDIA, recommendedMinSaving } from '../lib/gst';
import { DAY, fmtDay } from '../lib/time';
import { UOMS } from './catalog';
import type { AwardResult, Bid, Member, Order, Pool, Product, Profile, SavedCard, Seller, Slab, State, UnservedReason, Uom } from './types';

// ---------- units ----------
export const uomOf = (code: string): Uom => UOMS[code] ?? UOMS.piece;

export function qtyLabel(base: number, uom: Uom): string {
  if (uom.baseScale === 1) return `${base} ${base === 1 ? uom.label : uom.plural}`;
  const whole = base / uom.baseScale;
  if (Number.isInteger(whole)) return `${whole} ${whole === 1 ? uom.label : uom.plural}`;
  if (base < uom.baseScale) return `${base} ${uom.baseLabel}`;
  return `${whole.toLocaleString('en-IN', { maximumFractionDigits: 3 })} ${uom.plural}`;
}

/** Price for a quantity: price-per-uom × base / baseScale, rounded half-up once (engine lineTotal). */
export const lineTotal = (pricePerUom: Paise, qtyBase: number, uom: Uom): Paise => divRoundHalfUp(pricePerUom * qtyBase, uom.baseScale);

export const waveCount = (qtyBase: number, uom: Uom, mode: Pool['waveCountMode']) =>
  mode === 'per_order' ? 1 : Math.max(1, Math.floor(qtyBase / uom.baseScale));

// ---------- Wave Drop (slab pot) ----------
export function slabAt(slabs: Slab[], i: number): Paise {
  let amount = 0;
  for (const s of slabs) {
    if (s.fromUnit <= i) amount = s.perUnitPaise;
    else break;
  }
  return amount;
}
export const holdPerUnit = (slabs: Slab[]): Paise => slabs.reduce((m, s) => Math.max(m, s.perUnitPaise), 0);
export function potFor(slabs: Slab[], units: number): Paise {
  let t = 0;
  for (let i = 1; i <= units; i++) t += slabAt(slabs, i);
  return t;
}

export interface WaveOrderIn {
  orderId: string;
  count: number;
  outcome: 'settled' | 'seller_cancelled' | 'buyer_cancelled' | 'returned';
}

/** Engine closeWave: sum(refunds) = pot; releaseToSeller + pot = heldFromSettled + sellerPenalty. */
export function closeWave(slabs: Slab[], orders: WaveOrderIn[]) {
  const hold = holdPerUnit(slabs);
  const settled = orders.filter((o) => o.outcome === 'settled');
  const cancelledBySeller = orders.filter((o) => o.outcome === 'seller_cancelled');
  const settledUnits = settled.reduce((n, o) => n + o.count, 0);
  const cancelledUnits = cancelledBySeller.reduce((n, o) => n + o.count, 0);
  const earned = potFor(slabs, settledUnits);
  const penalty = settledUnits === 0 ? 0 : potFor(slabs, settledUnits + cancelledUnits) - earned;
  const pot = earned + penalty;
  const shares = settled.length === 0 || pot === 0 ? settled.map(() => 0) : allocate(pot, settled.map((o) => o.count));
  const refunds: Record<string, Paise> = {};
  settled.forEach((o, i) => (refunds[o.orderId] = shares[i]));
  const heldFromSettled = hold * settledUnits;
  return { settledUnits, pot, refunds, heldFromSettled, sellerPenalty: penalty, releaseToSeller: heldFromSettled + penalty - pot };
}

// ---------- bids, eligibility, ranking, award ----------
export const latestBids = (bids: Bid[]) => {
  const by = new Map<string, Bid>();
  for (const b of bids) {
    const cur = by.get(b.sellerId);
    if (!cur || b.revision > cur.revision) by.set(b.sellerId, b);
  }
  return [...by.values()];
};

export function poolDeliverBy(pool: Pool): number {
  return pool.closesAt + pool.requirements.deliverWithinDays * DAY;
}

/** Plain-language reasons a bid is not eligible (published ranking rule). */
export function eligibilityReasons(pool: Pool, bid: Bid, seller: Seller | undefined): string[] {
  const reasons: string[] = [];
  if (!seller?.verified) reasons.push('Seller not verified');
  if (pool.blocked[bid.id]) reasons.push(`Held back by POOL team: ${pool.blocked[bid.id]}`);
  const by = poolDeliverBy(pool);
  if (bid.deliverBy > by) reasons.push(`Delivers by ${fmtDay(bid.deliverBy)}; pool needs ${fmtDay(by)}`);
  if (pool.requirements.modes.length && !bid.modes.some((m) => pool.requirements.modes.includes(m))) reasons.push('Does not offer the required delivery mode');
  for (const r of pool.requirements.terms) {
    const v = bid.terms[r.key];
    const ok = r.op === 'eq' ? v === r.value : typeof v === 'number' && typeof r.value === 'number' && v >= r.value;
    if (!ok) reasons.push(`${r.label}: ${v === undefined ? 'not offered' : String(v)}`);
  }
  return reasons;
}

/** Bids more than 15% below the median seller price are flagged for a check (needs ≥ 3 bids). */
export function anomalousBids(bids: Bid[]): Set<string> {
  const flagged = new Set<string>();
  if (bids.length < 3) return flagged;
  const prices = bids.map((b) => b.pricePaise).sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  const threshold = median * (1 - INDIA.bidAnomalyBps / 10_000);
  for (const b of bids) if (b.pricePaise < threshold) flagged.add(b.id);
  return flagged;
}

export function median(bids: Bid[]): number {
  const prices = bids.map((b) => b.pricePaise).sort((a, b) => a - b);
  if (!prices.length) return 0;
  const mid = Math.floor(prices.length / 2);
  return prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2);
}

/** Published rule: eligible bids by lowest seller price → earliest delivery → better settled rating → earliest submission. */
export function rankBids(pool: Pool, sellers: Seller[]) {
  const sMap = new Map(sellers.map((s) => [s.id, s]));
  const latest = latestBids(pool.bids);
  const ineligible: AwardResult['ineligible'] = [];
  const eligible: Bid[] = [];
  for (const b of latest) {
    const reasons = eligibilityReasons(pool, b, sMap.get(b.sellerId));
    if (reasons.length) ineligible.push({ bidId: b.id, reasons });
    else eligible.push(b);
  }
  eligible.sort(
    (a, b) =>
      a.pricePaise - b.pricePaise ||
      a.deliverBy - b.deliverBy ||
      (sMap.get(b.sellerId)?.rating ?? -1) - (sMap.get(a.sellerId)?.rating ?? -1) ||
      a.submittedAt - b.submittedAt ||
      a.id.localeCompare(b.id),
  );
  return { ranked: eligible, ineligible, flagged: anomalousBids(latest) };
}

const coversOptions = (b: Bid, m: Member) => Object.entries(m.options).every(([k, v]) => b.optionsCovered.length === 0 || b.optionsCovered.includes(`${k}:${v}`));

/** Default A + need-by (CX A1): members in join order get the best-ranked bid that covers them, delivers in time and has capacity. */
export function computeAward(pool: Pool, sellers: Seller[], now: number): AwardResult {
  const { ranked, ineligible, flagged } = rankBids(pool, sellers);
  const remaining = new Map(ranked.map((b) => [b.id, b.capacityBase]));
  const assignments: AwardResult['assignments'] = [];
  const unserved: AwardResult['unserved'] = [];
  const members = pool.members
    .filter((m) => m.status === 'committed' || m.status === 'offered' || m.status === 'accepted' || m.status === 'unserved' || m.status === 'walked_away' || m.status === 'timed_out')
    .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
  for (const m of members) {
    const covering = ranked.filter((b) => coversOptions(b, m));
    if (!covering.length) {
      unserved.push({ memberId: m.id, reason: 'OPTIONS_NOT_COVERED' });
      continue;
    }
    const inTime = covering.filter((b) => !m.needBy || b.deliverBy <= m.needBy);
    if (!inTime.length) {
      unserved.push({ memberId: m.id, reason: 'NEED_BY' });
      continue;
    }
    const chosen = inTime.find((b) => (remaining.get(b.id) ?? 0) >= m.qtyBase);
    if (!chosen) {
      unserved.push({ memberId: m.id, reason: 'NO_CAPACITY' as UnservedReason });
      continue;
    }
    remaining.set(chosen.id, (remaining.get(chosen.id) ?? 0) - m.qtyBase);
    const backup = inTime.find((b) => b.id !== chosen.id);
    assignments.push({ memberId: m.id, bidId: chosen.id, sellerId: chosen.sellerId, qtyBase: m.qtyBase, backupBidId: backup?.id });
  }
  return { ranked: ranked.map((b) => b.id), ineligible, flagged: [...flagged], assignments, unserved, computedAt: now };
}

export const unservedText: Record<UnservedReason, string> = {
  NO_CAPACITY: 'Sellers ran out of capacity before your place in the queue',
  OPTIONS_NOT_COVERED: 'No eligible seller offered your chosen option',
  NEED_BY: 'No seller could deliver by your need-by date',
};

// ---------- order money split (engine order.ts splitOrder) ----------
export interface Split {
  buyerTotal: Paise;
  sellerTotal: Paise;
  margin: Paise;
  gstInMargin: Paise;
  taxable: Paise;
  tcs: Paise;
  tds: Paise;
  holds: Array<{ key: string; label: string; amount: Paise; bps: number }>;
  waveHold: Paise;
  releaseOnHandover: Paise;
}

export function splitOrder(i: { buyerTotal: Paise; sellerTotal: Paise; gstBps: number; profile: Profile; waveHold: Paise }): Split {
  const margin = i.buyerTotal - i.sellerTotal;
  const taxable = divRoundHalfUp(i.buyerTotal * 10_000, 10_000 + i.gstBps);
  const tcs = percentOf(taxable, INDIA.tcsBps);
  const tds = percentOf(i.buyerTotal, INDIA.tdsBps);
  const holds = i.profile.holds.map((h) => ({ key: h.key, label: h.label, bps: h.bps, amount: percentOf(i.sellerTotal, h.bps) }));
  const releaseOnHandover = i.sellerTotal - tcs - tds - i.waveHold - holds.reduce((a, h) => a + h.amount, 0);
  return { buyerTotal: i.buyerTotal, sellerTotal: i.sellerTotal, margin, gstInMargin: gstInMargin(margin), taxable, tcs, tds, holds, waveHold: i.waveHold, releaseOnHandover };
}

// ---------- lookups ----------
export const byId = <T extends { id: string }>(xs: T[], id: string | undefined) => (id ? xs.find((x) => x.id === id) : undefined);
export const productOf = (s: State, id: string) => s.products.find((p) => p.id === id)!;
export const profileOf = (s: State, id: string) => s.profiles.find((p) => p.id === id)!;
export const sellerOf = (s: State, id: string) => s.sellers.find((x) => x.id === id)!;
export const poolOf = (s: State, id: string) => s.pools.find((p) => p.id === id);
export const myMember = (p: Pool) => p.members.find((m) => m.isMe && m.status !== 'left' && m.status !== 'pending') ?? p.members.find((m) => m.isMe && m.status === 'pending');
export const committedMembers = (p: Pool) => p.members.filter((m) => m.status !== 'pending' && m.status !== 'left');
export const committedCount = (p: Pool) => p.members.filter((m) => m.status === 'committed').length + p.members.filter((m) => ['offered', 'accepted', 'walked_away', 'timed_out', 'unserved', 'no_deal'].includes(m.status)).length;
export const committedUnits = (p: Pool, uom: Uom) => committedMembers(p).reduce((a, m) => a + m.qtyBase, 0) / uom.baseScale;

// ---------- outside price, honest comparison ----------
export function effectiveOutside(q: Product['outside'][number], cards: SavedCard[]) {
  const o = q.cardOffer;
  if (o && cards.some((c) => c.bank === o.bank && c.type === o.cardType)) {
    const discount = Math.min(percentOf(q.pricePaise, o.bps), o.capPaise);
    return { price: q.pricePaise - discount, discount, cardLabel: o.label };
  }
  return { price: q.pricePaise, discount: 0, cardLabel: undefined as string | undefined };
}

export function outsideBest(product: Product, cards: SavedCard[]) {
  let best = product.outside[0];
  let bestEff = effectiveOutside(best, cards);
  for (const q of product.outside) {
    const e = effectiveOutside(q, cards);
    if (e.price < bestEff.price) {
      best = q;
      bestEff = e;
    }
  }
  const plain = Math.min(...product.outside.map((q) => q.pricePaise));
  return { quote: best, price: bestEff.price, discount: bestEff.discount, cardLabel: bestEff.cardLabel, plainBest: plain };
}

export const lowest30 = (p: Product) => Math.min(...p.priceHistory);

// ---------- offers ----------
export interface OfferView {
  member: Member;
  bid: Bid;
  seller: Seller;
  buyerPrice: Paise;
  sellerPrice: Paise;
  buyerTotal: Paise;
  sellerTotal: Paise;
  booking: Paise;
  balance: Paise;
  gst: ReturnType<typeof gstSplit>;
  interState: boolean;
  outsideTotal: Paise;
  outsideSource: string;
  outsideCard?: string;
  saving: Paise;
  deliverBy: number;
  waveEstimate: { perBuyer: Paise; counted: number; pot: Paise };
  backupSeller?: Seller;
}

export function offerFor(s: State, pool: Pool, member: Member): OfferView | undefined {
  const a = pool.award?.assignments.find((x) => x.memberId === member.id);
  if (!a) return undefined;
  const bid = pool.bids.find((b) => b.id === a.bidId)!;
  const price = pool.prices[a.bidId];
  if (!price) return undefined;
  const product = productOf(s, pool.productId);
  const uom = uomOf(product.uom);
  const seller = sellerOf(s, bid.sellerId);
  const buyerTotal = lineTotal(price.buyerPricePaise, member.qtyBase, uom);
  const sellerTotal = lineTotal(bid.pricePaise, member.qtyBase, uom);
  const interState = seller.stateCode !== '36';
  const ob = outsideBest(product, member.isMe ? s.me.cards : []);
  const outsideTotal = lineTotal(ob.price, member.qtyBase, uom);
  const accepted = pool.members.filter((m) => m.status === 'accepted' && pool.award?.assignments.find((x) => x.memberId === m.id)?.bidId === bid.id);
  const counted = Math.max(1, accepted.reduce((n, m) => n + waveCount(m.qtyBase, uom, pool.waveCountMode), 0));
  const pot = potFor(bid.slabs, counted);
  const myCount = waveCount(member.qtyBase, uom, pool.waveCountMode);
  const perBuyer = counted ? Math.floor((pot * myCount) / counted) : 0;
  const backupBid = a.backupBidId ? pool.bids.find((b) => b.id === a.backupBidId) : undefined;
  return {
    member,
    bid,
    seller,
    buyerPrice: price.buyerPricePaise,
    sellerPrice: bid.pricePaise,
    buyerTotal,
    sellerTotal,
    booking: member.bookingPaise,
    balance: buyerTotal - member.bookingPaise,
    gst: gstSplit(buyerTotal, product.gstBps, interState),
    interState,
    outsideTotal,
    outsideSource: ob.quote.source,
    outsideCard: ob.cardLabel,
    saving: outsideTotal - buyerTotal,
    deliverBy: bid.deliverBy,
    waveEstimate: { perBuyer, counted, pot },
    backupSeller: backupBid ? sellerOf(s, backupBid.sellerId) : undefined,
  };
}

/** Wave Drop meter for a seller's accepted/settled orders in a pool (real counts only). */
export function waveMeter(s: State, pool: Pool, bidId: string) {
  const bid = pool.bids.find((b) => b.id === bidId);
  if (!bid) return undefined;
  const uom = uomOf(productOf(s, pool.productId).uom);
  const orders = s.orders.filter((o) => o.poolId === pool.id && o.bidId === bidId);
  const live = orders.filter((o) => !['cancelled_by_buyer', 'returned'].includes(o.status));
  const settled = orders.filter((o) => o.status === 'settled');
  const countOf = (xs: Order[]) => xs.reduce((n, o) => n + waveCount(o.qtyBase, uom, pool.waveCountMode), 0);
  const liveUnits = countOf(live);
  const settledUnits = countOf(settled);
  const potLive = potFor(bid.slabs, liveUnits);
  return {
    bid,
    liveUnits,
    settledUnits,
    potLive,
    potSettled: potFor(bid.slabs, settledUnits),
    perBuyerIfAllSettle: liveUnits ? Math.floor(potLive / liveUnits) : 0,
    nextSlab: bid.slabs.find((sl) => sl.fromUnit > liveUnits),
    hold: holdPerUnit(bid.slabs),
  };
}

export function minSavingFor(outside: Paise) {
  return recommendedMinSaving(outside);
}

/** Human labels for order steps and statuses. */
export const orderStatusText: Record<Order['status'], string> = {
  awaiting_payment: 'Waiting for payment',
  confirmed: 'Confirmed',
  handed_over: 'Delivered',
  settled: 'Completed',
  cancelled_by_buyer: 'Cancelled by you',
  cancelled_by_seller: 'Cancelled by seller',
  returned: 'Returned · refunded',
};

export function currentStep(o: Order, profile: Profile): { key: string; label: string } {
  if (o.status === 'awaiting_payment') return { key: 'pay', label: 'Waiting for payment' };
  if (o.status === 'cancelled_by_buyer' || o.status === 'cancelled_by_seller') return { key: 'cancelled', label: orderStatusText[o.status] };
  if (o.status === 'returned') return { key: 'returned', label: 'Returned · refunded' };
  if (o.status === 'settled') return { key: 'settled', label: 'Completed' };
  if (o.status === 'handed_over') {
    const pendingAfter = profile.steps.filter((st) => st.afterHandover && !o.steps.some((x) => x.key === st.key));
    if (pendingAfter.length && !o.holdsReleased.some((h) => h.key === pendingAfter[0].releasesHold)) return { key: pendingAfter[0].key, label: `Delivered · ${pendingAfter[0].label.toLowerCase()} pending` };
    return { key: 'return_window', label: 'Delivered · return window open' };
  }
  const before = profile.steps.filter((st) => !st.afterHandover);
  const next = before.find((st) => !o.steps.some((x) => x.key === st.key));
  if (!next) return { key: 'handover', label: profile.modes.includes('store_pickup') ? 'Ready for pickup' : profile.modes.includes('service_visit') ? 'Visit scheduled' : 'Out for delivery' };
  if (next.key === 'seller_confirmed') return { key: 'seller_confirmed', label: 'Waiting for seller to confirm' };
  return { key: next.key, label: next.key === 'dispatched' ? 'Packed · dispatching soon' : next.key === 'ready_for_pickup' ? 'Seller is preparing your order' : next.label };
}
