/**
 * The simulated backend. One immutable state object, persisted in this browser only, with every action following
 * the engine's rules. Nothing leaves the browser; every payment and message is simulated and labelled as such.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { INDIA } from '../lib/gst';
import { inr, rs } from '../lib/money';
import { simRef, uid } from '../lib/rand';
import { atIST, DAY, fmtDayTime, fmtWhen, HOUR, MIN, setTimeLocale } from '../lib/time';
import { closeWave, computeAward, holdPerUnit, lineTotal, potFor, productOf, profileOf, qtyLabel, sellerOf, uomOf, waveCount } from './engine';
import { seed, STATE_VERSION } from './seed';
import type { Bid, Member, Notification, Order, Pool, Slab, State, Ticket } from './types';

const KEY = 'pool-demo-state-v' + STATE_VERSION;

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      if (s.v === STATE_VERSION) return s;
    }
  } catch {
    /* storage blocked: start fresh */
  }
  return seed(Date.now());
}

let state: State = load();
setTimeLocale(state.prefs.lang);
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode or full: the demo still works in memory */
  }
}

function commit(next: State) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

export const getState = () => state;
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function useSim(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}
export const now = () => Date.now() + state.offset;

/** Re-render every `ms` so countdowns move. */
export function useNow(ms = 1000): number {
  const [t, setT] = useState(now());
  useEffect(() => {
    const i = setInterval(() => setT(now()), ms);
    return () => clearInterval(i);
  }, [ms]);
  return Math.max(t, now() - ms);
}

type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T,>(value: T): Result<T> => ({ ok: true, value });
const fail = (error: string): Result<never> => ({ ok: false, error });

function mutate<T>(fn: (d: State, t: number) => Result<T>): Result<T> {
  const d = structuredClone(state);
  const r = fn(d, now());
  if (r.ok) commit(d);
  return r;
}

// ---------- helpers ----------
function note(d: State, to: Notification['to'], kind: Notification['kind'], title: string, body: string, href?: string, channels: Notification['channels'] = ['app', 'whatsapp']) {
  d.notifications.unshift({ id: uid('n'), to, kind, title, body, href, at: now(), read: false, channels });
}
function audit(d: State, actor: string, action: string, detail: string, poolId?: string, orderId?: string) {
  d.audit.unshift({ id: uid('ev'), at: now(), actor, action, detail, poolId, orderId });
}
const poolBy = (d: State, id: string) => d.pools.find((p) => p.id === id);
const orderBy = (d: State, id: string) => d.orders.find((o) => o.id === id);
const memberBy = (d: State, memberId: string) => {
  for (const p of d.pools) {
    const m = p.members.find((x) => x.id === memberId);
    if (m) return { pool: p, member: m };
  }
  return undefined;
};

const BOOKING_BY_CATEGORY: Record<string, number> = { electronics: 2000, appliances: 2000, laptops: 2000, groceries: 200, meat: 100, books: 100, building: 1000, services: 300, home: 500 };
const PROFILE_BY_ART: Record<string, string> = { tv: 'delivery_with_installation', ac: 'delivery_with_installation', washer: 'delivery_with_installation', fridge: 'home_delivery', geyser: 'delivery_with_installation', chimney: 'delivery_with_installation', waterpurifier: 'delivery_with_installation', fan: 'delivery_with_installation', mutton: 'store_pickup', cleaning: 'service_visit' };

// =====================================================================================
// Demo / prefs
// =====================================================================================
export function resetDemo() {
  const fresh = seed(Date.now());
  fresh.prefs = { ...fresh.prefs, lang: state.prefs.lang, theme: state.prefs.theme };
  commit(fresh);
}
export function setPrefs(p: Partial<State['prefs']>) {
  if (p.lang) setTimeLocale(p.lang);
  return mutate((d) => {
    d.prefs = { ...d.prefs, ...p };
    return ok(undefined);
  });
}
export function setDemo(p: Partial<State['demo']>) {
  return mutate((d) => {
    d.demo = { ...d.demo, ...p };
    return ok(undefined);
  });
}
export function setTour(p: Partial<State['tour']>) {
  return mutate((d) => {
    d.tour = { ...d.tour, ...p };
    return ok(undefined);
  });
}
export function advanceClock(ms: number) {
  const r = mutate((d) => {
    d.offset += ms;
    audit(d, 'Demo control', 'Clock moved forward', `+${Math.round(ms / HOUR)} h (simulated time)`);
    return ok(undefined);
  });
  tick();
  return r;
}
export function markNotificationsRead(to: Notification['to']) {
  return mutate((d) => {
    d.notifications.forEach((n) => n.to === to && (n.read = true));
    return ok(undefined);
  });
}
export function markRead(id: string) {
  return mutate((d) => {
    const n = d.notifications.find((x) => x.id === id);
    if (n) n.read = true;
    return ok(undefined);
  });
}

// =====================================================================================
// Buyer: profile & household
// =====================================================================================
export function updateProfile(p: { name?: string; email?: string }) {
  return mutate((d) => {
    Object.assign(d.me, p);
    return ok(undefined);
  });
}
export function saveAddress(a: State['me']['addresses'][number]) {
  return mutate((d) => {
    const i = d.me.addresses.findIndex((x) => x.id === a.id);
    if (a.isDefault) d.me.addresses.forEach((x) => (x.isDefault = false));
    if (i >= 0) d.me.addresses[i] = a;
    else d.me.addresses.push(a);
    return ok(undefined);
  });
}
export function deleteAddress(id: string) {
  return mutate((d) => {
    if (d.me.addresses.length <= 1) return fail('Keep at least one address.');
    d.me.addresses = d.me.addresses.filter((a) => a.id !== id);
    if (!d.me.addresses.some((a) => a.isDefault)) d.me.addresses[0].isDefault = true;
    return ok(undefined);
  });
}
export function setCards(cards: State['me']['cards']) {
  return mutate((d) => {
    d.me.cards = cards;
    return ok(undefined);
  });
}
export function toggleWatch(productId: string, alert: 'pool' | 'price' = 'pool', targetPaise?: number) {
  return mutate((d, t) => {
    const i = d.watch.findIndex((w) => w.productId === productId);
    if (i >= 0) d.watch.splice(i, 1);
    else d.watch.unshift({ productId, addedAt: t, alert, targetPaise });
    return ok(i < 0);
  });
}
export function addRecent(productId: string) {
  if (state.recent[0] === productId) return;
  mutate((d) => {
    d.recent = [productId, ...d.recent.filter((x) => x !== productId)].slice(0, 8);
    return ok(undefined);
  });
}

export function pushChat(channel: 'assistant' | 'whatsapp', msg: Omit<State['chats']['assistant'][number], 'id' | 'at'> & { at?: number }) {
  return mutate((d, t) => {
    d.chats[channel].push({ id: uid('c'), at: msg.at ?? t, ...msg });
    return ok(undefined);
  });
}
export function addLockerItem(item: Omit<NonNullable<State['locker']>[number], 'id' | 'addedAt'>) {
  return mutate((d, t) => {
    d.locker = [{ ...item, id: uid('lk'), addedAt: t }, ...(d.locker ?? [])];
    return ok(undefined);
  });
}
export function clearChat(channel: 'assistant' | 'whatsapp') {
  return mutate((d) => {
    d.chats[channel] = [];
    return ok(undefined);
  });
}

// =====================================================================================
// Buyer: join / start / leave
// =====================================================================================
export interface JoinInput {
  qtyBase: number;
  options: Record<string, string>;
  needBy?: number;
  addressId?: string;
  channel?: Member['channel'];
  asName?: string;
}

function validateQty(pool: Pool, qtyBase: number, existingHouseholdQty: number, uomLabel: (b: number) => string): string | undefined {
  const r = pool.qtyRule;
  if (qtyBase < r.minBase) return `Minimum is ${uomLabel(r.minBase)}.`;
  if ((qtyBase - r.minBase) % r.stepBase !== 0) return `Quantity goes up in steps of ${uomLabel(r.stepBase)}.`;
  if (r.maxPerBuyerBase !== undefined && qtyBase > r.maxPerBuyerBase) return `Maximum per buyer is ${uomLabel(r.maxPerBuyerBase)}.`;
  if (r.maxPerHouseholdBase !== undefined && existingHouseholdQty + qtyBase > r.maxPerHouseholdBase) return `A household can book at most ${uomLabel(r.maxPerHouseholdBase)} in this pool.`;
  return undefined;
}

export function joinPool(poolId: string, input: JoinInput): Result<string> {
  return mutate((d, t) => {
    const pool = poolBy(d, poolId);
    if (!pool) return fail('This pool no longer exists.');
    if (pool.state !== 'open' || t >= pool.closesAt) return fail('This pool has closed. Start a new one or join another.');
    const uom = uomOf(productOf(d, pool.productId).uom);
    const asOther = !!input.asName;
    if (!asOther && pool.members.some((m) => m.isMe && (m.status === 'committed' || m.status === 'pending'))) {
      const pending = pool.members.find((m) => m.isMe && m.status === 'pending');
      if (pending) {
        pending.qtyBase = input.qtyBase;
        pending.options = input.options;
        pending.needBy = input.needBy;
        return ok(pending.id);
      }
      return fail('You are already in this pool.');
    }
    const householdKey = asOther ? `hh-${uid('x')}` : d.me.household.key;
    const hhQty = pool.members.filter((m) => m.householdKey === householdKey && (m.status === 'committed' || m.status === 'pending')).reduce((a, m) => a + m.qtyBase, 0);
    const err = validateQty(pool, input.qtyBase, hhQty, (b) => qtyLabel(b, uom));
    if (err) return fail(err);
    const addr = d.me.addresses.find((a) => a.id === input.addressId) ?? d.me.addresses.find((a) => a.isDefault)!;
    const m: Member = {
      id: uid('m'),
      isMe: !asOther,
      name: input.asName ?? 'Ananya R.',
      pincode: addr.pincode,
      area: addr.line2.split(',').pop()!.trim(),
      householdKey,
      payerKey: asOther ? `py-${uid('x')}` : 'py-me',
      deviceKey: asOther ? 'dv-whatsapp' : 'dv-me',
      qtyBase: input.qtyBase,
      options: input.options,
      needBy: input.needBy,
      joinedAt: t,
      status: 'pending',
      bookingPaise: pool.bookingPaise,
      channel: input.channel ?? 'app',
    };
    pool.members.push(m);
    return ok(m.id);
  });
}

export function payBooking(memberId: string, method: string): Result<string> {
  if (state.demo.failNextPayment) {
    mutate((d) => {
      d.demo.failNextPayment = false;
      return ok(undefined);
    });
    return fail('Your bank declined this payment (simulated failure). No money was taken. Try again or use another method.');
  }
  return mutate((d, t) => {
    const found = memberBy(d, memberId);
    if (!found) return fail('Booking not found.');
    const { pool, member } = found;
    if (pool.state !== 'open' || t >= pool.closesAt) return fail('The pool closed before your payment completed. Nothing was charged.');
    if (member.status === 'committed') return ok(member.bookingRef!);
    member.status = 'committed';
    member.bookingRef = simRef('pay');
    member.bookingMethod = method;
    member.bookingPaidAt = t;
    member.joinedAt = t;
    const committed = pool.members.filter((m) => m.status === 'committed').length;
    const product = productOf(d, pool.productId);
    audit(d, member.isMe ? 'Ananya R.' : member.name, 'Booking confirmed', `${inr(member.bookingPaise)} refundable booking · committed households now ${committed}`, pool.id);
    if (member.isMe) note(d, 'buyer', 'payment', `You're in: ${product.short}`, `Booking ${inr(member.bookingPaise)} confirmed (refundable). The pool closes ${fmtWhen(pool.closesAt, t)}; your personal offer comes after that.`, `/buyer/pool/${pool.id}`);
    return ok(member.bookingRef);
  });
}

export function discardPending(memberId: string) {
  return mutate((d) => {
    const f = memberBy(d, memberId);
    if (f && f.member.status === 'pending') {
      f.pool.members = f.pool.members.filter((m) => m.id !== memberId);
      // A pool the buyer just started but never paid for is withdrawn, not left empty on the map.
      if (f.pool.startedBy.isMe && f.pool.members.length === 0 && f.pool.bids.length === 0) d.pools = d.pools.filter((p) => p.id !== f.pool.id);
    }
    return ok(undefined);
  });
}

export interface StartInput extends JoinInput {
  productId: string;
  closesAt: number;
  areaLabel: string;
  pincodes: string[];
  deliverWithinDays: number;
}

export function startPool(input: StartInput): Result<{ poolId: string; memberId: string }> {
  const r = mutate((d, t) => {
    if (input.closesAt < t + INDIA.minPoolMinutes * MIN) return fail('Sellers need at least 1 hour to bid. Pick a later closing time.');
    if (input.closesAt > t + INDIA.maxPoolDays * DAY) return fail('A pool can stay open at most 30 days.');
    const product = productOf(d, input.productId);
    const existing = d.pools.find((p) => p.productId === input.productId && p.state === 'open' && p.areaLabel === input.areaLabel);
    if (existing) return fail(`There is already an open pool for this product in ${input.areaLabel}. Join it instead.`);
    const profileId = PROFILE_BY_ART[product.art] ?? 'home_delivery';
    const prof = profileOf(d, profileId);
    const invited = d.sellers.filter((s) => s.verified && s.categories.includes(product.category)).map((s) => s.id);
    const pool: Pool = {
      id: uid('pool'),
      no: `POOL-HYD-${product.art.toUpperCase().slice(0, 4)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      productId: product.id,
      areaLabel: input.areaLabel,
      areaKey: input.areaLabel.toLowerCase().replace(/[^a-z]+/g, '-'),
      pincodes: input.pincodes,
      track: 'open',
      startedBy: { name: 'Ananya R. (you)', at: t, isMe: true },
      createdAt: t,
      closesAt: input.closesAt,
      state: 'open',
      profileId,
      qtyRule: product.uom === 'kg' ? { minBase: 500, stepBase: 250, maxPerBuyerBase: 3000 } : { minBase: 1, stepBase: 1, maxPerHouseholdBase: product.category === 'groceries' ? 4 : 2 },
      bookingPaise: rs(BOOKING_BY_CATEGORY[product.category] ?? 500),
      checkoutPlans: prof.modes.includes('store_pickup') ? ['prepay'] : ['prepay', 'door', 'emi'],
      requirements: { deliverWithinDays: input.deliverWithinDays, modes: prof.modes.slice(0, 1), terms: [] },
      waveCountMode: product.uom === 'kg' ? 'per_order' : 'per_uom',
      members: [],
      bids: [],
      invitedSellers: invited,
      blocked: {},
      prices: {},
    };
    d.pools.unshift(pool);
    audit(d, 'Ananya R.', 'Pool started', `Close time chosen by the starter: ${fmtDayTime(input.closesAt)} (logged, cannot be moved earlier)`, pool.id);
    for (const sid of invited) if (sid === d.sellerMeId) note(d, 'seller', 'bid', `New demand: ${product.short}`, `A buyer in ${input.areaLabel} started a pool. It closes ${fmtWhen(input.closesAt, t)}.`, `/seller/demand/${pool.id}`);
    return ok(pool.id);
  });
  if (!r.ok) return r;
  const j = joinPool(r.value, input);
  if (!j.ok) return j;
  return { ok: true, value: { poolId: r.value, memberId: j.value } };
}

export function leavePool(memberId: string) {
  return mutate((d, t) => {
    const f = memberBy(d, memberId);
    if (!f) return fail('Not found.');
    if (f.pool.state !== 'open' || t >= f.pool.closesAt) return fail('The pool has closed; you can walk away from your offer instead.');
    if (f.member.status !== 'committed' && f.member.status !== 'pending') return fail('You are not active in this pool.');
    const wasPaid = f.member.status === 'committed';
    f.member.status = 'left';
    f.member.refundAt = t;
    audit(d, 'Ananya R.', 'Left pool', `Booking ${inr(f.member.bookingPaise)} refunded`, f.pool.id);
    if (wasPaid) note(d, 'buyer', 'refund', 'You left the pool — booking refunded', `${inr(f.member.bookingPaise)} is on its way back to ${f.member.bookingMethod ?? 'your payment method'}.`, '/buyer/money');
    return ok(undefined);
  });
}

export function optInExtension(poolId: string) {
  return mutate((d) => {
    const p = poolBy(d, poolId);
    if (!p) return fail('Not found');
    p.extensionOptIns = [...new Set([...(p.extensionOptIns ?? []), 'me'])];
    return ok(undefined);
  });
}

// =====================================================================================
// Buyer: offer, payment, order
// =====================================================================================
export function decideOffer(memberId: string, decision: 'accept' | 'walk', plan: Order['plan'] = 'prepay', opts: { addressId?: string; slotId?: string; emiMonths?: number } = {}): Result<string | undefined> {
  return mutate((d, t) => {
    const f = memberBy(d, memberId);
    if (!f) return fail('Offer not found.');
    const { pool, member } = f;
    if (pool.state !== 'offers' || !pool.acceptBy) return fail('This offer is no longer open.');
    if (t > pool.acceptBy) return fail('The decide window has ended. Your booking is being refunded.');
    if (member.status !== 'offered') return fail('You have already decided on this offer.');
    const product = productOf(d, pool.productId);
    if (decision === 'walk') {
      member.status = 'walked_away';
      member.decidedAt = t;
      member.refundAt = t;
      audit(d, member.name, 'Walked away', `Booking ${inr(member.bookingPaise)} refunded in full`, pool.id);
      note(d, 'buyer', 'refund', 'You walked away — full refund', `${inr(member.bookingPaise)} booking for ${product.short} is on its way back to you.`, '/buyer/money');
      return ok(undefined);
    }
    const a = pool.award!.assignments.find((x) => x.memberId === member.id)!;
    const bid = pool.bids.find((b) => b.id === a.bidId)!;
    const price = pool.prices[bid.id];
    const uom = uomOf(product.uom);
    const prof = profileOf(d, pool.profileId);
    const buyerTotal = lineTotal(price.buyerPricePaise, member.qtyBase, uom);
    const sellerTotal = lineTotal(bid.pricePaise, member.qtyBase, uom);
    const addr = d.me.addresses.find((x) => x.id === opts.addressId) ?? d.me.addresses.find((x) => x.isDefault)!;
    const slot = pool.pickup?.slots.find((s) => s.id === opts.slotId);
    if (prof.modes.includes('store_pickup') && !slot) return fail('Pick a pickup slot.');
    if (slot) {
      if (slot.booked >= slot.capacity) return fail('That slot just filled up. Pick another.');
      slot.booked += 1;
    }
    member.status = 'accepted';
    member.decidedAt = t;
    const isDoor = plan === 'door';
    const o: Order = {
      id: uid('o'),
      no: `PO-${Math.floor(100000 + Math.random() * 899999)}`,
      poolId: pool.id,
      memberId: member.id,
      isMe: member.isMe,
      buyerName: member.name,
      buyerPhoneMasked: '+91 98480 •••21',
      address: slot ? `Pickup: ${pool.pickup!.address}` : `${addr.line1}, ${addr.line2}, ${addr.city} ${addr.pincode}`,
      pincode: addr.pincode,
      sellerId: bid.sellerId,
      productId: product.id,
      qtyBase: member.qtyBase,
      options: member.options,
      bidId: bid.id,
      buyerPricePaise: price.buyerPricePaise,
      sellerPricePaise: bid.pricePaise,
      buyerTotal,
      sellerTotal,
      bookingCredit: member.bookingPaise,
      plan,
      emiMonths: opts.emiMonths,
      paidPaise: member.bookingPaise,
      balanceDue: buyerTotal - member.bookingPaise,
      status: isDoor ? 'confirmed' : 'awaiting_payment',
      steps: [],
      promisedBy: bid.deliverBy,
      slot: slot ? { id: slot.id, label: slot.label } : undefined,
      code: { value: String(Math.floor(Math.random() * 10 ** prof.codeDigits)).padStart(prof.codeDigits, '0'), digits: prof.codeDigits, expiresAt: bid.deliverBy + DAY, attempts: 0, maxAttempts: 5 },
      checklist: {},
      holdsReleased: [],
      tickets: [],
      createdAt: t,
    };
    member.orderId = o.id;
    d.orders.unshift(o);
    audit(d, member.name, 'Offer accepted', `${o.no} · ${inr(buyerTotal)} · plan: ${plan}`, pool.id, o.id);
    note(d, 'seller', 'award', `New order ${o.no}`, `${member.name} accepted ${qtyLabel(member.qtyBase, uom)} of ${product.short}. Buyer details are now visible.`, `/seller/order/${o.id}`);
    return ok(o.id);
  });
}

export function payOrder(orderId: string, method: string): Result<string> {
  if (state.demo.failNextPayment) {
    mutate((d) => {
      d.demo.failNextPayment = false;
      return ok(undefined);
    });
    return fail('Payment failed at your bank (simulated). No money was taken. Your offer is still held for you.');
  }
  return mutate((d, t) => {
    const o = orderBy(d, orderId);
    if (!o) return fail('Order not found.');
    if (o.balanceDue <= 0) return ok(o.payRef ?? '');
    const product = productOf(d, o.productId);
    const wasDoor = o.plan === 'door' && o.status === 'confirmed';
    o.paidPaise = o.buyerTotal;
    o.paidAt = t;
    const paidNow = o.balanceDue;
    o.balanceDue = 0;
    o.payMethod = method;
    o.payRef = simRef('pay');
    if (o.status === 'awaiting_payment') o.status = 'confirmed';
    audit(d, o.buyerName, wasDoor ? 'Paid at the door' : 'Order paid', `${inr(paidNow)} via ${method} · held by the payment company until the handover code`, o.poolId, o.id);
    if (o.isMe) note(d, 'buyer', 'payment', wasDoor ? 'Paid — your code is unlocked' : `Payment confirmed: ${product.short}`, wasDoor ? 'Show your code to the delivery person after checking the box.' : `${inr(paidNow)} is held by the payment company until you give your handover code.`, `/buyer/order/${o.id}`);
    return ok(o.payRef);
  });
}

export function setChecklist(orderId: string, key: string, value: boolean) {
  return mutate((d) => {
    const o = orderBy(d, orderId);
    if (!o) return fail('Not found');
    o.checklist[key] = value;
    return ok(undefined);
  });
}

export function cancelOrder(orderId: string): Result<number> {
  return mutate((d, t) => {
    const o = orderBy(d, orderId);
    if (!o) return fail('Order not found.');
    if (o.status !== 'awaiting_payment' && o.status !== 'confirmed') return fail('This order can no longer be cancelled. Report a problem instead.');
    const prof = profileOf(d, poolBy(d, o.poolId)!.profileId);
    const costApplies = prof.steps.some((s) => s.returnCostAppliesAfter && o.steps.some((x) => x.key === s.key));
    const charge = costApplies ? Math.min(prof.returnCostPaise, o.paidPaise) : 0;
    o.status = 'cancelled_by_buyer';
    o.cancelledAt = t;
    o.refundPaise = o.paidPaise - charge;
    audit(d, o.buyerName, 'Order cancelled by buyer', `Refund ${inr(o.refundPaise)}${charge ? ` (return cost ${inr(charge)} disclosed at offer)` : ' (free before dispatch)'}`, o.poolId, o.id);
    if (o.isMe) note(d, 'buyer', 'refund', 'Order cancelled', `${inr(o.refundPaise)} refund started to your original payment method.`, '/buyer/money');
    note(d, 'seller', 'issue', `Order ${o.no} cancelled by buyer`, charge ? `Return cost ${inr(charge)} charged to the buyer.` : 'Cancelled before dispatch — no charge.', `/seller/order/${o.id}`);
    return ok(o.refundPaise);
  });
}

export function raiseTicket(orderId: string, t0: { type: Ticket['type']; description: string; wants: Ticket['wants']; photos: number }): Result<string> {
  return mutate((d, t) => {
    const o = orderBy(d, orderId);
    if (!o) return fail('Order not found.');
    const ticket: Ticket = {
      id: uid('t'),
      no: `TKT-${Math.floor(21300 + Math.random() * 600)}`,
      orderId,
      isMe: o.isMe,
      buyerName: o.buyerName,
      sellerId: o.sellerId,
      type: t0.type,
      description: t0.description,
      photos: t0.photos,
      wants: t0.wants,
      status: 'open',
      createdAt: t,
      sellerDueBy: t + 24 * HOUR,
      ackBy: t + 48 * HOUR,
      messages: [{ from: 'buyer', text: t0.description, at: t }, { from: 'pool', text: `Ticket opened. ${sellerOf(d, o.sellerId).name} must reply by ${fmtWhen(t + 24 * HOUR, t)}. If they don't, POOL steps in — and if you're owed money, POOL refunds first and recovers it from the seller.`, at: t + 1000 }],
    };
    d.tickets.unshift(ticket);
    o.tickets.push(ticket.id);
    audit(d, o.buyerName, 'Issue reported', `${ticket.no}: ${t0.type}`, o.poolId, o.id);
    note(d, 'seller', 'issue', `New issue ${ticket.no}`, `${o.buyerName}: ${t0.description.slice(0, 80)}`, `/seller/order/${o.id}`);
    note(d, 'ops', 'issue', `New ticket ${ticket.no}`, `${o.buyerName} · ${productOf(d, o.productId).short} · wants ${t0.wants}`, '/ops/exceptions');
    if (o.isMe) note(d, 'buyer', 'issue', `We've opened ${ticket.no}`, 'The seller has 24 hours to reply. You can follow every step in the order page.', `/buyer/order/${o.id}`);
    return ok(ticket.id);
  });
}

export function deferInstallation(orderId: string, until: number) {
  return mutate((d) => {
    const o = orderBy(d, orderId);
    if (!o?.handedOverAt) return fail('Installation can be postponed only after delivery.');
    if (until > o.handedOverAt + 45 * DAY) return fail('Installation can wait at most 45 days after delivery.');
    o.holdDeferredUntil = until;
    audit(d, o.buyerName, 'Installation postponed', `Until ${fmtDayTime(until)} (installation hold waits with it)`, o.poolId, o.id);
    return ok(undefined);
  });
}

export function rateOrder(orderId: string, stars: number, text: string, photos: number) {
  return mutate((d, t) => {
    const o = orderBy(d, orderId);
    if (!o) return fail('Not found');
    if (o.status !== 'handed_over' && o.status !== 'settled') return fail('You can rate after a completed delivery.');
    o.rating = { stars, text, at: t, photos };
    return ok(undefined);
  });
}

// =====================================================================================
// Seller
// =====================================================================================
export interface BidInput {
  pricePaise: number;
  capacityBase: number;
  deliverBy: number;
  modes: string[];
  terms: Bid['terms'];
  optionsCovered: string[];
  slabs: Slab[];
  channel?: Bid['channel'];
}

export function submitBid(poolId: string, input: BidInput, sellerId = state.sellerMeId): Result<string> {
  return mutate((d, t) => {
    const pool = poolBy(d, poolId);
    if (!pool) return fail('Pool not found.');
    if (pool.state !== 'open' || t >= pool.closesAt) return fail('Bids are not accepted after the pool closes.');
    if (input.pricePaise <= 0) return fail('Enter your price.');
    if (input.capacityBase <= 0) return fail('Capacity must be at least 1.');
    if (!input.modes.length) return fail('Offer at least one delivery mode.');
    const cap = Math.floor((input.pricePaise * INDIA.maxSlabBpsOfPrice) / 10_000);
    let prev = 0;
    for (const s of input.slabs) {
      if (s.fromUnit <= prev) return fail('Wave Drop slabs must start at increasing unit numbers.');
      if (s.perUnitPaise > cap) return fail(`Each Wave Drop slab can be at most ${inr(cap)} (10% of your price).`);
      prev = s.fromUnit;
    }
    if (holdPerUnit(input.slabs) >= input.pricePaise) return fail('The Wave Drop hold cannot reach your price.');
    const existing = pool.bids.filter((b) => b.sellerId === sellerId).sort((a, b) => b.revision - a.revision)[0];
    const seller = sellerOf(d, sellerId);
    if (existing) {
      if (input.pricePaise > existing.pricePaise) return fail(`A bid can only be lowered before close. Your current bid is ${inr(existing.pricePaise)}.`);
      Object.assign(existing, { ...input, revision: existing.revision + 1, submittedAt: t, validUntil: Math.max(existing.validUntil, pool.closesAt + INDIA.acceptWindowHours * HOUR + 7 * DAY) });
      existing.history.push({ revision: existing.revision, pricePaise: input.pricePaise, at: t });
      audit(d, seller.name, 'Sealed bid revised', `Revision ${existing.revision} (price hidden until close)`, pool.id);
      return ok(existing.id);
    }
    const bid: Bid = {
      id: `b-${pool.id.replace('pool-', '')}-${sellerId.replace('s-', '')}`,
      poolId,
      sellerId,
      revision: 1,
      ...input,
      validUntil: pool.closesAt + INDIA.acceptWindowHours * HOUR + 7 * DAY,
      submittedAt: t,
      history: [{ revision: 1, pricePaise: input.pricePaise, at: t }],
      accessLog: [],
    };
    pool.bids.push(bid);
    audit(d, seller.name, 'Sealed bid received', 'Price hidden from everyone until close; every view is logged', pool.id);
    note(d, 'seller', 'bid', 'Bid sealed', `Your bid for ${productOf(d, pool.productId).short} is locked until ${fmtWhen(pool.closesAt, t)}. You can lower it until then, never raise it.`, `/seller/bids`);
    return ok(bid.id);
  });
}

function stepDone(o: Order, key: string) {
  return o.steps.some((s) => s.key === key);
}

export function sellerStep(orderId: string, key: string, proof?: string): Result<undefined> {
  return mutate((d, t) => {
    const o = orderBy(d, orderId);
    if (!o) return fail('Order not found.');
    const pool = poolBy(d, o.poolId)!;
    const prof = profileOf(d, pool.profileId);
    const step = prof.steps.find((s) => s.key === key);
    if (!step) return fail('Unknown step.');
    if (stepDone(o, key)) return fail('Already done.');
    if (o.status === 'awaiting_payment') return fail('Wait for the buyer to pay.');
    if (!step.afterHandover) {
      if (o.status !== 'confirmed') return fail(`Order is ${o.status.replace(/_/g, ' ')}.`);
      const before = prof.steps.filter((s) => !s.afterHandover);
      const pending = before.slice(0, before.findIndex((s) => s.key === key)).find((s) => !stepDone(o, s.key));
      if (pending) return fail(`Complete “${pending.label}” first.`);
    } else if (o.status !== 'handed_over') return fail('This step comes after handover.');
    if (step.proof !== 'Confirmation' && step.proof !== 'Confirmation with time slot' && !proof?.trim()) return fail(`Add proof: ${step.proof.toLowerCase()}.`);
    const seller = sellerOf(d, o.sellerId);
    o.steps.push({ key, at: t, by: seller.name, proof });
    const product = productOf(d, o.productId);
    if (key === 'dispatched') {
      o.code.expiresAt = Math.max(o.code.expiresAt, atIST(t, 0, 23, 59));
      o.tracking = { partner: `${seller.name} (own delivery)`, awb: `${seller.id.slice(2, 5).toUpperCase()}-${Math.floor(1000 + Math.random() * 8999)}`, rider: seller.team.find((x) => x.role === 'Delivery')?.name ?? 'Delivery partner', etaText: `Today, ${fmtDayTime(t + 3 * HOUR).split(', ')[1]}`, events: [{ at: t, text: 'Dispatched (photo attached)' }] };
      if (o.isMe) note(d, 'buyer', 'code', `${product.short} is out for delivery`, `${o.balanceDue > 0 ? `Pay ${inr(o.balanceDue)} at the door, then` : 'Check the box, then'} give your ${o.code.digits}-digit code. POOL will never ask you for it.`, `/buyer/order/${o.id}`);
    }
    if (key === 'ready_for_pickup' && o.isMe) note(d, 'buyer', 'code', 'Ready for pickup', `Your order is packed. Go in your slot (${o.slot?.label ?? ''}) and give your 4-digit code at the counter.`, `/buyer/order/${o.id}`);
    if (key === 'seller_confirmed' && o.isMe) note(d, 'buyer', 'delivery', 'Seller confirmed your order', `${seller.name} will deliver by ${fmtWhen(o.promisedBy, t)}.`, `/buyer/order/${o.id}`);
    if (step.releasesHold && !o.holdsReleased.some((h) => h.key === step.releasesHold)) {
      o.holdsReleased.push({ key: step.releasesHold, at: t, reason: `${step.label} (${step.proof.toLowerCase()})` });
      note(d, 'seller', 'payout', 'Installation hold released', `${o.no}: ${step.proof} recorded. The held amount is on its way to your bank.`, '/seller/payouts');
      if (o.isMe) note(d, 'buyer', 'delivery', 'Installation done', `Job ${proof} is saved in your Warranty Locker.`, `/buyer/order/${o.id}`);
      if (key === 'installed') o.installJob = proof;
    }
    audit(d, seller.name, step.label, `${o.no}${proof ? ` · proof: ${proof}` : ''}`, o.poolId, o.id);
    return ok(undefined);
  });
}

export function confirmAllForPool(poolId: string, sellerId = state.sellerMeId) {
  let count = 0;
  for (const o of state.orders.filter((x) => x.poolId === poolId && x.sellerId === sellerId && x.status === 'confirmed' && !x.steps.some((s) => s.key === 'seller_confirmed'))) {
    const r = sellerStep(o.id, 'seller_confirmed');
    if (r.ok) count++;
  }
  return count;
}

export type VerifyError = 'NOT_DISPATCHED' | 'BALANCE_DUE' | 'ALREADY_USED' | 'EXPIRED' | 'LOCKED' | 'CHECKLIST_INCOMPLETE' | 'WRONG_CODE';

export function verifyHandoverCode(orderId: string, entered: string, serial?: string): Result<{ release: number }> | { ok: false; error: string; code: VerifyError; attemptsLeft?: number } {
  const o0 = state.orders.find((x) => x.id === orderId);
  if (!o0) return fail('Order not found.');
  const pool0 = state.pools.find((p) => p.id === o0.poolId)!;
  const prof = state.profiles.find((p) => p.id === pool0.profileId)!;
  const t = now();
  const pending = prof.steps.filter((s) => !s.afterHandover).find((s) => !o0.steps.some((x) => x.key === s.key));
  if (o0.status !== 'confirmed' || pending) return { ok: false, code: 'NOT_DISPATCHED', error: pending ? `Complete “${pending.label}” first.` : 'This order is not ready for handover.' };
  if (o0.balanceDue > 0) return { ok: false, code: 'BALANCE_DUE', error: `The buyer still has ${inr(o0.balanceDue)} to pay. Ask them to pay in the POOL app (UPI or card) — the code unlocks after that. Never accept cash.` };
  if (o0.code.usedAt) return { ok: false, code: 'ALREADY_USED', error: 'This code was already used.' };
  if (t > o0.code.expiresAt) return { ok: false, code: 'EXPIRED', error: 'This code has expired. The buyer gets a fresh one on the next delivery day.' };
  if (o0.code.attempts >= o0.code.maxAttempts) return { ok: false, code: 'LOCKED', error: 'Too many wrong tries. The code is locked; POOL support will call the buyer.' };
  const incomplete = prof.checklist.filter((c) => !o0.checklist[c.key]);
  if (incomplete.length) return { ok: false, code: 'CHECKLIST_INCOMPLETE', error: `The buyer hasn't finished the open-box check in their app (${incomplete.map((c) => c.label.toLowerCase()).join(', ')}).` };
  if (entered.trim() !== o0.code.value) {
    mutate((d) => {
      orderBy(d, orderId)!.code.attempts += 1;
      return ok(undefined);
    });
    const left = o0.code.maxAttempts - o0.code.attempts - 1;
    return { ok: false, code: 'WRONG_CODE', error: `That code doesn't match. ${left} ${left === 1 ? 'try' : 'tries'} left.`, attemptsLeft: left };
  }
  return mutate((d) => {
    const o = orderBy(d, orderId)!;
    const seller = sellerOf(d, o.sellerId);
    const product = productOf(d, o.productId);
    o.status = 'handed_over';
    o.handedOverAt = t;
    o.code.usedAt = t;
    o.steps.push({ key: 'handover', at: t, by: o.buyerName, proof: 'code verified' });
    o.serial = serial?.trim() || o.serial || `${product.model ?? 'SN'}-${Math.floor(10000000 + Math.random() * 89999999)}`;
    o.invoiceNo = `INV/${seller.id.slice(2, 5).toUpperCase()}/26-27/${Math.floor(1000 + Math.random() * 8999)}`;
    if (t > o.promisedBy && prof.lateCreditPaise > 0) o.lateCreditPaise = prof.lateCreditPaise;
    const s = sellerSplit(d, o);
    audit(d, seller.name, 'Handover code verified', `${o.no} · ${inr(s.releaseOnHandover)} released to seller${o.lateCreditPaise ? ` · late credit ${inr(o.lateCreditPaise)} to buyer` : ''}`, o.poolId, o.id);
    note(d, 'seller', 'payout', `Code verified · ${inr(s.releaseOnHandover)} released`, `${o.no}: settlement to your bank in 2 working days.${s.holds.length ? ' Installation hold is released when the job number is added.' : ''}`, `/seller/payouts`);
    if (o.isMe) note(d, 'buyer', 'delivery', `Delivered: ${product.short}`, `${prof.returnWindowDays}-day replacement window is open. Invoice and serial are in your Warranty Locker.${o.lateCreditPaise ? ` A late credit of ${inr(o.lateCreditPaise)} is on its way.` : ''}`, `/buyer/order/${o.id}`);
    return ok({ release: s.releaseOnHandover });
  });
}

export function replyTicket(ticketId: string, from: 'seller' | 'pool' | 'buyer', text: string) {
  return mutate((d, t) => {
    const tk = d.tickets.find((x) => x.id === ticketId);
    if (!tk) return fail('Not found');
    tk.messages.push({ from, text, at: t });
    if (from === 'seller' && tk.status === 'open') tk.status = 'seller_replied';
    if (from === 'pool') tk.status = tk.status === 'resolved' ? 'resolved' : 'pool_reviewing';
    const o = orderBy(d, tk.orderId);
    if (o?.isMe && from !== 'buyer') note(d, 'buyer', 'issue', `Update on ${tk.no}`, text.slice(0, 120), `/buyer/order/${o.id}`);
    return ok(undefined);
  });
}

// =====================================================================================
// POOL team
// =====================================================================================
export function reviewApplication(appId: string, decision: 'approved' | 'changes_requested' | 'rejected', noteText: string) {
  return mutate((d, t) => {
    const a = d.applications.find((x) => x.id === appId);
    if (!a) return fail('Not found');
    a.status = decision;
    a.note = noteText;
    a.decidedAt = t;
    if (decision === 'approved') {
      d.sellers.push({ id: `s-${appId}`, name: a.business, owner: a.owner, kind: a.kind, area: a.city, city: a.city, stateCode: a.stateCode, state: a.stateCode === '37' ? 'Andhra Pradesh' : 'Telangana', pan: a.pan, gstin: a.gstin, categories: a.categories, verified: true, ratingCount: 0, settledOrders: 0, onTimeBps: 0, cancelBps: 0, issuesResolvedBps: 0, since: 'Oct 2026', returnTerms: 'Brand replacement policy', depositPaise: rs(50000), bank: { name: a.bankName, ifsc: a.ifsc, last4: '0000' }, pincodes: a.pincodes, phoneMasked: '+91 9•••• •••••', hours: '10 AM – 8 PM', team: [] });
    }
    audit(d, d.opsUser.name, `Seller application ${decision.replace('_', ' ')}`, `${a.business}: ${noteText}`);
    return ok(undefined);
  });
}

export function setBidBlocked(poolId: string, bidId: string, reason: string | null) {
  return mutate((d, t) => {
    const p = poolBy(d, poolId);
    if (!p) return fail('Not found');
    if (reason) p.blocked[bidId] = reason;
    else delete p.blocked[bidId];
    if (p.state === 'closed') p.award = computeAward(p, d.sellers, t);
    const b = p.bids.find((x) => x.id === bidId);
    b?.accessLog.push({ who: d.opsUser.name, role: 'POOL team · awards', at: t, why: reason ? `Held back: ${reason}` : 'Allowed after check' });
    audit(d, d.opsUser.name, reason ? 'Bid held back' : 'Bid allowed', `${b ? sellerOf(d, b.sellerId).name : bidId}${reason ? `: ${reason}` : ''}`, poolId);
    return ok(undefined);
  });
}

export function logBidView(poolId: string, why: string) {
  return mutate((d, t) => {
    const p = poolBy(d, poolId);
    if (!p) return fail('Not found');
    for (const b of p.bids) b.accessLog.push({ who: d.opsUser.name, role: 'POOL team', at: t, why });
    return ok(undefined);
  });
}

export function confirmAward(poolId: string) {
  return mutate((d, t) => {
    const p = poolBy(d, poolId);
    if (!p || p.state !== 'closed' || !p.award) return fail('Nothing to confirm.');
    p.award = computeAward(p, d.sellers, t);
    p.award.confirmedAt = t;
    p.award.confirmedBy = d.opsUser.name;
    p.state = 'pricing';
    p.pricingDeadline = p.pricingDeadline ?? t + INDIA.pricingWindowHours * HOUR;
    audit(d, d.opsUser.name, 'Award confirmed', `${p.award.assignments.length} households assigned to ${new Set(p.award.assignments.map((a) => a.sellerId)).size} seller(s); ${p.award.unserved.length} unserved`, p.id);
    return ok(undefined);
  });
}

export function setBuyerPrice(poolId: string, bidId: string, buyerPricePaise: number, noteText?: string) {
  return mutate((d, t) => {
    const p = poolBy(d, poolId);
    if (!p) return fail('Not found');
    const bid = p.bids.find((b) => b.id === bidId);
    if (!bid) return fail('Bid not found');
    if (buyerPricePaise <= 0) return fail('Enter a price.');
    if (buyerPricePaise < bid.pricePaise) return fail(`Below the seller's price (${inr(bid.pricePaise)}). POOL-funded discounts are switched off.`);
    p.prices[bidId] = { bidId, buyerPricePaise, decidedBy: d.opsUser.name, decidedAt: t, note: noteText };
    audit(d, d.opsUser.name, 'Buyer price set', `${sellerOf(d, bid.sellerId).name}: ${inr(buyerPricePaise)} per ${productOf(d, p.productId).uom} (seller ${inr(bid.pricePaise)}, margin ${inr(buyerPricePaise - bid.pricePaise)})`, p.id);
    return ok(undefined);
  });
}

export function publishOffers(poolId: string) {
  return mutate((d, t) => {
    const p = poolBy(d, poolId);
    if (!p || p.state !== 'pricing' || !p.award) return fail('Confirm the award first.');
    const needed = [...new Set(p.award.assignments.map((a) => a.bidId))];
    const missing = needed.filter((b) => !p.prices[b]);
    if (missing.length) return fail(`Set a buyer price for every winning bid (${missing.length} missing).`);
    const assigned = new Set(p.award.assignments.map((a) => a.memberId));
    const product = productOf(d, p.productId);
    for (const m of p.members) {
      if (m.status !== 'committed') continue;
      if (assigned.has(m.id)) m.status = 'offered';
      else {
        m.status = 'unserved';
        m.refundAt = t;
        if (m.isMe) note(d, 'buyer', 'refund', `No offer for you in the ${product.short} pool`, `Sellers ran out of capacity or could not meet your need-by date. ${inr(m.bookingPaise)} refunded in full.`, '/buyer/money');
      }
    }
    if (assigned.size === 0) {
      p.state = 'no_deal';
      p.noDealReason = 'No eligible seller could serve this pool.';
      return ok(undefined);
    }
    p.state = 'offers';
    p.offersAt = t;
    p.acceptBy = t + INDIA.acceptWindowHours * HOUR;
    audit(d, d.opsUser.name, 'Offers published', `${assigned.size} personal offers · decide by ${fmtDayTime(p.acceptBy)}`, p.id);
    const mine = p.members.find((m) => m.isMe && m.status === 'offered');
    if (mine) note(d, 'buyer', 'offer', `Your ${product.short} offer is ready`, `Your personal, guaranteed price is in. Accept or walk away by ${fmtWhen(p.acceptBy, t)} — no reply means a full refund.`, `/buyer/offer/${mine.id}`);
    for (const sid of new Set(p.award.assignments.map((a) => a.sellerId))) {
      const n = p.award.assignments.filter((a) => a.sellerId === sid).length;
      if (sid === d.sellerMeId) note(d, 'seller', 'award', `You won ${n} households`, `${product.short}: offers are out. Orders arrive as buyers accept (decide window ends ${fmtWhen(p.acceptBy, t)}).`, '/seller/bids');
    }
    return ok(undefined);
  });
}

export function resolveTicket(ticketId: string, kind: NonNullable<Ticket['resolution']>['kind'], amountPaise?: number, message?: string) {
  return mutate((d, t) => {
    const tk = d.tickets.find((x) => x.id === ticketId);
    if (!tk) return fail('Not found');
    const o = orderBy(d, tk.orderId)!;
    tk.status = 'resolved';
    tk.resolution = { kind, amountPaise, at: t, by: d.opsUser.name };
    tk.messages.push({ from: 'pool', text: message ?? `Resolved: ${kind.replace('_', ' ')}${amountPaise ? ` · ${inr(amountPaise)} refunded to the original payment method` : ''}.`, at: t });
    if (kind === 'refund') {
      o.refundPaise = o.paidPaise;
      if (o.status === 'handed_over') {
        o.status = 'returned';
        o.returnedAt = t;
      } else {
        o.status = 'cancelled_by_seller';
        o.cancelledAt = t;
      }
    }
    if (kind === 'partial_refund' && amountPaise) o.refundPaise = (o.refundPaise ?? 0) + amountPaise;
    audit(d, d.opsUser.name, 'Ticket resolved', `${tk.no}: ${kind}${amountPaise ? ` ${inr(amountPaise)}` : ''}`, o.poolId, o.id);
    if (o.isMe) note(d, 'buyer', 'issue', `${tk.no} resolved`, tk.messages[tk.messages.length - 1].text, `/buyer/order/${o.id}`);
    return ok(undefined);
  });
}

/** Seller default: move late orders to the backup seller at the SAME buyer price; the gap is charged to the defaulting seller. */
export function reassignLateOrders(poolId: string) {
  return mutate((d, t) => {
    const p = poolBy(d, poolId);
    if (!p?.award) return fail('Not found');
    const late = d.orders.filter((o) => o.poolId === poolId && o.status === 'confirmed' && o.promisedBy < t && !o.backupFromSellerId);
    if (!late.length) return fail('No late orders to move.');
    let gapTotal = 0;
    for (const o of late) {
      const a = p.award.assignments.find((x) => x.memberId === o.memberId);
      const backup = p.bids.find((b) => b.id === a?.backupBidId) ?? p.bids.find((b) => b.sellerId !== o.sellerId);
      if (!backup) continue;
      const uom = uomOf(productOf(d, p.productId).uom);
      const newSellerTotal = lineTotal(backup.pricePaise, o.qtyBase, uom);
      gapTotal += Math.max(0, newSellerTotal - o.sellerTotal);
      o.backupFromSellerId = o.sellerId;
      o.sellerId = backup.sellerId;
      o.bidId = backup.id;
      o.sellerPricePaise = backup.pricePaise;
      o.sellerTotal = newSellerTotal;
      o.promisedBy = t + 2 * DAY;
      o.lateCreditPaise = profileOf(d, p.profileId).lateCreditPaise;
      o.steps = [{ key: 'seller_confirmed', at: t, by: sellerOf(d, backup.sellerId).name }];
    }
    for (const tk of d.tickets.filter((x) => late.some((o) => o.id === x.orderId) && x.status !== 'resolved')) {
      tk.messages.push({ from: 'pool', text: 'Moved to the backup seller at the same price. New delivery date within 2 days; late credit of ₹200 will be paid.', at: t });
      tk.status = 'resolved';
      tk.resolution = { kind: 'replacement', at: t, by: d.opsUser.name };
    }
    audit(d, d.opsUser.name, 'Seller default handled', `${late.length} orders moved to backup at the same buyer price · gap ${inr(gapTotal)} charged to the defaulting seller's deposit`, poolId);
    return ok(late.length);
  });
}

export function setSignal(id: string, status: State['signals'][number]['status'], noteText?: string) {
  return mutate((d) => {
    const s = d.signals.find((x) => x.id === id);
    if (!s) return fail('Not found');
    s.status = status;
    if (noteText) s.note = noteText;
    audit(d, d.opsUser.name, 'Risk signal updated', `${s.title} → ${status}${noteText ? `: ${noteText}` : ''}`, s.poolId);
    return ok(undefined);
  });
}

// =====================================================================================
// Demo shortcuts that move ONE thing in time (labelled "demo" wherever they appear).
// =====================================================================================
export function demoClosePoolNow(poolId: string) {
  const r = mutate((d, t) => {
    const p = poolBy(d, poolId);
    if (!p || p.state !== 'open') return fail('Pool is not open.');
    p.closesAt = t - 1000;
    audit(d, 'Demo control', 'Pool closed early for the demo', 'In real use a pool closes only at the time its starter chose.', p.id);
    return ok(undefined);
  });
  tick();
  return r;
}
export function demoEndDecideWindow(poolId: string) {
  const r = mutate((d, t) => {
    const p = poolBy(d, poolId);
    if (!p || p.state !== 'offers') return fail('No open offers.');
    p.acceptBy = t - 1000;
    audit(d, 'Demo control', 'Decide window ended early for the demo', 'Unanswered offers are treated as walking away, with full refunds.', p.id);
    return ok(undefined);
  });
  tick();
  return r;
}
export function demoSkipReturnWindow(orderId: string) {
  const r = mutate((d, t) => {
    const o = orderBy(d, orderId);
    if (!o || o.status !== 'handed_over' || !o.handedOverAt) return fail('Order is not in its return window.');
    const prof = profileOf(d, poolBy(d, o.poolId)!.profileId);
    o.handedOverAt = Math.min(o.handedOverAt, t - prof.returnWindowDays * DAY - 1000);
    audit(d, 'Demo control', 'Return window skipped for the demo', o.no, o.poolId, o.id);
    return ok(undefined);
  });
  tick();
  return r;
}
/** Simulate the other accepted buyers of a pool completing (so the walkthrough can reach the wave close). */
export function demoCompleteOthers(poolId: string) {
  const r = mutate((d, t) => {
    const p = poolBy(d, poolId);
    if (!p) return fail('Not found');
    const prof = profileOf(d, p.profileId);
    let n = 0;
    for (const o of d.orders.filter((x) => x.poolId === poolId && !x.isMe)) {
      if (o.status === 'awaiting_payment') {
        o.status = 'confirmed';
        o.paidPaise = o.buyerTotal;
        o.balanceDue = 0;
      }
      if (o.status === 'confirmed') {
        o.paidPaise = o.buyerTotal;
        o.balanceDue = 0;
        for (const st of prof.steps.filter((s) => !s.afterHandover)) if (!o.steps.some((x) => x.key === st.key)) o.steps.push({ key: st.key, at: t - 3 * HOUR, by: sellerOf(d, o.sellerId).name, proof: 'photo.jpg' });
        o.status = 'handed_over';
        o.handedOverAt = t - (prof.returnWindowDays + 1) * DAY;
        o.code.usedAt = o.handedOverAt;
        o.steps.push({ key: 'handover', at: o.handedOverAt, by: o.buyerName, proof: 'code verified' });
        for (const st of prof.steps.filter((s) => s.afterHandover)) {
          o.steps.push({ key: st.key, at: o.handedOverAt + 20 * HOUR, by: 'Brand service', proof: `JOB-${Math.floor(100000 + Math.random() * 899999)}` });
          if (st.releasesHold) o.holdsReleased.push({ key: st.releasesHold, at: o.handedOverAt + 20 * HOUR, reason: st.label });
        }
        n++;
      } else if (o.status === 'handed_over' && o.handedOverAt) {
        o.handedOverAt = Math.min(o.handedOverAt, t - (prof.returnWindowDays + 1) * DAY);
        n++;
      }
    }
    audit(d, 'Demo control', 'Other buyers’ deliveries completed for the demo', `${n} orders moved to delivered, past their return window`, poolId);
    return ok(n);
  });
  tick();
  return r;
}

// =====================================================================================
// Clock: closes pools, expires offers, releases holds, settles orders, closes waves.
// =====================================================================================
export function tick() {
  const t = now();
  const s = state;
  const needs =
    s.pools.some((p) => (p.state === 'open' && t >= p.closesAt) || ((p.state === 'closed' || p.state === 'pricing') && p.pricingDeadline && t > p.pricingDeadline) || (p.state === 'offers' && p.acceptBy && t > p.acceptBy)) ||
    s.orders.some((o) => o.status === 'handed_over') ||
    s.pools.some((p) => p.state === 'fulfilment');
  if (!needs) return;
  const d = structuredClone(s);
  let changed = false;
  for (const p of d.pools) {
    const product = productOf(d, p.productId);
    // 1. Close at the chosen time.
    if (p.state === 'open' && t >= p.closesAt) {
      changed = true;
      for (const m of p.members) if (m.status === 'pending') m.status = 'left';
      const committed = p.members.filter((m) => m.status === 'committed');
      p.closedAt = p.closesAt;
      if (!committed.length || !p.bids.length) {
        p.state = 'no_deal';
        p.noDealReason = !committed.length ? 'No committed buyers at close.' : 'No seller bid before close.';
        for (const m of committed) {
          m.status = 'no_deal';
          m.refundAt = t;
        }
        if (committed.some((m) => m.isMe)) note(d, 'buyer', 'refund', `No deal: ${product.short}`, `${p.noDealReason} Your booking is refunded in full.`, `/buyer/pool/${p.id}`);
        audit(d, 'System', 'Pool closed · no deal', p.noDealReason, p.id);
        continue;
      }
      p.state = 'closed';
      p.pricingDeadline = p.closesAt + INDIA.pricingWindowHours * HOUR;
      p.award = computeAward(p, d.sellers, t);
      audit(d, 'System', 'Pool closed at the chosen time', `${committed.length} committed households · ${p.bids.length} sealed bids opened · ${p.award.flagged.length} flagged`, p.id);
      if (committed.some((m) => m.isMe)) note(d, 'buyer', 'pool', `${product.short}: pool closed`, `${p.bids.length} sellers bid privately. The POOL team is setting your price — offers by ${fmtWhen(p.pricingDeadline, t)}.`, `/buyer/pool/${p.id}`);
      note(d, 'ops', 'award', `${product.short} pool closed — review the award`, `${committed.length} households · ${p.bids.length} bids · pricing deadline ${fmtWhen(p.pricingDeadline, t)}.`, `/ops/awards/${p.id}`);
      if (p.bids.some((b) => b.sellerId === d.sellerMeId)) note(d, 'seller', 'award', `${product.short}: pool closed`, 'Bids are now open to the POOL team (every view logged). You will see your rank when offers are published.', '/seller/bids');
    }
    // 2. Pricing deadline passed without offers → no deal, full refunds (CX A5).
    if ((p.state === 'closed' || p.state === 'pricing') && p.pricingDeadline && t > p.pricingDeadline) {
      changed = true;
      p.state = 'no_deal';
      p.noDealReason = 'The POOL team did not publish prices before the deadline.';
      for (const m of p.members) if (m.status === 'committed') {
        m.status = 'no_deal';
        m.refundAt = t;
        if (m.isMe) note(d, 'buyer', 'refund', `No deal: ${product.short}`, 'Prices were not ready in time, so every booking is refunded in full.', `/buyer/pool/${p.id}`);
      }
      audit(d, 'System', 'Pricing deadline passed', 'Pool moved to no deal; all bookings refunded', p.id);
    }
    // 3. Decide window over → no reply = walk away with a full refund (default B).
    if (p.state === 'offers' && p.acceptBy && t > p.acceptBy) {
      changed = true;
      let n = 0;
      for (const m of p.members) if (m.status === 'offered') {
        m.status = 'timed_out';
        m.decidedAt = p.acceptBy;
        m.refundAt = t;
        n++;
        if (m.isMe) note(d, 'buyer', 'refund', 'Offer expired — booking refunded', `You didn't decide on the ${product.short} offer in time, so we treated it as walking away. ${inr(m.bookingPaise)} refunded.`, '/buyer/money');
      }
      const hasOrders = d.orders.some((o) => o.poolId === p.id);
      p.state = hasOrders ? 'fulfilment' : 'completed';
      audit(d, 'System', 'Decide window ended', `${n} unanswered offers treated as walk away (refunded)`, p.id);
    }
  }
  // 4. Orders: release due holds, settle after the return window.
  for (const o of d.orders) {
    if (o.status !== 'handed_over' || !o.handedOverAt) continue;
    const pool = d.pools.find((p) => p.id === o.poolId)!;
    const prof = profileOf(d, pool.profileId);
    const openTicket = o.tickets.some((id) => d.tickets.find((x) => x.id === id && x.status !== 'resolved'));
    for (const h of prof.holds) {
      if (o.holdsReleased.some((x) => x.key === h.key)) continue;
      const due = o.holdDeferredUntil && h.deferredMaxDays ? Math.min(o.holdDeferredUntil, o.handedOverAt + h.deferredMaxDays * DAY) : o.handedOverAt + h.releaseAfterDays * DAY;
      if (t >= due && !openTicket) {
        o.holdsReleased.push({ key: h.key, at: t, reason: `${h.releaseAfterDays} days after delivery, no issue open` });
        changed = true;
      }
    }
    if (!openTicket && t >= o.handedOverAt + prof.returnWindowDays * DAY) {
      o.status = 'settled';
      o.settledAt = t;
      changed = true;
      if (o.isMe) note(d, 'buyer', 'wave', `${productOf(d, o.productId).short}: purchase completed`, 'Your return window has closed with no issues. This purchase now counts toward the Wave Drop.', `/buyer/order/${o.id}`);
    }
  }
  // 5. Wave close: when every order of a pool is final, pay the Wave Drop from the held slabs.
  for (const p of d.pools) {
    if (p.state !== 'fulfilment') continue;
    const os = d.orders.filter((o) => o.poolId === p.id);
    if (!os.length || os.some((o) => !['settled', 'cancelled_by_buyer', 'cancelled_by_seller', 'returned'].includes(o.status))) continue;
    changed = true;
    const product = productOf(d, p.productId);
    const uom = uomOf(product.uom);
    const perOrder: Record<string, number> = {};
    const releaseToSeller: Record<string, number> = {};
    let potTotal = 0;
    let settledUnits = 0;
    for (const bid of p.bids) {
      const mine = os.filter((o) => o.bidId === bid.id);
      if (!mine.length) continue;
      const w = closeWave(
        bid.slabs,
        mine.map((o) => ({ orderId: o.id, count: waveCount(o.qtyBase, uom, p.waveCountMode), outcome: o.status === 'settled' ? 'settled' : o.status === 'cancelled_by_seller' ? 'seller_cancelled' : o.status === 'returned' ? 'returned' : 'buyer_cancelled' })),
      );
      Object.assign(perOrder, w.refunds);
      releaseToSeller[bid.sellerId] = (releaseToSeller[bid.sellerId] ?? 0) + w.releaseToSeller;
      potTotal += w.pot;
      settledUnits += w.settledUnits;
    }
    p.wave = { closedAt: t, potPaise: potTotal, settledUnits, perOrder, releaseToSeller };
    p.state = 'completed';
    for (const o of os) if (perOrder[o.id] !== undefined) o.waveRefundPaise = perOrder[o.id];
    audit(d, 'System', 'Wave closed', `${settledUnits} settled units · Wave Drop pot ${inr(potTotal)} paid to buyers as partial refunds`, p.id);
    const myO = os.find((o) => o.isMe && o.waveRefundPaise);
    if (myO) note(d, 'buyer', 'wave', `Wave Drop: ${inr(myO.waveRefundPaise!)} back`, `${settledUnits} completed purchases filled the pot. Your share is on its way to your original payment method.`, `/buyer/order/${myO.id}`);
    if (releaseToSeller[d.sellerMeId] !== undefined) note(d, 'seller', 'payout', 'Wave closed · unused hold released', `${inr(releaseToSeller[d.sellerMeId])} released to you; ${inr(potTotal)} went back to buyers.`, '/seller/payouts');
  }
  if (changed) commit(d);
}

// =====================================================================================
// Derived money views (no separate ledger state: everything comes from members and orders).
// =====================================================================================
import { splitOrder as splitPure } from './engine';
export function sellerSplit(d: State, o: Order) {
  const pool = d.pools.find((p) => p.id === o.poolId)!;
  const product = productOf(d, o.productId);
  const bid = pool.bids.find((b) => b.id === o.bidId);
  const uom = uomOf(product.uom);
  const waveHold = (bid ? holdPerUnit(bid.slabs) : 0) * waveCount(o.qtyBase, uom, pool.waveCountMode);
  return splitPure({ buyerTotal: o.buyerTotal, sellerTotal: o.sellerTotal, gstBps: product.gstBps, profile: profileOf(d, pool.profileId), waveHold });
}

export { potFor };
