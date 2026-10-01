/** Derived views: buyer money, seller payouts, the POOL ledger and dashboards. All computed from members and orders. */
import { inr } from '../lib/money';
import { DAY, HOUR, MIN } from '../lib/time';
import { lineTotal, outsideBest, productOf, profileOf, sellerOf, uomOf, waveCount, holdPerUnit } from './engine';
import { sellerSplit } from './store';
import type { Member, Order, Pool, State } from './types';

export type TxnKind = 'booking' | 'order' | 'balance' | 'refund' | 'wave_drop' | 'late_credit' | 'applied';
export interface Txn {
  id: string;
  kind: TxnKind;
  title: string;
  sub: string;
  amount: number;
  direction: 'out' | 'in' | 'none';
  at: number;
  method?: string;
  ref?: string;
  status: 'success' | 'processing' | 'credited';
  reason?: string;
  poolId?: string;
  orderId?: string;
  timeline: Array<{ label: string; at: number; done: boolean }>;
}

const REFUND_REASON: Partial<Record<Member['status'], string>> = {
  left: 'You left the pool before close',
  walked_away: 'You walked away from the offer',
  timed_out: 'No reply before the decide time (treated as walking away)',
  unserved: 'No seller could serve your place in the pool',
  no_deal: 'No deal in this pool',
};

function refundTimeline(at: number, nowMs: number, viaUpi: boolean) {
  const processed = at + 2 * MIN;
  const credited = at + (viaUpi ? 30 * MIN : 3 * DAY);
  return {
    status: (nowMs >= credited ? 'credited' : 'processing') as Txn['status'],
    timeline: [
      { label: 'Refund started by POOL', at, done: true },
      { label: 'Processed by the payment company', at: processed, done: nowMs >= processed },
      { label: viaUpi ? 'Credited to your UPI account' : 'Credited to your card (3–5 working days)', at: credited, done: nowMs >= credited },
    ],
  };
}

export function myTxns(s: State, nowMs: number): Txn[] {
  const out: Txn[] = [];
  for (const p of s.pools) {
    const product = productOf(s, p.productId);
    for (const m of p.members.filter((x) => x.isMe && x.bookingPaidAt)) {
      out.push({ id: `bk-${m.id}`, kind: 'booking', title: `Booking · ${product.short}`, sub: `Refundable · ${p.no}`, amount: m.bookingPaise, direction: 'out', at: m.bookingPaidAt!, method: m.bookingMethod, ref: m.bookingRef, status: 'success', poolId: p.id, timeline: [{ label: 'Paid and held by the payment company', at: m.bookingPaidAt!, done: true }] });
      const reason = REFUND_REASON[m.status];
      if (reason && m.refundAt) {
        const tl = refundTimeline(m.refundAt, nowMs, (m.bookingMethod ?? '').includes('UPI'));
        out.push({ id: `rf-${m.id}`, kind: 'refund', title: `Booking refund · ${product.short}`, sub: reason, amount: m.bookingPaise, direction: 'in', at: m.refundAt, method: m.bookingMethod, ref: `rfnd_SIM_${m.id.slice(-6).toUpperCase()}`, reason, poolId: p.id, ...tl });
      }
    }
  }
  for (const o of s.orders.filter((x) => x.isMe)) {
    const product = productOf(s, o.productId);
    if (o.paidPaise > o.bookingCredit && o.paidAt) {
      out.push({ id: `op-${o.id}`, kind: o.plan === 'door' ? 'balance' : 'order', title: `${o.plan === 'door' ? 'Paid at the door' : 'Order payment'} · ${product.short}`, sub: `${o.no} · held until handover code`, amount: o.paidPaise - o.bookingCredit, direction: 'out', at: o.paidAt, method: o.payMethod, ref: o.payRef, status: 'success', orderId: o.id, timeline: [{ label: 'Paid', at: o.paidAt, done: true }, { label: 'Held by the payment company until your code', at: o.paidAt, done: true }, { label: 'Released to the seller after your code', at: o.handedOverAt ?? o.paidAt, done: !!o.handedOverAt }] });
    }
    out.push({ id: `ap-${o.id}`, kind: 'applied', title: `Booking applied · ${product.short}`, sub: `${inr(o.bookingCredit)} credited against ${o.no}`, amount: o.bookingCredit, direction: 'none', at: o.createdAt, status: 'success', orderId: o.id, timeline: [] });
    if (o.refundPaise && (o.cancelledAt || o.returnedAt)) {
      const at = (o.cancelledAt ?? o.returnedAt)!;
      out.push({ id: `or-${o.id}`, kind: 'refund', title: `Refund · ${product.short}`, sub: o.status === 'returned' ? 'Returned' : 'Order cancelled', amount: o.refundPaise, direction: 'in', at, method: o.payMethod, ref: `rfnd_SIM_${o.id.slice(-6).toUpperCase()}`, reason: o.status, orderId: o.id, ...refundTimeline(at, nowMs, (o.payMethod ?? 'UPI').includes('UPI')) });
    }
    if (o.lateCreditPaise && o.handedOverAt) out.push({ id: `lc-${o.id}`, kind: 'late_credit', title: `Late-delivery credit · ${product.short}`, sub: 'Paid by the seller from held money', amount: o.lateCreditPaise, direction: 'in', at: o.handedOverAt, method: o.payMethod, ref: `rfnd_SIM_LC${o.id.slice(-4).toUpperCase()}`, orderId: o.id, ...refundTimeline(o.handedOverAt, nowMs, true) });
    const pool = s.pools.find((p) => p.id === o.poolId)!;
    if (o.waveRefundPaise && pool.wave) out.push({ id: `wd-${o.id}`, kind: 'wave_drop', title: `Wave Drop · ${product.short}`, sub: `${pool.wave.settledUnits} completed purchases shared the pot`, amount: o.waveRefundPaise, direction: 'in', at: pool.wave.closedAt, method: o.payMethod, ref: `rfnd_SIM_WD${o.id.slice(-4).toUpperCase()}`, orderId: o.id, ...refundTimeline(pool.wave.closedAt, nowMs, true) });
  }
  return out.sort((a, b) => b.at - a.at);
}

export function myMoneySummary(s: State, nowMs: number) {
  let heldBookings = 0;
  let heldOrders = 0;
  for (const p of s.pools) for (const m of p.members) if (m.isMe && (m.status === 'committed' || m.status === 'offered')) heldBookings += m.bookingPaise;
  for (const o of s.orders) if (o.isMe && (o.status === 'confirmed' || o.status === 'awaiting_payment')) heldOrders += o.paidPaise;
  const tx = myTxns(s, nowMs);
  const refundsInProgress = tx.filter((t) => t.direction === 'in' && t.status === 'processing').reduce((a, t) => a + t.amount, 0);
  const waveReceived = tx.filter((t) => t.kind === 'wave_drop').reduce((a, t) => a + t.amount, 0);
  const savedTotal = s.orders.filter((o) => o.isMe && ['handed_over', 'settled', 'confirmed'].includes(o.status)).reduce((a, o) => {
    const product = productOf(s, o.productId);
    const out = lineTotal(outsideBest(product, []).plainBest, o.qtyBase, uomOf(product.uom));
    return a + Math.max(0, out - o.buyerTotal) + (o.waveRefundPaise ?? 0);
  }, 0);
  // Savings are a summary, shown to the rupee; exact paise stay in each transaction.
  return { heldBookings, heldOrders, refundsInProgress, waveReceived, savedTotal: Math.round(savedTotal / 100) * 100 };
}

// ---------- seller payouts ----------
export interface PayoutLine {
  id: string;
  orderId?: string;
  poolId: string;
  label: string;
  amount: number;
  at: number;
  status: 'held' | 'scheduled' | 'paid' | 'reversed';
  note: string;
}

export function sellerPayouts(s: State, sellerId: string, nowMs: number) {
  const lines: PayoutLine[] = [];
  let onHoldPA = 0;
  let onHoldHolds = 0;
  let onHoldWave = 0;
  const settle = (at: number) => at + 2 * DAY;
  for (const o of s.orders.filter((x) => x.sellerId === sellerId)) {
    const pool = s.pools.find((p) => p.id === o.poolId)!;
    const sp = sellerSplit(s, o);
    if (o.status === 'confirmed' || o.status === 'awaiting_payment') {
      onHoldPA += o.status === 'confirmed' ? sp.sellerTotal : 0;
      continue;
    }
    if (!o.handedOverAt) continue;
    const release = sp.releaseOnHandover - (o.lateCreditPaise ?? 0);
    lines.push({ id: `rl-${o.id}`, orderId: o.id, poolId: pool.id, label: `${o.no} · released on code`, amount: release, at: o.handedOverAt, status: o.status === 'returned' ? 'reversed' : nowMs >= settle(o.handedOverAt) ? 'paid' : 'scheduled', note: o.lateCreditPaise ? `after late credit ${inr(o.lateCreditPaise)} to buyer` : 'seller total − TCS − TDS − holds' });
    for (const h of sp.holds) {
      const rel = o.holdsReleased.find((x) => x.key === h.key);
      if (rel) lines.push({ id: `hr-${o.id}-${h.key}`, orderId: o.id, poolId: pool.id, label: `${o.no} · ${h.label.toLowerCase()} released`, amount: h.amount, at: rel.at, status: o.status === 'returned' ? 'reversed' : nowMs >= settle(rel.at) ? 'paid' : 'scheduled', note: rel.reason });
      else if (o.status !== 'returned') onHoldHolds += h.amount;
    }
    if (!pool.wave && o.status !== 'returned') onHoldWave += sp.waveHold;
  }
  for (const p of s.pools) {
    const rel = p.wave?.releaseToSeller[sellerId];
    if (rel !== undefined && p.wave) lines.push({ id: `wv-${p.id}`, poolId: p.id, label: `${p.no} · Wave Drop hold, unused part`, amount: rel, at: p.wave.closedAt, status: nowMs >= settle(p.wave.closedAt) ? 'paid' : 'scheduled', note: `pot ${inr(p.wave.potPaise)} paid to ${p.wave.settledUnits} buyers` });
  }
  lines.sort((a, b) => b.at - a.at);
  const paid = lines.filter((l) => l.status === 'paid').reduce((a, l) => a + l.amount, 0);
  const scheduled = lines.filter((l) => l.status === 'scheduled').reduce((a, l) => a + l.amount, 0);
  return { lines, paid, scheduled, onHoldPA, onHoldHolds, onHoldWave };
}

// ---------- POOL ledger: where every rupee is, tied out to the paisa ----------
export function ledger(s: State, nowMs: number) {
  const L = { collectedBookings: 0, collectedOrders: 0, recoveredFromSellers: 0, refundedBookings: 0, refundsInTransit: 0, refundedOrders: 0, waveDropsPaid: 0, lateCredits: 0, paidToSellers: 0, poolMarginNet: 0, gstOnCommission: 0, tcsPayable: 0, tdsPayable: 0, heldBookings: 0, heldOrderFunds: 0, heldHolds: 0, heldWave: 0 };
  for (const p of s.pools) {
    for (const m of p.members) {
      if (!m.bookingPaidAt || m.status === 'pending') continue;
      L.collectedBookings += m.bookingPaise;
      if (REFUND_REASON[m.status]) {
        if (m.refundAt && nowMs >= m.refundAt + 30 * MIN) L.refundedBookings += m.bookingPaise;
        else L.refundsInTransit += m.bookingPaise;
      } else if (m.status === 'committed' || m.status === 'offered') L.heldBookings += m.bookingPaise;
      // accepted → booking moved into the order (counted there).
    }
  }
  const waveConsumed = new Map<string, number>();
  for (const o of s.orders) {
    const pool = s.pools.find((p) => p.id === o.poolId)!;
    L.collectedOrders += o.paidPaise - o.bookingCredit;
    // Order funds = paidPaise (booking credit + balance payments)
    if (o.status === 'awaiting_payment' || o.status === 'confirmed') {
      L.heldOrderFunds += o.paidPaise;
      continue;
    }
    if (o.status === 'cancelled_by_buyer' || o.status === 'cancelled_by_seller') {
      L.refundedOrders += o.refundPaise ?? 0;
      L.paidToSellers += o.paidPaise - (o.refundPaise ?? 0); // disclosed return cost goes to the seller
      continue;
    }
    const sp = sellerSplit(s, o);
    const releasedHolds = sp.holds.filter((h) => o.holdsReleased.some((x) => x.key === h.key)).reduce((a, h) => a + h.amount, 0);
    if (o.status === 'returned') {
      // POOL refunds first and recovers from the seller; taxes and commission reverse by credit note.
      L.refundedOrders += o.refundPaise ?? o.paidPaise;
      L.paidToSellers += sp.releaseOnHandover + releasedHolds;
      L.recoveredFromSellers += sp.releaseOnHandover + releasedHolds;
      continue;
    }
    const late = o.lateCreditPaise ?? 0;
    L.lateCredits += late;
    L.paidToSellers += sp.releaseOnHandover - late + releasedHolds;
    L.heldHolds += sp.holds.reduce((a, h) => a + h.amount, 0) - releasedHolds;
    L.poolMarginNet += sp.margin - sp.gstInMargin;
    L.gstOnCommission += sp.gstInMargin;
    L.tcsPayable += sp.tcs;
    L.tdsPayable += sp.tds;
    if (pool.wave && o.status === 'settled') waveConsumed.set(pool.id, (waveConsumed.get(pool.id) ?? 0) + sp.waveHold);
    else L.heldWave += sp.waveHold;
  }
  for (const p of s.pools) {
    if (!p.wave) continue;
    const held = waveConsumed.get(p.id) ?? 0;
    const pot = p.wave.potPaise;
    const rel = Object.values(p.wave.releaseToSeller).reduce((a, b) => a + b, 0);
    L.waveDropsPaid += pot;
    L.paidToSellers += rel;
    L.recoveredFromSellers += pot + rel - held; // seller penalty slabs come from deposits
  }
  const inflow = L.collectedBookings + L.collectedOrders + L.recoveredFromSellers;
  const outflow = L.refundedBookings + L.refundsInTransit + L.refundedOrders + L.waveDropsPaid + L.lateCredits + L.paidToSellers + L.poolMarginNet + L.gstOnCommission + L.tcsPayable + L.tdsPayable + L.heldBookings + L.heldOrderFunds + L.heldHolds + L.heldWave;
  return { ...L, inflow, outflow, difference: inflow - outflow, heldAtPA: L.heldBookings + L.heldOrderFunds + L.heldHolds + L.heldWave + L.refundsInTransit };
}

// ---------- refunds for the POOL team ----------
export interface RefundRow {
  id: string;
  who: string;
  isMe?: boolean;
  pool: Pool;
  amount: number;
  reason: string;
  at: number;
  status: 'processing' | 'credited';
  ref: string;
  orderId?: string;
}
export function allRefunds(s: State, nowMs: number): RefundRow[] {
  const rows: RefundRow[] = [];
  for (const p of s.pools) {
    for (const m of p.members) {
      const r = REFUND_REASON[m.status];
      if (r && m.refundAt && m.bookingPaidAt) rows.push({ id: `rf-${m.id}`, who: m.name, isMe: m.isMe, pool: p, amount: m.bookingPaise, reason: r.replace('You ', 'Buyer ').replace('your ', 'their '), at: m.refundAt, status: nowMs >= m.refundAt + 30 * MIN ? 'credited' : 'processing', ref: `rfnd_SIM_${m.id.slice(-6).toUpperCase()}` });
    }
  }
  for (const o of s.orders) {
    const p = s.pools.find((x) => x.id === o.poolId)!;
    if (o.refundPaise && (o.cancelledAt || o.returnedAt)) {
      const at = (o.cancelledAt ?? o.returnedAt)!;
      rows.push({ id: `or-${o.id}`, who: o.buyerName, isMe: o.isMe, pool: p, amount: o.refundPaise, reason: o.status === 'returned' ? 'Returned (defective / not as described)' : o.status === 'cancelled_by_seller' ? 'Seller could not fulfil' : 'Cancelled by buyer', at, status: nowMs >= at + 30 * MIN ? 'credited' : 'processing', ref: `rfnd_SIM_${o.id.slice(-6).toUpperCase()}`, orderId: o.id });
    }
    if (o.waveRefundPaise && p.wave) rows.push({ id: `wd-${o.id}`, who: o.buyerName, isMe: o.isMe, pool: p, amount: o.waveRefundPaise, reason: 'Wave Drop share', at: p.wave.closedAt, status: 'credited', ref: `rfnd_SIM_WD${o.id.slice(-4).toUpperCase()}`, orderId: o.id });
    if (o.lateCreditPaise && o.handedOverAt) rows.push({ id: `lc-${o.id}`, who: o.buyerName, isMe: o.isMe, pool: p, amount: o.lateCreditPaise, reason: 'Late-delivery credit (paid by seller)', at: o.handedOverAt, status: 'credited', ref: `rfnd_SIM_LC${o.id.slice(-4).toUpperCase()}`, orderId: o.id });
  }
  return rows.sort((a, b) => b.at - a.at);
}

// ---------- POOL team KPIs ----------
export function opsKpis(s: State, nowMs: number) {
  const open = s.pools.filter((p) => p.state === 'open');
  const committed = open.reduce((a, p) => a + p.members.filter((m) => m.status === 'committed').length, 0);
  const offersWaiting = s.pools.reduce((a, p) => a + p.members.filter((m) => m.status === 'offered').length, 0);
  const inFulfilment = s.orders.filter((o) => o.status === 'confirmed' || o.status === 'awaiting_payment').length;
  const decided = s.pools.flatMap((p) => p.members).filter((m) => ['accepted', 'walked_away', 'timed_out'].includes(m.status));
  const acceptRate = decided.length ? decided.filter((m) => m.status === 'accepted').length / decided.length : 0;
  const delivered = s.orders.filter((o) => o.handedOverAt);
  const onTime = delivered.length ? delivered.filter((o) => o.handedOverAt! <= o.promisedBy).length / delivered.length : 0;
  const savings = s.orders.filter((o) => o.status !== 'cancelled_by_buyer').map((o) => {
    const prod = productOf(s, o.productId);
    return lineTotal(Math.min(...prod.outside.map((q) => q.pricePaise)), o.qtyBase, uomOf(prod.uom)) - o.buyerTotal;
  });
  const avgSaving = savings.length ? Math.round(savings.reduce((a, b) => a + b, 0) / savings.length) : 0;
  const allBids = s.pools.flatMap((p) => p.bids);
  const waveBps = allBids.length ? allBids.filter((b) => b.slabs.length).length / allBids.length : 0;
  const lateOrders = s.orders.filter((o) => o.status === 'confirmed' && o.promisedBy < nowMs);
  const openTickets = s.tickets.filter((t) => t.status !== 'resolved');
  const newSignals = s.signals.filter((x) => x.status === 'new');
  const gmv = s.orders.filter((o) => !['cancelled_by_buyer', 'cancelled_by_seller', 'returned'].includes(o.status)).reduce((a, o) => a + o.buyerTotal, 0);
  const margin = s.orders.filter((o) => ['handed_over', 'settled'].includes(o.status)).reduce((a, o) => a + (o.buyerTotal - o.sellerTotal), 0);
  return { openPools: open.length, committed, offersWaiting, inFulfilment, acceptRate, onTime, avgSaving, waveBps, lateOrders, openTickets, newSignals, gmv, margin };
}

export function poolStageLabel(p: Pool): string {
  return { open: 'Open', closed: 'Closed · award review', pricing: 'Setting prices', offers: 'Offers out', fulfilment: 'Delivering', completed: 'Completed', no_deal: 'No deal', cancelled: 'Cancelled' }[p.state];
}

export function sellerDemandFor(s: State, sellerId: string) {
  const seller = sellerOf(s, sellerId);
  return s.pools.filter((p) => p.state === 'open' && seller.categories.includes(productOf(s, p.productId).category) && (p.invitedSellers.includes(sellerId) || p.pincodes.some((pin) => seller.pincodes.includes(pin))));
}

export function waveHoldPerOrder(s: State, o: Order) {
  const pool = s.pools.find((p) => p.id === o.poolId)!;
  const bid = pool.bids.find((b) => b.id === o.bidId);
  return (bid ? holdPerUnit(bid.slabs) : 0) * waveCount(o.qtyBase, uomOf(productOf(s, o.productId).uom), pool.waveCountMode);
}

export const profileForPool = (s: State, p: Pool) => profileOf(s, p.profileId);
export const HOURS = HOUR;
