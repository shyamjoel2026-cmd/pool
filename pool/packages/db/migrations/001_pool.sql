-- PostgreSQL 18 syntax/functions: https://www.postgresql.org/docs/18/sql-createtable.html
-- Triggers: https://www.postgresql.org/docs/18/sql-createtrigger.html
-- pgledger upstream pinned 5e2c1fe2ee7bf471ddca3097e1c1acbb17b562a6, MIT.
-- https://github.com/pgr0ss/pgledger/tree/5e2c1fe2ee7bf471ddca3097e1c1acbb17b562a6
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE users (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'),  data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE sellers (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), gstin text, state_code text, payout_ref text, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE products (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), hsn_code text NOT NULL, gst_rate_bps integer NOT NULL CHECK(gst_rate_bps>=0), data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE units (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), base_scale bigint NOT NULL CHECK(base_scale>0), data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE fulfilment_profiles (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'),  data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE addresses (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), user_id text REFERENCES users(id), pincode text CHECK(pincode ~ '^[1-9][0-9]{5}$'), state_code text, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE product_sources (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), product_id text REFERENCES products(id), source_url text, price_minor bigint, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE pools (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), closes_at timestamptz NOT NULL, state text NOT NULL, quantity_rule jsonb NOT NULL, booking_rule jsonb NOT NULL, checkout_plan text NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE pool_members (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), pool_id text NOT NULL REFERENCES pools(id), booking_minor bigint NOT NULL DEFAULT 0, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE bids (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), pool_id text NOT NULL REFERENCES pools(id), seller_id text NOT NULL REFERENCES sellers(id), revision integer NOT NULL, seller_price_minor bigint NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE bid_access_log (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), bid_id text NOT NULL REFERENCES bids(id), actor_id text NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE price_decisions (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), pool_id text NOT NULL REFERENCES pools(id), bid_id text NOT NULL REFERENCES bids(id), buyer_price_minor bigint NOT NULL, decided_by text NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE assignments (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), pool_id text NOT NULL REFERENCES pools(id), member_id text NOT NULL REFERENCES pool_members(id), bid_id text NOT NULL REFERENCES bids(id), data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE offers (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), pool_id text NOT NULL REFERENCES pools(id), member_id text NOT NULL REFERENCES pool_members(id), buyer_total_minor bigint NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE orders (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), pool_id text NOT NULL REFERENCES pools(id), buyer_total_minor bigint NOT NULL, seller_total_minor bigint NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE order_steps (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), order_id text NOT NULL REFERENCES orders(id), proof_ref text NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE order_proofs (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), order_id text NOT NULL REFERENCES orders(id), proof_ref text NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE handover_codes (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), order_id text NOT NULL REFERENCES orders(id), hash text NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE payments (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), order_id text REFERENCES orders(id), pa_reference text NOT NULL, amount_minor bigint NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE wave_pots (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), pool_id text NOT NULL REFERENCES pools(id), pot_minor bigint NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE audit_events (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), aggregate_id text NOT NULL, event_type text NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE idempotency_keys (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), request_hash text NOT NULL, result jsonb NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE aggregates (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), kind text NOT NULL, version bigint NOT NULL DEFAULT 0, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE money_events (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), event_key text NOT NULL UNIQUE, amount_minor bigint NOT NULL, data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE ledger_account_map (id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), ledger_id text NOT NULL UNIQUE REFERENCES pgledger_accounts(id), data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX bids_revision_unique ON bids(pool_id,seller_id,revision);
CREATE UNIQUE INDEX member_assignment_unique ON assignments(pool_id,member_id);
CREATE INDEX audit_aggregate ON audit_events(aggregate_id,created_at,id);
CREATE FUNCTION pool_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'append-only table'; END $$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_events FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();
CREATE TRIGGER bids_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON bids FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();
CREATE TRIGGER bid_access_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON bid_access_log FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();
-- Upstream NUMERIC fields remain untouched; constraints enforce integral INR paise.
ALTER TABLE pgledger_accounts ADD CONSTRAINT paise_balance CHECK(balance=trunc(balance) AND currency='INR');
ALTER TABLE pgledger_transfers ADD CONSTRAINT paise_transfer CHECK(amount=trunc(amount));
ALTER TABLE pgledger_entries ADD CONSTRAINT paise_entry CHECK(amount=trunc(amount));
