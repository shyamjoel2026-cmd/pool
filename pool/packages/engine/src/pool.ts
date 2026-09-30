import type { Policy, Region, Category } from './policy.ts';
import type { PriceBasis, Quantity } from './quantity.ts';

export class PoolError extends Error {
  override name = 'PoolError';
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

export type PoolState = 'OPEN' | 'CLOSED' | 'AWARDED' | 'NO_DEAL' | 'CANCELLED';

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
}

export interface Pool {
  readonly id: string;
  readonly region: Region;
  readonly category: Category;
  /** Canonical product id or grouping key (e.g. "brand:samsung|tv|55in|4k|2026"). */
  readonly productKey: string;
  readonly areaKey: string;
  readonly basis: PriceBasis;
  readonly createdBy: string;
  readonly createdAt: number;
  /** Chosen by whoever started the pool. Never changed without every committed member opting in. */
  readonly closesAt: number;
  readonly state: PoolState;
  readonly members: readonly Member[];
  readonly acceptBy?: number;
}

export type PoolEvent =
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

export function createPool(
  policy: Policy,
  input: Omit<Pool, 'state' | 'members' | 'region' | 'acceptBy'>,
  now: number,
): Result<Pool> {
  if (input.createdAt !== now) throw new PoolError('CLOCK', 'createdAt must equal now');
  const minClose = now + policy.minPoolMinutes * 60_000;
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

export function join(
  policy: Policy,
  pool: Pool,
  m: Omit<Member, 'status' | 'joinedAt'>,
  now: number,
): Result<Pool> {
  requireOpen(pool, now);
  if (m.qty.basis !== pool.basis) throw new PoolError('BASIS', 'quantity basis does not match the pool');
  if (pool.members.some((x) => x.memberId === m.memberId)) throw new PoolError('DUPLICATE', 'member already joined');
  if (pool.members.some((x) => active(x) && x.userId === m.userId)) throw new PoolError('ALREADY_IN_POOL', 'this user already has an active place in the pool');
  const householdQty = pool.members
    .filter((x) => active(x) && x.householdKey === m.householdKey)
    .reduce((n, x) => n + x.qty.amount, 0);
  const cap = pool.basis === 'unit' ? policy.maxUnitsPerHousehold : policy.maxGramsPerHousehold;
  if (householdQty + m.qty.amount > cap) throw new PoolError('HOUSEHOLD_CAP', `a household can have at most ${cap} ${pool.basis === 'unit' ? 'units' : 'g'} in one pool`);
  const payerQty = pool.members
    .filter((x) => active(x) && x.payerKey === m.payerKey)
    .reduce((n, x) => n + x.qty.amount, 0);
  if (payerQty + m.qty.amount > cap) throw new PoolError('PAYER_CAP', 'this payment account has reached the per-pool cap');
  const member: Member = { ...m, status: 'PENDING_BOOKING', joinedAt: now };
  return {
    value: { ...pool, members: [...pool.members, member] },
    events: [{ type: 'MEMBER_JOINED', poolId: pool.id, memberId: m.memberId, at: now }],
  };
}

/** Called when the payment aggregator confirms the booking (webhook). Only then does the member count. */
export function confirmBooking(pool: Pool, memberId: string, now: number): Result<Pool> {
  const m = pool.members.find((x) => x.memberId === memberId);
  if (!m) throw new PoolError('NO_MEMBER', 'unknown member');
  if (m.status === 'COMMITTED') return { value: pool, events: [] }; // idempotent webhook replay
  if (m.status !== 'PENDING_BOOKING') throw new PoolError('BAD_STATE', `cannot confirm booking in status ${m.status}`);
  // A booking confirmed after close still counts only if it was paid before close; the caller passes paidAt as now.
  if (now >= pool.closesAt) throw new PoolError('CLOSED', 'booking confirmed after close — refund instead');
  const next = replaceMember(pool, memberId, { status: 'COMMITTED' });
  return { value: next, events: [{ type: 'MEMBER_COMMITTED', poolId: pool.id, memberId, committedCount: committedCount(next), at: now }] };
}

export function leave(pool: Pool, memberId: string, now: number): Result<Pool> {
  requireOpen(pool, now);
  const m = pool.members.find((x) => x.memberId === memberId);
  if (!m || !active(m)) throw new PoolError('BAD_STATE', 'member is not active');
  return {
    value: replaceMember(pool, memberId, { status: 'LEFT' }),
    events: [{ type: 'MEMBER_LEFT', poolId: pool.id, memberId, refundBooking: true, at: now }],
  };
}

export function optInToExtension(pool: Pool, memberId: string, now: number): Pool {
  requireOpen(pool, now);
  return replaceMember(pool, memberId, { extensionOptIn: now });
}

/** Close time can only move later if EVERY committed member opted in (logged). Never earlier. */
export function extendClose(policy: Policy, pool: Pool, newClosesAt: number, now: number): Result<Pool> {
  requireOpen(pool, now);
  if (newClosesAt <= pool.closesAt) throw new PoolError('NOT_LATER', 'close time can only be extended, never shortened');
  if (newClosesAt > pool.createdAt + policy.maxPoolDays * 86_400_000) throw new PoolError('CLOSE_TOO_LATE', 'beyond the maximum pool length');
  const committed = pool.members.filter((m) => m.status === 'COMMITTED');
  const optIns = committed.filter((m) => m.extensionOptIn !== undefined).length;
  if (optIns !== committed.length) throw new PoolError('NEEDS_ALL_OPT_IN', `${committed.length - optIns} committed members have not agreed`);
  return {
    value: { ...pool, closesAt: newClosesAt },
    events: [{ type: 'CLOSE_EXTENDED', poolId: pool.id, from: pool.closesAt, to: newClosesAt, optIns, at: now }],
  };
}

/** At the chosen close time: pending (unpaid) members are dropped; committed members wait for the award. */
export function close(pool: Pool, now: number): Result<Pool> {
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
export function applyAward(policy: Policy, pool: Pool, offeredMemberIds: ReadonlySet<string>, now: number): Result<Pool> {
  if (pool.state !== 'CLOSED') throw new PoolError('NOT_CLOSED', 'award only after close');
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

export function decide(pool: Pool, memberId: string, decision: 'ACCEPTED' | 'WALKED_AWAY', now: number): Result<Pool> {
  if (pool.state !== 'AWARDED' || pool.acceptBy === undefined) throw new PoolError('NOT_AWARDED', 'no offer to decide on');
  if (now > pool.acceptBy) throw new PoolError('WINDOW_OVER', 'the accept window has ended');
  const m = pool.members.find((x) => x.memberId === memberId);
  if (!m || m.status !== 'OFFERED') throw new PoolError('BAD_STATE', 'member has no open offer');
  return {
    value: replaceMember(pool, memberId, { status: decision }),
    events: [{ type: 'MEMBER_DECIDED', poolId: pool.id, memberId, decision, refundBooking: decision === 'WALKED_AWAY', at: now }],
  };
}

/** Default B: anyone who has not answered by acceptBy is treated as walking away, with a full refund. */
export function expireOffers(pool: Pool, now: number): Result<Pool> {
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
