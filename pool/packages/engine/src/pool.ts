import { policyFor } from './policy.ts';
import { bookingAmount, refundBooking, applyBooking, type Booking, type BookingRule, type CheckoutPlan } from './booking.ts';
import { money, type Money } from './money.ts';
import { makeOffers, type Offer, type PriceDecision } from './pricing.ts';
import { type Assignment, type Bid } from './bids.ts';
import type { Policy, Region } from './policy.ts';
import { checkQuantity, type Quantity, type QuantityRule, validateQuantityRule, type WaveCountMode } from './uom.ts';

export class PoolError extends Error {
  override name = 'PoolError';
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

export type PoolState = 'OPEN' | 'CLOSED' | 'PRICING' | 'AWARDED' | 'NO_DEAL' | 'CANCELLED';

export type MemberStatus =
  | 'PENDING_BOOKING' // joined, booking not yet confirmed by the payment aggregator
  | 'COMMITTED' // booking confirmed — the only status sellers ever count
  | 'LEFT' // left before close; booking refunded
  | 'OFFERED' // pool awarded; this buyer has a guaranteed price to accept or walk away from
  | 'UNSERVED' // pool closed but no listable offer for this buyer; booking refunded
  | 'ACCEPTED'
  | 'WALKED_AWAY' // chose to walk away; booking refunded
  | 'TIMED_OUT'; // did not answer within the accept window: treated as walk away (default B); booking refunded

export interface Member {
  readonly memberId: string;
  readonly userId: string;
  /** Normalised delivery address + payer identity hash; one household = one key. */
  readonly householdKey: string;
  readonly payerKey: string;
  readonly qty: Quantity;
  readonly options: readonly string[];
  readonly needBy: number;
  readonly joinedAt: number;
  readonly status: MemberStatus;
  readonly extensionOptIn?: number;
  readonly booking?: Booking;
}

export interface Pool {
  readonly id: string;
  readonly region: Region;
  /** Category path as DATA, e.g. ["electronics","tv"] or ["food","meat","mutton"] or ["books","school"]. */
  readonly categoryPath: readonly string[];
  /** Canonical product id or grouping key the same seller can fulfil. */
  readonly productKey: string;
  readonly areaKey: string;
  /** Unit of measure, minimum, step and optional per-buyer / per-household caps — set per pool. */
  readonly quantityRule: QuantityRule;
  /** Fulfilment profile id (delivery / pickup / installation …) — data defined by the team. */
  readonly fulfilmentProfileId: string;
  /** How quantities count toward the Wave Drop for this pool. */
  readonly waveCountMode: WaveCountMode;
  readonly createdBy: string;
  readonly createdAt: number;
  /** Chosen by whoever started the pool. Never changed without every committed member opting in. */
  readonly closesAt: number;
  readonly state: PoolState;
  readonly members: readonly Member[];
  readonly acceptBy?: number;
  readonly bookingRule?: BookingRule;
  readonly checkoutPlan?: CheckoutPlan;
  readonly hsnCode?: string;
  readonly gstRateBps?: number;
  readonly acceptWindowMinutes?: number;
  readonly minimumPoolMinutes?: number;
  readonly pricingDeadline?: number;
  readonly assignments?: readonly Assignment[];
  readonly offers?: readonly Offer[];
}

export type PoolEvent =
  | { type: 'POOL_SNAPSHOT'; poolId: string; state: Pool; at: number }
  | { type: 'BOOKING_REFUND' | 'BOOKING_CAPTURE' | 'BOOKING_APPLIED'; poolId: string; memberId: string; amount: Money; idempotencyKey: string; at: number }
  | { type: 'BUYER_AUDIT'; poolId: string; field: 'PRICE' | 'COMMITTED_COUNT' | 'CLOSE_TIME'; shown: unknown; at: number }
  | { type: 'PRICING_STARTED'; poolId: string; at: number }
  | { type: 'POOL_CANCELLED'; poolId: string; at: number }

  | { type: 'POOL_CREATED'; poolId: string; closesAt: number; at: number }
  | { type: 'MEMBER_JOINED'; poolId: string; memberId: string; at: number }
  | { type: 'MEMBER_COMMITTED'; poolId: string; memberId: string; committedCount: number; at: number }
  | { type: 'MEMBER_LEFT'; poolId: string; memberId: string; refundBooking: true; at: number }
  | { type: 'CLOSE_EXTENDED'; poolId: string; from: number; to: number; optIns: number; at: number }
  | { type: 'POOL_CLOSED'; poolId: string; committedCount: number; at: number }
  | { type: 'POOL_AWARDED'; poolId: string; acceptBy: number; offered: number; unserved: number; at: number }
  | { type: 'POOL_NO_DEAL'; poolId: string; refunds: number; at: number }
  | { type: 'MEMBER_DECIDED'; poolId: string; memberId: string; decision: 'ACCEPTED' | 'WALKED_AWAY' | 'TIMED_OUT'; refundBooking: boolean; at: number };

export interface Result<T> {
  readonly value: T;
  readonly events: readonly PoolEvent[];
}

/** Key used to show a new buyer an existing open pool instead of starting a duplicate. */
export function poolMatchKey(region: Region, productKey: string, areaKey: string): string {
  return `${region}|${productKey.trim().toLowerCase()}|${areaKey.trim().toLowerCase()}`;
}

function createPoolCommand(
  policy: Policy,
  input: Omit<Pool, 'state' | 'members' | 'region' | 'acceptBy'>,
  now: number,
): Result<Pool> {
  if (input.createdAt !== now) throw new PoolError('CLOCK', 'createdAt must equal now');
  validateQuantityRule(input.quantityRule);
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(input.closesAt)) throw new PoolError('CLOCK', 'integer UTC times required');
  if (policy.region === 'IN' && (!input.bookingRule || !input.checkoutPlan || !input.hsnCode || !Number.isSafeInteger(input.gstRateBps))) throw new PoolError('CONFIG', 'India pool needs bookingRule, checkoutPlan, hsnCode and gstRateBps');
  if (input.checkoutPlan && !['PREPAY_FULL','BALANCE_AT_HANDOVER'].includes(input.checkoutPlan)) throw new PoolError('CONFIG', 'invalid checkout plan');
  const minimum = input.minimumPoolMinutes ?? policy.minPoolMinutes;
  const window = input.acceptWindowMinutes ?? policy.acceptWindowMinutes;
  if (!Number.isSafeInteger(minimum) || minimum < policy.minPoolMinutes || minimum > policy.maxPoolDays * 1440) throw new PoolError('LIMIT', 'minimum duration outside policy limits');
  if (!Number.isSafeInteger(window) || window < 1 || window > policy.acceptWindowMinutes) throw new PoolError('LIMIT', 'accept window outside policy limits');
  if (input.pricingDeadline !== undefined && (!Number.isSafeInteger(input.pricingDeadline) || input.pricingDeadline < input.closesAt)) throw new PoolError('LIMIT', 'pricing deadline before close');
  if (input.categoryPath.length === 0) throw new PoolError('CATEGORY', 'categoryPath is required');
  const minClose = now + minimum * 60_000;
  const maxClose = now + policy.maxPoolDays * 86_400_000;
  if (input.closesAt < minClose) throw new PoolError('CLOSE_TOO_SOON', `sellers need at least ${policy.minPoolMinutes} minutes to bid`);
  if (input.closesAt > maxClose) throw new PoolError('CLOSE_TOO_LATE', `a pool can stay open at most ${policy.maxPoolDays} days`);
  const pool: Pool = { ...input, region: policy.region, state: 'OPEN', members: [] };
  return { value: pool, events: [{ type: 'POOL_CREATED', poolId: pool.id, closesAt: pool.closesAt, at: now }] };
}

const active = (m: Member) => m.status === 'PENDING_BOOKING' || m.status === 'COMMITTED';

export function committedCount(pool: Pool): number {
  return pool.members.filter((m) => m.status === 'COMMITTED').length;
}

function requireOpen(pool: Pool, now: number): void {
  if (pool.state !== 'OPEN') throw new PoolError('NOT_OPEN', `pool is ${pool.state}`);
  if (now >= pool.closesAt) throw new PoolError('CLOSED', 'pool has reached its closing time');
}

function replaceMember(pool: Pool, memberId: string, patch: Partial<Member>): Pool {
  let found = false;
  const members = pool.members.map((m) => {
    if (m.memberId !== memberId) return m;
    found = true;
    return { ...m, ...patch };
  });
  if (!found) throw new PoolError('NO_MEMBER', `member ${memberId} not in pool`);
  return { ...pool, members };
}

function joinCommand(
  policy: Policy,
  pool: Pool,
  m: Omit<Member, 'status' | 'joinedAt' | 'booking'>,
  now: number,
  estimate?: Money,
): Result<Pool> {
  requireOpen(pool, now);
  checkQuantity(pool.quantityRule, m.qty);
  if (!Number.isSafeInteger(m.needBy) || m.needBy < pool.closesAt) throw new PoolError('NEED_BY', 'need-by precedes pool close');
  if (pool.members.some((x) => x.memberId === m.memberId)) throw new PoolError('DUPLICATE', 'member already joined');
  if (pool.members.some((x) => active(x) && x.userId === m.userId)) throw new PoolError('ALREADY_IN_POOL', 'this user already has an active place in the pool');
  // Caps apply only if the pool sets them. The same cap applies per payment account, so one payer
  // cannot spread many "households" to game volume.
  const cap = pool.quantityRule.maxPerHouseholdBase;
  if (cap !== undefined) {
    const label = pool.quantityRule.uom.baseLabel;
    const householdQty = pool.members.filter((x) => active(x) && x.householdKey === m.householdKey).reduce((n, x) => n + x.qty.base, 0);
    if (householdQty + m.qty.base > cap) throw new PoolError('HOUSEHOLD_CAP', `a household can have at most ${cap} ${label} in this pool`);
    const payerQty = pool.members.filter((x) => active(x) && x.payerKey === m.payerKey).reduce((n, x) => n + x.qty.base, 0);
    if (payerQty + m.qty.base > cap) throw new PoolError('PAYER_CAP', 'this payment account has reached the cap for this pool');
  }
  const due = bookingAmount(pool.bookingRule ?? { kind: 'FIXED', amountMinor: 0, minMinor: 0, maxMinor: 0 }, policy.currency, estimate);
  const member: Member = { ...m, status: 'PENDING_BOOKING', joinedAt: now, booking: { due, paid: money(policy.currency, 0), disposition: 'UNPAID' } };
  return {
    value: { ...pool, members: [...pool.members, member] },
    events: [{ type: 'MEMBER_JOINED', poolId: pool.id, memberId: m.memberId, at: now }],
  };
}

/** Called when the payment aggregator confirms the booking (webhook). Only then does the member count. */
function confirmBookingCommand(pool: Pool, memberId: string, now: number, receipt?: { amount: Money; paymentRef: string; paidAt: number }): Result<Pool> {
  const m = pool.members.find((x) => x.memberId === memberId);
  if (!m) throw new PoolError('NO_MEMBER', 'unknown member');
  if (m.status === 'COMMITTED') return { value: pool, events: [] }; // idempotent webhook replay
  if (m.status !== 'PENDING_BOOKING') throw new PoolError('BAD_STATE', `cannot confirm booking in status ${m.status}`);
  // A booking confirmed after close still counts only if it was paid before close; the caller passes paidAt as now.
  if (now >= pool.closesAt) throw new PoolError('CLOSED', 'booking confirmed after close — refund instead');
  if (pool.state !== 'OPEN') throw new PoolError('CLOSED', 'cannot confirm after pool closes');
  if (pool.region === 'IN' && (!receipt || !receipt.paymentRef.trim() || receipt.amount.currency !== m.booking?.due.currency || receipt.amount.minor !== m.booking?.due.minor || receipt.paidAt > now || receipt.paidAt >= pool.closesAt)) throw new PoolError('PAYMENT', 'confirmed PA receipt must match booking');
  const next = replaceMember(pool, memberId, { status: 'COMMITTED', booking: { ...m.booking!, paid: receipt?.amount ?? m.booking!.due, disposition: 'HELD', ...(receipt ? { paymentRef: receipt.paymentRef } : {}) } });
  return { value: next, events: [{ type: 'MEMBER_COMMITTED', poolId: pool.id, memberId, committedCount: committedCount(next), at: now }] };
}

function leaveCommand(pool: Pool, memberId: string, now: number): Result<Pool> {
  requireOpen(pool, now);
  const m = pool.members.find((x) => x.memberId === memberId);
  if (!m || !active(m)) throw new PoolError('BAD_STATE', 'member is not active');
  return {
    value: replaceMember(pool, memberId, { status: 'LEFT' }),
    events: [{ type: 'MEMBER_LEFT', poolId: pool.id, memberId, refundBooking: true, at: now }],
  };
}

export function optInToExtension(pool: Pool, memberId: string, now: number, newClosesAt: number): Result<Pool> {
  requireOpen(pool, now);
  if (!Number.isSafeInteger(newClosesAt) || newClosesAt <= pool.closesAt) throw new PoolError('CLOSE', 'explicit later proposal required');
  return finish({ value: replaceMember(pool, memberId, { extensionOptIn: newClosesAt }), events: [] }, pool, now);
}

/** Close time can only move later if EVERY committed member opted in (logged). Never earlier. */
function extendCloseCommand(policy: Policy, pool: Pool, newClosesAt: number, now: number): Result<Pool> {
  requireOpen(pool, now);
  if (newClosesAt <= pool.closesAt) throw new PoolError('NOT_LATER', 'close time can only be extended, never shortened');
  if (newClosesAt > pool.createdAt + policy.maxPoolDays * 86_400_000) throw new PoolError('CLOSE_TOO_LATE', 'beyond the maximum pool length');
  const committed = pool.members.filter((m) => m.status === 'COMMITTED');
  const optIns = committed.filter((m) => m.extensionOptIn === newClosesAt).length;
  if (optIns !== committed.length) throw new PoolError('NEEDS_ALL_OPT_IN', `${committed.length - optIns} committed members have not agreed`);
  return {
    value: { ...pool, closesAt: newClosesAt, members: pool.members.map(({ extensionOptIn, ...m }) => m) },
    events: [{ type: 'CLOSE_EXTENDED', poolId: pool.id, from: pool.closesAt, to: newClosesAt, optIns, at: now }],
  };
}

/** At the chosen close time: pending (unpaid) members are dropped; committed members wait for the award. */
function closeCommand(pool: Pool, now: number): Result<Pool> {
  if (pool.state !== 'OPEN') throw new PoolError('NOT_OPEN', `pool is ${pool.state}`);
  if (now < pool.closesAt) throw new PoolError('TOO_EARLY', 'pool closes only at the chosen time');
  const members = pool.members.map((m) => (m.status === 'PENDING_BOOKING' ? { ...m, status: 'LEFT' as const } : m));
  const next = { ...pool, state: 'CLOSED' as const, members };
  return { value: next, events: [{ type: 'POOL_CLOSED', poolId: pool.id, committedCount: committedCount(next), at: now }] };
}

/**
 * Apply an award. Members with an assignment become OFFERED; the rest UNSERVED (refund).
 * If nobody is served the pool is NO_DEAL and every booking is refunded.
 */
function applyAwardCommand(policy: Policy, pool: Pool, offeredMemberIds: ReadonlySet<string>, now: number): Result<Pool> {
  if (offeredMemberIds.size > 0) throw new PoolError('PRICING_REQUIRED', 'use stageAward and publishOffers');
  if (pool.state !== 'CLOSED' && pool.state !== 'PRICING') throw new PoolError('NOT_CLOSED', 'award only after close');
  const committed = pool.members.filter((m) => m.status === 'COMMITTED');
  for (const id of offeredMemberIds) {
    if (!committed.some((m) => m.memberId === id)) throw new PoolError('NOT_COMMITTED', `member ${id} was not committed`);
  }
  const members = pool.members.map((m) =>
    m.status !== 'COMMITTED' ? m : { ...m, status: offeredMemberIds.has(m.memberId) ? ('OFFERED' as const) : ('UNSERVED' as const) },
  );
  if (offeredMemberIds.size === 0) {
    return {
      value: { ...pool, state: 'NO_DEAL', members },
      events: [{ type: 'POOL_NO_DEAL', poolId: pool.id, refunds: committed.length, at: now }],
    };
  }
  const acceptBy = now + policy.acceptWindowMinutes * 60_000;
  return {
    value: { ...pool, state: 'AWARDED', members, acceptBy },
    events: [{ type: 'POOL_AWARDED', poolId: pool.id, acceptBy, offered: offeredMemberIds.size, unserved: committed.length - offeredMemberIds.size, at: now }],
  };
}

function decideCommand(pool: Pool, memberId: string, decision: 'ACCEPTED' | 'WALKED_AWAY', now: number, orderId?: string): Result<Pool> {
  if (pool.state !== 'AWARDED' || pool.acceptBy === undefined) throw new PoolError('NOT_AWARDED', 'no offer to decide on');
  if (now > pool.acceptBy) throw new PoolError('WINDOW_OVER', 'the accept window has ended');
  const m = pool.members.find((x) => x.memberId === memberId);
  if (!m || m.status !== 'OFFERED') throw new PoolError('BAD_STATE', 'member has no open offer');
  let booking = m.booking!;
  if (decision === 'ACCEPTED') {
    const offer = pool.offers?.find(o => o.memberId === memberId);
    if (!offer || !orderId) throw new PoolError('CHECKOUT', 'acceptance requires priced offer and order id');
    booking = applyBooking(booking, offer.buyerTotal, orderId).booking;
  }
  return {
    value: replaceMember(pool, memberId, { status: decision, booking }),
    events: [{ type: 'MEMBER_DECIDED', poolId: pool.id, memberId, decision, refundBooking: decision === 'WALKED_AWAY', at: now }],
  };
}

/** Default B: anyone who has not answered by acceptBy is treated as walking away, with a full refund. */
function expireOffersCommand(pool: Pool, now: number): Result<Pool> {
  if (pool.state !== 'AWARDED' || pool.acceptBy === undefined) throw new PoolError('NOT_AWARDED', 'no offers to expire');
  if (now <= pool.acceptBy) throw new PoolError('TOO_EARLY', 'accept window still open');
  const events: PoolEvent[] = [];
  const members = pool.members.map((m) => {
    if (m.status !== 'OFFERED') return m;
    events.push({ type: 'MEMBER_DECIDED', poolId: pool.id, memberId: m.memberId, decision: 'TIMED_OUT', refundBooking: true, at: now });
    return { ...m, status: 'TIMED_OUT' as const };
  });
  return { value: { ...pool, members }, events };
}

/** Complete immutable state is journalled with each command; replay is independent of current policy/code. */
function finish(result: Result<Pool>, before: Pool | undefined, now: number): Result<Pool> {
  if (before === result.value && result.events.length === 0) return result;
  const events: PoolEvent[] = [...result.events];
  const members = result.value.members.map(m => {
    const previous = before?.members.find(p => p.memberId === m.memberId);
    let booking = m.booking;
    if (booking && ['LEFT','UNSERVED','WALKED_AWAY','TIMED_OUT'].includes(m.status) && booking.disposition !== 'APPLIED') {
      const refunded = refundBooking(booking); booking = refunded.booking;
      if (refunded.refund.minor > 0 || previous?.booking?.disposition !== 'REFUNDED') events.push({ type:'BOOKING_REFUND', poolId: result.value.id, memberId:m.memberId, amount:refunded.refund, idempotencyKey:result.value.id+':'+m.memberId+':booking-refund', at:now });
    }
    if (booking?.disposition === 'HELD' && previous?.booking?.disposition !== 'HELD') events.push({type:'BOOKING_CAPTURE',poolId:result.value.id,memberId:m.memberId,amount:booking.paid,idempotencyKey:result.value.id+':'+m.memberId+':booking-capture',at:now});
    if (booking?.disposition === 'APPLIED' && previous?.booking?.disposition !== 'APPLIED') events.push({type:'BOOKING_APPLIED',poolId:result.value.id,memberId:m.memberId,amount:booking.paid,idempotencyKey:result.value.id+':'+m.memberId+':booking-apply',at:now});
    return booking ? {...m, booking} : m;
  });
  const value = {...result.value, members};
  events.push({type:'POOL_SNAPSHOT',poolId:value.id,state:structuredClone(value),at:now});
  return {value, events};
}
export function rebuildPool(events: readonly PoolEvent[]): Pool {
  let state: Pool | undefined;
  for (const event of events) {
    if (state && event.poolId !== state.id) throw new PoolError('REPLAY', 'mixed aggregate events');
    if (event.type === 'POOL_SNAPSHOT') state = structuredClone(event.state);
  }
  if (!state) throw new PoolError('REPLAY', 'missing initial snapshot');
  return state;
}
export function auditPool(pool: Pool, now: number): readonly PoolEvent[] {
  return [
    {type:'BUYER_AUDIT',poolId:pool.id,field:'CLOSE_TIME',shown:pool.closesAt,at:now},
    {type:'BUYER_AUDIT',poolId:pool.id,field:'COMMITTED_COUNT',shown:committedCount(pool),at:now},
    ...(pool.offers ?? []).map(o => ({type:'BUYER_AUDIT' as const,poolId:pool.id,field:'PRICE' as const,shown:{memberId:o.memberId,price:o.buyerTotal},at:now})),
  ];
}
export function stageAward(pool: Pool, assignments: readonly Assignment[], now: number): Result<Pool> {
  if (pool.state !== 'CLOSED') throw new PoolError('STATE','pricing starts after close');
  if (new Set(assignments.map(a=>a.memberId)).size !== assignments.length || assignments.some(a=>!pool.members.some(m=>m.memberId===a.memberId && m.status==='COMMITTED'))) throw new PoolError('ASSIGNMENT','invalid assigned member');
  if (assignments.length===0) return applyAward(policyForPool(pool),pool,new Set(),now);
  return finish({value:{...pool,state:'PRICING',assignments},events:[{type:'PRICING_STARTED',poolId:pool.id,at:now}]},pool,now);
}
function policyForPool(pool: Pool): Policy { return policyFor(pool.region); }
export function publishOffers(policy: Policy, pool: Pool, decisions: ReadonlyMap<string,PriceDecision>, bids: readonly Bid[], now: number): Result<Pool> {
  if (pool.state !== 'PRICING') throw new PoolError('STATE','offers require pricing stage');
  if (pool.pricingDeadline !== undefined && now > pool.pricingDeadline) return applyAward(policy,pool,new Set(),now);
  const acceptBy = now + (pool.acceptWindowMinutes ?? policy.acceptWindowMinutes)*60000;
  for (const a of pool.assignments ?? []) {
    const bid=bids.find(b=>b.id===a.bidId);
    if (!bid || bid.poolId!==pool.id || bid.validUntil < acceptBy) throw new PoolError('VALIDITY','bid expires before actual accept deadline');
    if (decisions.get(a.bidId)?.poolId !== pool.id) throw new PoolError('PRICE','decision belongs to another pool');
  }
  const offers = makeOffers(policy,pool.quantityRule.uom,pool.assignments ?? [],decisions);
  for (const o of offers) if (o.buyerTotal.minor < pool.members.find(m=>m.memberId===o.memberId)!.booking!.paid.minor) throw new PoolError('BOOKING','price below paid booking');
  const ids=new Set(offers.map(o=>o.memberId));
  const members=pool.members.map(m=>m.status==='COMMITTED'?{...m,status:ids.has(m.memberId)?'OFFERED' as const:'UNSERVED' as const}:m);
  const value: Pool={...pool,state:'AWARDED',offers,members,acceptBy};
  return finish({value,events:[{type:'POOL_AWARDED',poolId:pool.id,acceptBy,offered:ids.size,unserved:members.filter(m=>m.status==='UNSERVED').length,at:now},...auditPool(value,now)]},pool,now);
}
export function expirePricing(policy: Policy,pool: Pool,now: number): Result<Pool> {
  if (pool.state!=='PRICING' || pool.pricingDeadline===undefined || now<=pool.pricingDeadline) throw new PoolError('STATE','pricing not due');
  return applyAward(policy,pool,new Set(),now);
}
export function cancelPool(pool: Pool,now: number): Result<Pool> {
  if (pool.members.some(m=>m.status==='ACCEPTED')) throw new PoolError('ORDERS','cancel accepted orders first, atomically in command layer');
  if (pool.state==='CANCELLED' || pool.state==='NO_DEAL') return {value:pool,events:[]};
  return finish({value:{...pool,state:'CANCELLED',members:pool.members.map(m=>({...m,status:m.status==='ACCEPTED'?m.status:'LEFT'}))},events:[{type:'POOL_CANCELLED',poolId:pool.id,at:now}]},pool,now);
}

export function createPool(...args: Parameters<typeof createPoolCommand>): Result<Pool> { return finish(createPoolCommand(...args), undefined, args[2]); }

export function join(...args: Parameters<typeof joinCommand>): Result<Pool> { return finish(joinCommand(...args), args[1], args[3]); }

export function confirmBooking(...args: Parameters<typeof confirmBookingCommand>): Result<Pool> { return finish(confirmBookingCommand(...args), args[0], args[2]); }

export function leave(...args: Parameters<typeof leaveCommand>): Result<Pool> { return finish(leaveCommand(...args), args[0], args[2]); }

export function extendClose(...args: Parameters<typeof extendCloseCommand>): Result<Pool> { return finish(extendCloseCommand(...args), args[1], args[3]); }

export function close(...args: Parameters<typeof closeCommand>): Result<Pool> { return finish(closeCommand(...args), args[0], args[1]); }

export function applyAward(...args: Parameters<typeof applyAwardCommand>): Result<Pool> { return finish(applyAwardCommand(...args), args[1], args[3]); }

export function decide(...args: Parameters<typeof decideCommand>): Result<Pool> { return finish(decideCommand(...args), args[0], args[3]); }

export function expireOffers(...args: Parameters<typeof expireOffersCommand>): Result<Pool> { return finish(expireOffersCommand(...args), args[0], args[1]); }
