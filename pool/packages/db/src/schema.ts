// Drizzle column API: https://orm.drizzle.team/docs/column-types/pg
import { pgTable, text, bigint, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const sellers = pgTable('sellers', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  gstin: text('gstin'),
  state_code: text('state_code'),
  payout_ref: text('payout_ref'),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  hsn_code: text('hsn_code'),
  gst_rate_bps: integer('gst_rate_bps'),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const units = pgTable('units', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  base_scale: bigint('base_scale', { mode: 'bigint' }),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const fulfilment_profiles = pgTable('fulfilment_profiles', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const addresses = pgTable('addresses', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  user_id: text('user_id'),
  pincode: text('pincode'),
  state_code: text('state_code'),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const product_sources = pgTable('product_sources', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  product_id: text('product_id'),
  source_url: text('source_url'),
  price_minor: bigint('price_minor', { mode: 'bigint' }),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const pools = pgTable('pools', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  closes_at: timestamp('closes_at', { withTimezone: true }),
  state: text('state'),
  quantity_rule: jsonb('quantity_rule'),
  booking_rule: jsonb('booking_rule'),
  checkout_plan: text('checkout_plan'),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const pool_members = pgTable('pool_members', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  pool_id: text('pool_id'),
  booking_minor: bigint('booking_minor', { mode: 'bigint' }),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const bids = pgTable('bids', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  pool_id: text('pool_id'),
  seller_id: text('seller_id'),
  revision: integer('revision'),
  seller_price_minor: bigint('seller_price_minor', { mode: 'bigint' }),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const bid_access_log = pgTable('bid_access_log', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  bid_id: text('bid_id'),
  actor_id: text('actor_id'),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const price_decisions = pgTable('price_decisions', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  pool_id: text('pool_id'),
  bid_id: text('bid_id'),
  buyer_price_minor: bigint('buyer_price_minor', { mode: 'bigint' }),
  decided_by: text('decided_by'),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const assignments = pgTable('assignments', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  pool_id: text('pool_id'),
  member_id: text('member_id'),
  bid_id: text('bid_id'),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const offers = pgTable('offers', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  pool_id: text('pool_id'),
  member_id: text('member_id'),
  buyer_total_minor: bigint('buyer_total_minor', { mode: 'bigint' }),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  pool_id: text('pool_id'),
  buyer_total_minor: bigint('buyer_total_minor', { mode: 'bigint' }),
  seller_total_minor: bigint('seller_total_minor', { mode: 'bigint' }),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const order_steps = pgTable('order_steps', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  order_id: text('order_id'),
  proof_ref: text('proof_ref'),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const order_proofs = pgTable('order_proofs', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  order_id: text('order_id'),
  proof_ref: text('proof_ref'),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const handover_codes = pgTable('handover_codes', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  order_id: text('order_id'),
  hash: text('hash'),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  order_id: text('order_id'),
  pa_reference: text('pa_reference'),
  amount_minor: bigint('amount_minor', { mode: 'bigint' }),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const wave_pots = pgTable('wave_pots', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  pool_id: text('pool_id'),
  pot_minor: bigint('pot_minor', { mode: 'bigint' }),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const audit_events = pgTable('audit_events', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  aggregate_id: text('aggregate_id'),
  event_type: text('event_type'),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const idempotency_keys = pgTable('idempotency_keys', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  request_hash: text('request_hash'),
  result: jsonb('result'),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const aggregates = pgTable('aggregates', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  kind: text('kind'),
  version: bigint('version', { mode: 'bigint' }),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const money_events = pgTable('money_events', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  event_key: text('event_key'),
  amount_minor: bigint('amount_minor', { mode: 'bigint' }),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
export const ledger_account_map = pgTable('ledger_account_map', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  ledger_id: text('ledger_id'),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
});
