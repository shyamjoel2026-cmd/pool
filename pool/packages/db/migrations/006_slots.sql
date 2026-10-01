-- https://www.postgresql.org/docs/18/ddl-constraints.html
-- https://www.postgresql.org/docs/18/indexes-partial.html
CREATE TABLE fulfilment_slots (
 id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'),
 seller_id text NOT NULL REFERENCES sellers(id), area_key text NOT NULL,
 purpose text NOT NULL CHECK(length(purpose)>0), mode text NOT NULL,
 starts_at bigint NOT NULL, ends_at bigint NOT NULL, capacity integer NOT NULL CHECK(capacity>0),
 booked integer NOT NULL DEFAULT 0 CHECK(booked>=0 AND booked<=capacity),
 CHECK(ends_at>starts_at)
);
CREATE TABLE slot_reservations (
 id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'),
 slot_id text NOT NULL REFERENCES fulfilment_slots(id), order_id text NOT NULL REFERENCES orders(id),
 purpose text NOT NULL, active boolean NOT NULL DEFAULT true,
 created_at bigint NOT NULL, released_at bigint
);
CREATE UNIQUE INDEX active_order_slot_purpose ON slot_reservations(order_id,purpose) WHERE active;
CREATE INDEX available_slot_area_time ON fulfilment_slots(area_key,starts_at);
CREATE INDEX slot_reservations_slot ON slot_reservations(slot_id) WHERE active;
