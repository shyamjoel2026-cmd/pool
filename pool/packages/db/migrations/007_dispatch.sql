-- Dispatch failure metadata is operational, never raw exception text or credentials.
-- https://www.postgresql.org/docs/18/sql-altertable.html
-- https://www.postgresql.org/docs/18/indexes-partial.html
ALTER TABLE workflow_outbox
 ADD COLUMN dispatch_attempts integer NOT NULL DEFAULT 0 CHECK(dispatch_attempts>=0),
 ADD COLUMN retry_at bigint NOT NULL DEFAULT 0,
 ADD COLUMN dispatch_error text,
 ADD COLUMN dispatch_blocked boolean NOT NULL DEFAULT false;
CREATE INDEX workflow_outbox_retry ON workflow_outbox(retry_at,due_at)
 WHERE NOT dispatched AND NOT dispatch_blocked;
