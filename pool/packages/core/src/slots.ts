import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import * as e from '@pool/engine';
import { command } from './store.ts';
export interface SlotDefinition extends Omit<e.PickupSlot, 'booked'> {
  sellerId: string;
  mode: string;
  purpose: string;
}
export function createFulfilmentSlot(
  db: Pool,
  slot: SlotDefinition,
  requestId: string,
  actor: string,
  now: number,
) {
  e.createSlot(slot);
  if (
    !actor.trim() ||
    !slot.mode.trim() ||
    !slot.purpose.trim() ||
    !Number.isSafeInteger(now) ||
    slot.startsAt <= now
  )
    throw new Error('slot needs actor, purpose, mode and future start');
  return command(db, 'slot:' + slot.id, 'slot', requestId, { slot, actor, now }, async (_, c) => {
    const seller = (await c.query('SELECT data FROM sellers WHERE id=$1', [slot.sellerId])).rows[0]
      ?.data;
    if (!seller?.verified) throw new Error('slot requires verified seller');
    await c.query(
      'INSERT INTO fulfilment_slots(id,seller_id,area_key,purpose,mode,starts_at,ends_at,capacity) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [
        slot.id,
        slot.sellerId,
        slot.areaKey,
        slot.purpose,
        slot.mode,
        String(slot.startsAt),
        String(slot.endsAt),
        slot.capacity,
      ],
    );
    return {
      state: slot,
      events: [{ type: 'SLOT_CREATED', slotId: slot.id, actor, at: now }],
      postings: [],
    };
  });
}
export function reserveFulfilmentSlot(
  db: Pool,
  slotId: string,
  orderId: string,
  requestId: string,
  actor: string,
  now: number,
) {
  if (!actor.trim() || !Number.isSafeInteger(now))
    throw new Error('reservation needs actor and UTC time');
  return command(
    db,
    'slot-reservation:' + requestId,
    'slot-reservation',
    requestId,
    { slotId, orderId, actor, now },
    async (_, c) => {
      const slot = (
        await c.query('SELECT * FROM fulfilment_slots WHERE id=$1 FOR UPDATE', [slotId])
      ).rows[0];
      const order = (await c.query('SELECT data FROM orders WHERE id=$1', [orderId])).rows[0]
        ?.data as e.Order | undefined;
      if (
        !slot ||
        !order ||
        ['CANCELLED_BY_BUYER', 'CANCELLED_BY_SELLER', 'RETURNED'].includes(order.status)
      )
        throw new Error('reservation requires slot and active fulfilment order');
      const pool = (await c.query('SELECT data FROM pools WHERE id=$1', [order.poolId])).rows[0]
        ?.data as e.Pool | undefined;
      if (
        slot.seller_id !== order.sellerId ||
        slot.area_key !== pool?.areaKey ||
        !order.profile.modes.includes(slot.mode)
      )
        throw new Error('slot does not cover order seller, area or fulfilment mode');
      if (order.bidId) {
        const bid = (await c.query('SELECT data FROM bids WHERE id=$1', [order.bidId])).rows[0]
          ?.data as e.Bid | undefined;
        if (!bid?.modes.includes(slot.mode)) throw new Error('slot mode was not offered by seller');
        await c.query('INSERT INTO bid_access_log(id,bid_id,actor_id,data) VALUES($1,$2,$3,$4)', [
          randomUUID(),
          bid.id,
          actor,
          { reason: 'slot-reservation' },
        ]);
      }
      const next = e.reserveSlot(
        {
          id: slot.id,
          areaKey: slot.area_key,
          startsAt: Number(slot.starts_at),
          endsAt: Number(slot.ends_at),
          capacity: slot.capacity,
          booked: slot.booked,
        },
        now,
      );
      await c.query(
        'INSERT INTO slot_reservations(id,slot_id,order_id,purpose,created_at) VALUES($1,$2,$3,$4,$5)',
        [requestId, slotId, orderId, slot.purpose, String(now)],
      );
      await c.query('UPDATE fulfilment_slots SET booked=$2 WHERE id=$1', [slotId, next.booked]);
      const state = { reservationId: requestId, slotId, orderId };
      return { state, events: [{ type: 'SLOT_RESERVED', ...state, actor, at: now }], postings: [] };
    },
  );
}
export function releaseFulfilmentSlot(
  db: Pool,
  reservationId: string,
  requestId: string,
  actor: string,
  now: number,
) {
  if (!actor.trim() || !Number.isSafeInteger(now))
    throw new Error('release needs actor and UTC time');
  return command(
    db,
    'slot-release:' + reservationId,
    'slot-release',
    requestId,
    { reservationId, actor, now },
    async (_, c) => {
      const row = (
        await c.query('SELECT * FROM slot_reservations WHERE id=$1 FOR UPDATE', [reservationId])
      ).rows[0];
      if (!row) throw new Error('reservation missing');
      if (row.active) await release(c, row, now);
      return {
        state: { reservationId, released: true },
        events: row.active ? [{ type: 'SLOT_RELEASED', reservationId, actor, at: now }] : [],
        postings: [],
      };
    },
  );
}
async function release(c: PoolClient, row: { id: string; slot_id: string }, now: number) {
  await c.query('UPDATE slot_reservations SET active=false,released_at=$2 WHERE id=$1', [
    row.id,
    String(now),
  ]);
  await c.query('UPDATE fulfilment_slots SET booked=booked-1 WHERE id=$1', [row.slot_id]);
}
/** Same transaction as cancellation, return or seller reassignment; no leaked capacity. */
export async function releaseInvalidOrderSlots(c: PoolClient, order: e.Order) {
  const rows = await c.query(
    'SELECT r.* FROM slot_reservations r JOIN fulfilment_slots s ON s.id=r.slot_id WHERE r.order_id=$1 AND r.active AND (s.seller_id<>$2 OR $3)',
    [
      order.id,
      order.sellerId,
      ['CANCELLED_BY_BUYER', 'CANCELLED_BY_SELLER', 'RETURNED'].includes(order.status),
    ],
  );
  for (const row of rows.rows) {
    const now = Date.now();
    await release(c, row, now);
    await c.query('INSERT INTO audit_events(id,aggregate_id,event_type,data) VALUES($1,$2,$3,$4)', [
      randomUUID(),
      order.id,
      'SLOT_RELEASED',
      { type: 'SLOT_RELEASED', reservationId: row.id, reason: 'ORDER_CHANGED', at: now },
    ]);
  }
}
