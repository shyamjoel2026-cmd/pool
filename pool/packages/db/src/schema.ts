// SQL migrations own indexes, checks and triggers; these declarations match query columns, nullability, defaults and references.
// Drizzle column API: https://orm.drizzle.team/docs/column-types/pg
import {
  pgTable,
  text,
  bigint,
  jsonb,
  timestamp,
  integer,
  boolean,
  primaryKey,
} from 'drizzle-orm/pg-core';
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const sellers = pgTable('sellers', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  gstin: text('gstin'),
  state_code: text('state_code'),
  payout_ref: text('payout_ref'),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  hsn_code: text('hsn_code').notNull(),
  gst_rate_bps: integer('gst_rate_bps').notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const units = pgTable('units', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  base_scale: bigint('base_scale', { mode: 'bigint' }).notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const fulfilment_profiles = pgTable('fulfilment_profiles', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const addresses = pgTable('addresses', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  user_id: text('user_id').references(() => users.id),
  pincode: text('pincode'),
  state_code: text('state_code'),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const product_sources = pgTable('product_sources', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  product_id: text('product_id').references(() => products.id),
  source_url: text('source_url'),
  price_minor: bigint('price_minor', { mode: 'bigint' }),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const pools = pgTable('pools', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  closes_at: timestamp('closes_at', { withTimezone: true }).notNull(),
  state: text('state').notNull(),
  quantity_rule: jsonb('quantity_rule').notNull(),
  booking_rule: jsonb('booking_rule').notNull(),
  checkout_plan: text('checkout_plan').notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const pool_members = pgTable('pool_members', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  pool_id: text('pool_id')
    .notNull()
    .references(() => pools.id),
  booking_minor: bigint('booking_minor', { mode: 'bigint' }).notNull().default(0n),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const bids = pgTable('bids', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  pool_id: text('pool_id')
    .notNull()
    .references(() => pools.id),
  seller_id: text('seller_id')
    .notNull()
    .references(() => sellers.id),
  revision: integer('revision').notNull(),
  seller_price_minor: bigint('seller_price_minor', { mode: 'bigint' }).notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const bid_access_log = pgTable('bid_access_log', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  bid_id: text('bid_id')
    .notNull()
    .references(() => bids.id),
  actor_id: text('actor_id').notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const price_decisions = pgTable('price_decisions', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  pool_id: text('pool_id')
    .notNull()
    .references(() => pools.id),
  bid_id: text('bid_id')
    .notNull()
    .references(() => bids.id),
  buyer_price_minor: bigint('buyer_price_minor', { mode: 'bigint' }).notNull(),
  decided_by: text('decided_by').notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const assignments = pgTable('assignments', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  pool_id: text('pool_id')
    .notNull()
    .references(() => pools.id),
  member_id: text('member_id')
    .notNull()
    .references(() => pool_members.id),
  bid_id: text('bid_id')
    .notNull()
    .references(() => bids.id),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const offers = pgTable('offers', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  pool_id: text('pool_id')
    .notNull()
    .references(() => pools.id),
  member_id: text('member_id')
    .notNull()
    .references(() => pool_members.id),
  buyer_total_minor: bigint('buyer_total_minor', { mode: 'bigint' }).notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  pool_id: text('pool_id')
    .notNull()
    .references(() => pools.id),
  buyer_total_minor: bigint('buyer_total_minor', { mode: 'bigint' }).notNull(),
  seller_total_minor: bigint('seller_total_minor', { mode: 'bigint' }).notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const order_steps = pgTable('order_steps', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  order_id: text('order_id')
    .notNull()
    .references(() => orders.id),
  proof_ref: text('proof_ref').notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const order_proofs = pgTable('order_proofs', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  order_id: text('order_id')
    .notNull()
    .references(() => orders.id),
  proof_ref: text('proof_ref').notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const handover_codes = pgTable('handover_codes', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  order_id: text('order_id')
    .notNull()
    .references(() => orders.id),
  hash: text('hash').notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  order_id: text('order_id').references(() => orders.id),
  pa_reference: text('pa_reference').notNull(),
  amount_minor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const wave_pots = pgTable('wave_pots', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  pool_id: text('pool_id')
    .notNull()
    .references(() => pools.id),
  pot_minor: bigint('pot_minor', { mode: 'bigint' }).notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const audit_events = pgTable('audit_events', {
  sequence: bigint('sequence', { mode: 'bigint' }).generatedAlwaysAsIdentity(),
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  aggregate_id: text('aggregate_id').notNull(),
  event_type: text('event_type').notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const idempotency_keys = pgTable('idempotency_keys', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  request_hash: text('request_hash').notNull(),
  result: jsonb('result').notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const aggregates = pgTable('aggregates', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  kind: text('kind').notNull(),
  version: bigint('version', { mode: 'bigint' }).notNull().default(0n),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export const aggregate_history = pgTable(
  'aggregate_history',
  {
    aggregate_id: text('aggregate_id').notNull(),
    version: bigint('version', { mode: 'bigint' }).notNull(),
    currency: text('currency').notNull().default('INR'),
    kind: text('kind').notNull(),
    data: jsonb('data').notNull(),
    previous_hash: text('previous_hash').notNull(),
    state_hash: text('state_hash').notNull(),
    legacy_baseline: boolean('legacy_baseline').notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.aggregate_id, table.version] })],
);
export const money_events = pgTable('money_events', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  event_key: text('event_key').notNull(),
  amount_minor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// Reference-only projection of the vendored table. Its complete definition is owned by pgledger.sql.
const pgledger_accounts = pgTable('pgledger_accounts', { id: text('id').primaryKey() });
export const ledger_account_map = pgTable('ledger_account_map', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  ledger_id: text('ledger_id')
    .notNull()
    .references(() => pgledger_accounts.id),
  data: jsonb('data').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workflow_outbox = pgTable('workflow_outbox', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  kind: text('kind').notNull(),
  due_at: bigint('due_at', { mode: 'bigint' }).notNull(),
  data: jsonb('data').notNull(),
  dispatched: boolean('dispatched').notNull().default(false),
  dispatch_attempts: integer('dispatch_attempts').notNull().default(0),
  retry_at: bigint('retry_at', { mode: 'bigint' }).notNull().default(0n),
  dispatch_error: text('dispatch_error'),
  dispatch_blocked: boolean('dispatch_blocked').notNull().default(false),
});

export const fulfilment_slots = pgTable('fulfilment_slots', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  seller_id: text('seller_id')
    .notNull()
    .references(() => sellers.id),
  area_key: text('area_key').notNull(),
  purpose: text('purpose').notNull(),
  mode: text('mode').notNull(),
  starts_at: bigint('starts_at', { mode: 'bigint' }).notNull(),
  ends_at: bigint('ends_at', { mode: 'bigint' }).notNull(),
  capacity: integer('capacity').notNull(),
  booked: integer('booked').notNull().default(0),
});
export const slot_reservations = pgTable('slot_reservations', {
  id: text('id').primaryKey(),
  currency: text('currency').notNull().default('INR'),
  slot_id: text('slot_id')
    .notNull()
    .references(() => fulfilment_slots.id),
  order_id: text('order_id')
    .notNull()
    .references(() => orders.id),
  purpose: text('purpose').notNull(),
  active: boolean('active').notNull().default(true),
  created_at: bigint('created_at', { mode: 'bigint' }).notNull(),
  released_at: bigint('released_at', { mode: 'bigint' }),
});
