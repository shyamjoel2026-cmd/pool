-- Identity ordering: https://www.postgresql.org/docs/18/ddl-identity-columns.html
ALTER TABLE audit_events ADD COLUMN sequence bigint GENERATED ALWAYS AS IDENTITY;
CREATE UNIQUE INDEX audit_sequence ON audit_events(sequence);
CREATE TABLE workflow_outbox(id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'), kind text NOT NULL, due_at bigint NOT NULL, data jsonb NOT NULL, dispatched boolean NOT NULL DEFAULT false);
ALTER TABLE payments ADD CONSTRAINT payments_nonnegative CHECK(amount_minor>=0);
ALTER TABLE handover_codes ADD CONSTRAINT code_hash CHECK(hash ~ '^[0-9a-f]{64}$');
ALTER TABLE pools ADD CONSTRAINT checkout_plan_valid CHECK(checkout_plan IN ('PREPAY_FULL','BALANCE_AT_HANDOVER'));
ALTER TABLE pool_members ADD CONSTRAINT booking_nonnegative CHECK(booking_minor>=0);
CREATE TRIGGER prices_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON price_decisions FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();
CREATE TRIGGER money_events_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON money_events FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();
