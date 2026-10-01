import type { Pool as PgPool, PoolClient } from 'pg';
import * as engine from '@pool/engine';
import { command, post, type Posting } from './store.ts';
import { claimPayment } from './payments.ts';
export { command } from './store.ts';
export function poolPostings(events: readonly engine.PoolEvent[]): Posting[] {
  return events.flatMap((e) => {
    if (!('amount' in e)) return [];
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
  if (p.state === 'PRICING' && p.pricingDeadline !== undefined)
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
  return events.flatMap((e) => {
    if (!('amount' in e)) return [];
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
  }
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
    p?.state === 'PRICING'
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
export function waveClose(
  db: PgPool,
  id: string,
  slabs: readonly engine.Slab[],
  orders: readonly engine.WaveOrder[],
  at: number,
) {
  return command(
    db,
    id + ':wave',
    'wave',
    id + ':wave-close',
    { slabs, orders, at },
    () => ({
      state: engine.closeWave('INR', slabs, orders),
      events: [{ type: 'WAVE_CLOSED', orders, slabs, at }],
      postings: [],
    }),
    async (c, state) => {
      const rows = await c.query('SELECT data FROM orders WHERE pool_id=$1 FOR UPDATE', [id]);
      const actual = new Map<string, engine.Order>(rows.rows.map((r) => [r.data.id, r.data]));
      // Founder decision pending: do not silently invent cross-seller pot/subsidy semantics.
      if (new Set([...actual.values()].map((o) => o.sellerId)).size > 1)
        throw new Error('multi-seller Wave Drop settlement requires an explicit pot policy');
      if (
        new Set(orders.map((o) => o.orderId)).size !== orders.length ||
        actual.size !== orders.length
      )
        throw new Error('wave must contain every persisted pool order exactly once');
      const status = {
        settled: 'SETTLED',
        seller_cancelled: 'CANCELLED_BY_SELLER',
        buyer_cancelled: 'CANCELLED_BY_BUYER',
        returned: 'RETURNED',
      } as const;
      for (const item of orders) {
        const o = actual.get(item.orderId);
        if (
          !o ||
          o.status !== status[item.outcome] ||
          !Number.isSafeInteger(item.count) ||
          item.count < 1
        )
          throw new Error('wave outcome does not match persisted order');
        if (
          item.outcome === 'settled' &&
          o.split.waveHold.minor !== engine.holdPerUnit(slabs) * item.count
        )
          throw new Error('wave count/hold mismatch');
      }
      const settled = orders.filter((o) => o.outcome === 'settled'),
        cancelled = orders.filter((o) => o.outcome === 'seller_cancelled');
      for (const item of settled)
        await post(c, {
          from: item.orderId + ':held',
          to: id + ':wave-held',
          minor: actual.get(item.orderId)!.split.waveHold.minor,
          key: id + ':wave-hold:' + item.orderId,
        });
      const penalties = cancelled.length
        ? engine.allocate(
            state.sellerPenalty,
            cancelled.map((o) => o.count),
          )
        : [];
      for (let i = 0; i < cancelled.length; i++) {
        const item = cancelled[i]!;
        await post(c, {
          from: 'external:seller:' + actual.get(item.orderId)!.sellerId,
          to: id + ':wave-held',
          minor: penalties[i]!.minor,
          key: id + ':wave-penalty:' + item.orderId,
        });
      }
      for (const r of state.refunds)
        await post(c, {
          from: id + ':wave-held',
          to: 'external:buyers',
          minor: r.amount.minor,
          key: id + ':wave-refund:' + r.orderId,
        });
      const releases = settled.length
        ? engine.allocate(
            state.releaseToSeller,
            settled.map((o) => o.count),
          )
        : [];
      for (let i = 0; i < settled.length; i++) {
        const item = settled[i]!;
        await post(c, {
          from: id + ':wave-held',
          to: 'external:seller:' + actual.get(item.orderId)!.sellerId,
          minor: releases[i]!.minor,
          key: id + ':wave-release:' + item.orderId,
        });
      }
      await c.query('INSERT INTO wave_pots(id,pool_id,pot_minor,data) VALUES($1,$2,$3,$4)', [
        id + ':wave',
        id,
        String(state.pot.minor),
        state,
      ]);
    },
  );
}
