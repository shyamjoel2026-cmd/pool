import type { Pool as PgPool, PoolClient } from 'pg';
import * as engine from '@pool/engine';
import { command, post, type Posting } from './store.ts';
import { claimPayment } from './payments.ts';
export { command } from './store.ts';
export function poolPostings(events: readonly engine.PoolEvent[]): Posting[] {
  return events.flatMap((e) => {
    if (!('amount' in e)) return [];
    if (e.amount.currency !== 'INR') throw new Error('money event currency must be INR');
    const base = { minor: e.amount.minor, key: e.idempotencyKey };
    const booking = e.poolId + ':booking:' + e.memberId;
    if (e.type === 'BOOKING_CAPTURE') return [{ ...base, from: 'external:buyers', to: booking }];
    if (e.type === 'BOOKING_REFUND') return [{ ...base, from: booking, to: 'external:buyers' }];
    if (e.type === 'BOOKING_APPLIED')
      return [{ ...base, from: booking, to: e.poolId + ':accepted:' + e.memberId }];
    return [];
  });
}
export async function projectPool(c: PoolClient, p: engine.Pool) {
  if (p.region !== 'IN') throw new Error('persistence supports India only');
  for (const m of p.members)
    if (m.booking?.paymentRef && m.booking.paid.minor > 0)
      await claimPayment(
        c,
        m.booking.paymentRef,
        p.id + ':member:' + m.memberId,
        m.booking.paid.minor,
      );
  await c.query(
    'INSERT INTO pools(id,closes_at,state,quantity_rule,booking_rule,checkout_plan,data) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET closes_at=excluded.closes_at,state=excluded.state,data=excluded.data',
    [p.id, new Date(p.closesAt), p.state, p.quantityRule, p.bookingRule, p.checkoutPlan, p],
  );
  for (const m of p.members)
    await c.query(
      'INSERT INTO pool_members(id,pool_id,booking_minor,data) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET booking_minor=excluded.booking_minor,data=excluded.data',
      [p.id + ':' + m.memberId, p.id, String(m.booking?.paid.minor ?? 0), m],
    );
  if (p.state === 'OPEN') await schedule(c, 'close', p.id, p.closesAt);
  if (['OPEN', 'CLOSED', 'PRICING'].includes(p.state) && p.pricingDeadline !== undefined)
    await schedule(c, 'pricing', p.id, p.pricingDeadline);
  if (p.state === 'AWARDED' && p.acceptBy !== undefined)
    await schedule(c, 'accept', p.id, p.acceptBy);
  for (const a of p.assignments ?? [])
    await c.query(
      'INSERT INTO assignments(id,pool_id,member_id,bid_id,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET data=excluded.data',
      [p.id + ':' + a.memberId, p.id, p.id + ':' + a.memberId, a.bidId, a],
    );
  for (const o of p.offers ?? [])
    await c.query(
      'INSERT INTO offers(id,pool_id,member_id,buyer_total_minor,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING',
      [p.id + ':' + o.memberId, p.id, p.id + ':' + o.memberId, String(o.buyerTotal.minor), o],
    );
  await scheduleReadyWave(c, p.id);
}
export async function schedule(
  c: PoolClient,
  kind: string,
  id: string,
  at: number,
  data: unknown = {},
  generation: string = '',
) {
  await c.query(
    'INSERT INTO workflow_outbox(id,kind,due_at,data) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',
    [`${kind}:${id}:${at}:${generation}`, kind, String(at), { aggregateId: id, payload: data }],
  );
}
export function poolCommand(
  db: PgPool,
  id: string,
  key: string,
  request: unknown,
  fn: (p: engine.Pool | undefined) => engine.Result<engine.Pool>,
) {
  return command<engine.Pool>(
    db,
    id,
    'pool',
    key,
    request,
    (p) => {
      const r = fn(p);
      if (r.value.id !== id) throw new Error('pool command identity mismatch');
      return {
        state: r.value,
        events: r.events,
        postings: poolPostings(r.events),
      };
    },
    projectPool,
  );
}
export function orderPostings(o: engine.Order, events: readonly engine.OrderEvent[]): Posting[] {
  if (o.split.buyerTotal.currency !== 'INR') throw new Error('persistence supports INR only');
  return events.flatMap((e) => {
    if (!('amount' in e)) return [];
    if (e.amount.currency !== 'INR') throw new Error('money event currency must be INR');
    const base = { minor: e.amount.minor, key: e.idempotencyKey };
    const held = o.id + ':held';
    switch (e.type) {
      case 'DEFAULT_FUNDING_RETURN':
        return [{ ...base, from: held, to: e.account }];
      case 'CAPTURE':
        return [{ ...base, from: 'external:buyers', to: held }];
      case 'PAYOUT_RELEASE':
        return [{ ...base, from: held, to: 'external:seller:' + o.sellerId }];
      case 'REFUND':
      case 'LATE_CREDIT':
        return [{ ...base, from: held, to: 'external:buyers' }];
      case 'SELLER_CHARGE':
        return [{ ...base, from: 'seller:' + o.sellerId + ':deposit', to: held }];
      case 'COMPENSATION':
        return [{ ...base, from: held, to: 'external:buyers' }];
      case 'PAYOUT_REVERSAL':
        return [{ ...base, from: 'external:seller:' + o.sellerId, to: held }];
      case 'ALLOCATION_REVERSAL':
        return [{ ...base, from: o.id + ':' + e.account, to: held }];
      default:
        return [];
    }
  });
}
export async function projectOrder(c: PoolClient, o: engine.Order) {
  await c.query(
    'INSERT INTO orders(id,pool_id,buyer_total_minor,seller_total_minor,data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET data=excluded.data,seller_total_minor=excluded.seller_total_minor',
    [o.id, o.poolId, String(o.split.buyerTotal.minor), String(o.split.sellerTotal.minor), o],
  );
  for (const reference of o.paymentRefs ?? []) {
    const event = (
      await c.query(
        "SELECT data FROM audit_events WHERE aggregate_id=$1 AND event_type='CAPTURE' AND data->>'idempotencyKey'=$2",
        [o.id, o.id + ':capture:' + reference],
      )
    ).rows[0]?.data;
    if (!event) throw new Error('payment receipt has no capture event');
    await claimPayment(c, reference, o.id, event.amount.minor, o.id);
  }
  for (const step of o.steps)
    await c.query(
      'INSERT INTO order_steps(id,order_id,proof_ref,data) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',
      [o.id + ':' + step.key, o.id, step.proofRef, step],
    );
  if (!o.openIssue && ['HANDED_OVER', 'SETTLED'].includes(o.status)) {
    const version = String(
      (await c.query('SELECT version FROM aggregates WHERE id=$1', [o.id])).rows[0].version,
    );
    for (const h of engine.holdsDue(o)) await schedule(c, 'hold', o.id, h.dueAt, {}, version);
    if (o.status === 'HANDED_OVER' && o.handedOverAt !== undefined)
      await schedule(
        c,
        'settle',
        o.id,
        o.handedOverAt + o.profile.returnWindowDays * 86400000,
        {},
        version,
      );
  }
  await scheduleReadyWave(c, o.poolId);
}

async function scheduleReadyWave(c: PoolClient, poolId: string) {
  const pool = (await c.query("SELECT data FROM aggregates WHERE id=$1 AND kind='pool'", [poolId]))
    .rows[0]?.data as engine.Pool | undefined;
  if (!pool || pool.state !== 'AWARDED' || pool.members.some((m) => m.status === 'OFFERED')) return;
  const orders = (await c.query('SELECT data FROM orders WHERE pool_id=$1', [poolId])).rows.map(
    (r) => r.data as engine.Order,
  );
  if (
    !orders.length ||
    orders.some(
      (o) =>
        !['SETTLED', 'CANCELLED_BY_SELLER', 'CANCELLED_BY_BUYER', 'RETURNED'].includes(o.status),
    )
  )
    return;
  const latest = (
    await c.query(
      'SELECT data FROM audit_events WHERE aggregate_id=$1 ORDER BY sequence DESC LIMIT 1',
      [poolId],
    )
  ).rows[0]?.data;
  // Durable execution reads actual time; zero means ready immediately, not an invented domain timestamp.
  const due = Number.isSafeInteger(latest?.at) ? latest.at : 0;
  await c.query(
    'INSERT INTO workflow_outbox(id,kind,due_at,data) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',
    ['wave:' + poolId + ':ready', 'wave', String(due), { aggregateId: poolId, payload: {} }],
  );
}
export function orderCommand(
  db: PgPool,
  id: string,
  key: string,
  request: unknown,
  fn: (o: engine.Order | undefined) => {
    order: engine.Order;
    events: readonly engine.OrderEvent[];
  },
) {
  return command<engine.Order>(
    db,
    id,
    'order',
    key,
    request,
    (o) => {
      const r = fn(o);
      if (r.order.id !== id) throw new Error('order command identity mismatch');
      const postings = orderPostings(r.order, r.events);
      if (o?.status !== 'HANDED_OVER' && r.order.status === 'HANDED_OVER') {
        const split = r.order.split;
        for (const [name, amount] of [
          ['margin', split.margin],
          ['tcs', split.tcs],
          ['tds', split.tds],
        ] as const)
          postings.push({
            from: id + ':held',
            to: id + ':' + name,
            minor: amount.minor,
            key: id + ':allocate:' + name,
          });
      }
      return { state: r.order, events: r.events, postings };
    },
    projectOrder,
  );
}
export function closePool(db: PgPool, id: string, at: number) {
  return poolCommand(db, id, id + ':close:' + at, { at }, (p) =>
    p?.state === 'OPEN' && p.closesAt === at ? engine.close(p, at) : { value: p!, events: [] },
  );
}
export function expirePoolPricing(db: PgPool, id: string, at: number) {
  return poolCommand(db, id, id + ':pricing-expiry', { at }, (p) =>
    p && ['OPEN', 'CLOSED', 'PRICING'].includes(p.state)
      ? engine.expirePricing(engine.INDIA_POLICY, p, at)
      : { value: p!, events: [] },
  );
}
export function expirePoolOffers(db: PgPool, id: string, at: number) {
  return poolCommand(db, id, id + ':offers-expiry', { at }, (p) =>
    p?.state === 'AWARDED' ? engine.expireOffers(p, at) : { value: p!, events: [] },
  );
}
export function releaseOrderHolds(db: PgPool, id: string, at: number, generation?: string) {
  return orderCommand(db, id, id + ':holds:' + (generation ?? at), { at }, (o) =>
    engine.releaseDueHolds(o!, at),
  );
}
export function settleOrder(db: PgPool, id: string, at: number, generation: string) {
  return orderCommand(db, id, id + ':settle:' + generation, { at }, (o) => {
    if (!o) throw new Error('order missing');
    return engine.canSettle(o, at) ? engine.settle(o, at) : { order: o, events: [] };
  });
}
export function waveClose(
  db: PgPool,
  id: string,
  slabs: readonly engine.Slab[],
  orders: readonly engine.WaveOrder[],
  at: number,
) {
  return settleWaves(db, id, at, { slabs, orders });
}

export function closePersistedWaves(db: PgPool, id: string, at: number) {
  return settleWaves(db, id, at);
}

/** Settles all seller pots atomically using accepted terms and terminal persisted orders. */
function settleWaves(
  db: PgPool,
  id: string,
  at: number,
  expected?: { slabs: readonly engine.Slab[]; orders: readonly engine.WaveOrder[] },
) {
  if (!Number.isSafeInteger(at)) throw new Error('integer UTC wave close time required');
  return command<ReturnType<typeof engine.closeSellerWaves>>(
    db,
    id + ':wave',
    'wave',
    id + ':wave-close',
    // A retry can run later or come from the outbox: its business identity is the pool's accepted seller pots.
    { policy: 'SEPARATE_SELLER_POTS' },
    async (_, c) => {
      const pool = (await c.query('SELECT data FROM pools WHERE id=$1', [id])).rows[0]?.data as
        engine.Pool | undefined;
      if (!pool || pool.state !== 'AWARDED' || pool.members.some((m) => m.status === 'OFFERED'))
        throw new Error('wave waits for every offer decision');
      const orders = (
        await c.query('SELECT data FROM orders WHERE pool_id=$1 FOR UPDATE', [id])
      ).rows.map((r) => r.data as engine.Order);
      if (!orders.length) throw new Error('wave requires persisted orders');
      const actual = new Map(orders.map((o) => [o.id, o]));
      const outcomes: Partial<Record<engine.OrderStatus, engine.WaveOrder['outcome']>> = {
        SETTLED: 'settled',
        CANCELLED_BY_SELLER: 'seller_cancelled',
        CANCELLED_BY_BUYER: 'buyer_cancelled',
        RETURNED: 'returned',
      };
      const waveOrders: engine.SellerWaveOrder[] = [];
      for (const o of orders) {
        const outcome = outcomes[o.status];
        const terms = o.waveTerms;
        if (!outcome || !terms || terms.sellerId !== o.sellerId)
          throw new Error('wave requires terminal orders and accepted seller terms');
        if (
          !Number.isSafeInteger(terms.count) ||
          terms.count < 1 ||
          o.split.waveHold.minor !== engine.holdPerUnit(terms.slabs) * terms.count
        )
          throw new Error('accepted wave count/hold mismatch');
        waveOrders.push({ orderId: o.id, outcome, ...terms });
        // A successful replacement does not erase the defaulting seller's slab liability to its other buyers.
        for (let i = 0; i < (o.waveDefaults ?? []).length; i++)
          waveOrders.push({
            orderId: o.id + ':default:' + i,
            outcome: 'seller_cancelled',
            ...o.waveDefaults![i]!,
          });
      }
      const state = engine.closeSellerWaves('INR', waveOrders);
      if (expected) {
        if (
          state.sellers.length !== 1 ||
          JSON.stringify(state.sellers[0]!.slabs) !== JSON.stringify(expected.slabs)
        )
          throw new Error('requested slabs differ from accepted seller terms');
        const supplied = new Map(expected.orders.map((o) => [o.orderId, o]));
        if (supplied.size !== expected.orders.length || supplied.size !== orders.length)
          throw new Error('wave must contain every persisted pool order exactly once');
        for (const o of orders)
          if (
            supplied.get(o.id)?.count !== o.waveTerms!.count ||
            supplied.get(o.id)?.outcome !== outcomes[o.status]
          )
            throw new Error('wave outcome/count does not match persisted order');
      }
      const postings: Posting[] = [];
      for (const seller of state.sellers) {
        const potAccount = id + ':wave-held:' + seller.sellerId;
        for (const item of seller.orders.filter((o) => o.outcome === 'settled'))
          postings.push({
            from: item.orderId + ':held',
            to: potAccount,
            minor: actual.get(item.orderId)!.split.waveHold.minor,
            key: id + ':wave-hold:' + item.orderId,
          });
        postings.push({
          from: 'seller:' + seller.sellerId + ':deposit',
          to: potAccount,
          minor: seller.sellerPenalty.minor,
          key: id + ':wave-penalty:' + seller.sellerId,
        });
        for (const refund of seller.refunds)
          postings.push({
            from: potAccount,
            to: 'external:buyers',
            minor: refund.amount.minor,
            key: id + ':wave-refund:' + refund.orderId,
          });
        postings.push({
          from: potAccount,
          to: 'external:seller:' + seller.sellerId,
          minor: seller.releaseToSeller.minor,
          key: id + ':wave-release:' + seller.sellerId,
        });
      }
      return { state, events: [{ type: 'WAVES_CLOSED', at, state }], postings };
    },
    async (c, state) => {
      for (const seller of state.sellers)
        await c.query('INSERT INTO wave_pots(id,pool_id,pot_minor,data) VALUES($1,$2,$3,$4)', [
          id + ':wave:' + seller.sellerId,
          id,
          String(seller.pot.minor),
          seller,
        ]);
    },
  );
}
