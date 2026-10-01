-- Defense in depth for persisted money and immutable business evidence.
-- https://www.postgresql.org/docs/18/ddl-constraints.html
-- https://www.postgresql.org/docs/18/sql-createtrigger.html
-- https://www.postgresql.org/docs/18/indexes-expressional.html
ALTER TABLE bids ADD CONSTRAINT bid_price_positive CHECK(seller_price_minor > 0);
ALTER TABLE price_decisions ADD CONSTRAINT buyer_price_positive CHECK(buyer_price_minor > 0);
ALTER TABLE orders ADD CONSTRAINT order_totals_positive CHECK(buyer_total_minor > 0 AND seller_total_minor > 0);
ALTER TABLE offers ADD CONSTRAINT offer_total_positive CHECK(buyer_total_minor > 0);
ALTER TABLE wave_pots ADD CONSTRAINT wave_pot_nonnegative CHECK(pot_minor >= 0);
ALTER TABLE product_sources ADD CONSTRAINT source_price_nonnegative CHECK(price_minor IS NULL OR price_minor >= 0);
ALTER TABLE money_events ADD CONSTRAINT money_event_positive CHECK(amount_minor > 0);
ALTER TABLE aggregates ADD CONSTRAINT aggregate_version_nonnegative CHECK(version >= 0);
CREATE TRIGGER receipts_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON payments FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();
CREATE TRIGGER idempotency_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON idempotency_keys FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();
CREATE TRIGGER offers_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON offers FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();
CREATE TRIGGER order_steps_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON order_steps FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();
CREATE TRIGGER order_proofs_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON order_proofs FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();
CREATE TRIGGER wave_pots_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON wave_pots FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();
CREATE INDEX outbox_pending_due ON workflow_outbox(due_at,id) WHERE NOT dispatched;
CREATE INDEX outbox_aggregate ON workflow_outbox((data->>'aggregateId'));
CREATE INDEX orders_pool ON orders(pool_id);
CREATE INDEX members_pool ON pool_members(pool_id);
CREATE UNIQUE INDEX ledger_account_entry_version ON pgledger_entries(account_id,account_version);
