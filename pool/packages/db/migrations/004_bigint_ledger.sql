-- POOL bigint adapter over vendored pgledger commit 5e2c1fe2ee7bf471ddca3097e1c1acbb17b562a6.
-- Source: https://github.com/pgr0ss/pgledger ; vendor remains unchanged.
-- DDL: https://www.postgresql.org/docs/18/sql-altertable.html
-- Numeric validation: https://www.postgresql.org/docs/18/functions-math.html
DROP VIEW pgledger_accounts_view CASCADE;
DROP VIEW pgledger_transfers_view CASCADE;
DROP VIEW pgledger_entries_view CASCADE;
ALTER TABLE pgledger_accounts ALTER COLUMN balance TYPE bigint USING balance::bigint;
ALTER TABLE pgledger_transfers ALTER COLUMN amount TYPE bigint USING amount::bigint;
ALTER TABLE pgledger_entries ALTER COLUMN amount TYPE bigint USING amount::bigint,
 ALTER COLUMN account_previous_balance TYPE bigint USING account_previous_balance::bigint,
 ALTER COLUMN account_current_balance TYPE bigint USING account_current_balance::bigint;
ALTER TABLE pgledger_transfers ADD COLUMN currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR');
ALTER TABLE pgledger_entries ADD COLUMN currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR');
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pgledger_accounts WHERE name NOT LIKE 'external:%' AND balance<0) THEN
  RAISE EXCEPTION 'Existing internal negative balances need reconciliation';
 END IF;
END $$;
UPDATE pgledger_accounts SET allow_negative_balance=false WHERE name NOT LIKE 'external:%';
CREATE TRIGGER profiles_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON fulfilment_profiles FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();
CREATE TRIGGER ledger_entries_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON pgledger_entries FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();
CREATE TRIGGER ledger_transfers_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON pgledger_transfers FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();

CREATE VIEW pgledger_accounts_view AS
SELECT
    id,
    name,
    currency,
    balance,
    version,
    allow_negative_balance,
    allow_positive_balance,
    metadata,
    created_at,
    updated_at
FROM pgledger_accounts;

CREATE VIEW pgledger_transfers_view AS
SELECT
    id,
    from_account_id,
    to_account_id,
    amount,
    created_at,
    event_at,
    metadata
FROM pgledger_transfers;

CREATE VIEW pgledger_entries_view AS
SELECT
    e.id,
    e.account_id,
    e.transfer_id,
    e.amount,
    e.account_previous_balance,
    e.account_current_balance,
    e.account_version,
    e.created_at,
    t.event_at,
    t.metadata
FROM pgledger_entries e
INNER JOIN pgledger_transfers t ON e.transfer_id = t.id;

CREATE OR REPLACE FUNCTION pgledger_create_account(
    name TEXT,
    currency TEXT,
    allow_negative_balance BOOLEAN DEFAULT TRUE,
    allow_positive_balance BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT NULL
)
RETURNS SETOF PGLEDGER_ACCOUNTS_VIEW
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO pgledger_accounts (name, currency, allow_negative_balance, allow_positive_balance, metadata, created_at, updated_at)
    VALUES (name, currency, allow_negative_balance, allow_positive_balance, metadata, now(), now())
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check account balance constraints
CREATE OR REPLACE FUNCTION pgledger_check_account_balance_constraints(account PGLEDGER_ACCOUNTS) RETURNS VOID AS $$
BEGIN
    -- If account doesn't allow negative balance and balance is negative, raise an error
    IF NOT account.allow_negative_balance AND (account.balance < 0) THEN
        RAISE EXCEPTION 'Account (id=%, name=%) does not allow negative balance', account.id, account.name;
    END IF;

    -- If account doesn't allow positive balance and balance is positive, raise an error
    IF NOT account.allow_positive_balance AND (account.balance > 0) THEN
        RAISE EXCEPTION 'Account (id=%, name=%) does not allow positive balance', account.id, account.name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Define a composite type for transfer requests
-- Retain upstream numeric input type; reject fractional inputs before bigint storage.

CREATE OR REPLACE FUNCTION pgledger_create_transfer(
    from_account_id TEXT,
    to_account_id TEXT,
    amount NUMERIC,
    event_at TIMESTAMPTZ DEFAULT NULL,
    metadata JSONB DEFAULT NULL
)
RETURNS SETOF PGLEDGER_TRANSFERS_VIEW
AS $$
BEGIN
    -- Simply call pgledger_create_transfers with a single transfer
    RETURN QUERY
    SELECT * FROM pgledger_create_transfers(
        transfer_requests => array[(from_account_id, to_account_id, amount)::TRANSFER_REQUEST],
        event_at => event_at,
        metadata => metadata
    );
END;
$$ LANGUAGE plpgsql;

-- Function to create multiple transfers in a single transaction without an event_at
CREATE OR REPLACE FUNCTION pgledger_create_transfers(VARIADIC transfer_requests TRANSFER_REQUEST [])
RETURNS SETOF PGLEDGER_TRANSFERS_VIEW
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM pgledger_create_transfers(transfer_requests);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pgledger_create_transfers(
    transfer_requests TRANSFER_REQUEST [],
    event_at TIMESTAMPTZ DEFAULT NULL,
    metadata JSONB DEFAULT NULL
)
RETURNS SETOF PGLEDGER_TRANSFERS_VIEW
AS $$
DECLARE
    transfer_request transfer_request;
    transfer_ids TEXT[] := '{}';
    transfer_id TEXT;
    from_account pgledger_accounts;
    to_account pgledger_accounts;
    from_account_id TEXT;
    to_account_id TEXT;
    all_account_ids TEXT[] := '{}';
BEGIN
    -- Collect all unique account IDs and sort them to prevent deadlocks
    FOREACH transfer_request IN ARRAY transfer_requests LOOP
        all_account_ids := array_append(all_account_ids, transfer_request.from_account_id);
        all_account_ids := array_append(all_account_ids, transfer_request.to_account_id);
    END LOOP;

    -- Remove duplicates and sort
    SELECT ARRAY(SELECT DISTINCT unnest FROM unnest(all_account_ids) ORDER BY unnest)
    INTO all_account_ids;

    -- Lock all accounts in order
    FOREACH from_account_id IN ARRAY all_account_ids LOOP
        PERFORM pgledger_accounts.id
        FROM pgledger_accounts
        WHERE pgledger_accounts.id = from_account_id
        FOR UPDATE;
    END LOOP;

    -- Process each transfer
    FOREACH transfer_request IN ARRAY transfer_requests LOOP
        -- Preliminary checks
        IF transfer_request.amount <> trunc(transfer_request.amount) THEN
            RAISE EXCEPTION 'Transfer requires integer paise';
        END IF;
        IF transfer_request.amount <= 0 THEN
            RAISE EXCEPTION 'Amount (%) must be positive', transfer_request.amount;
        END IF;

        IF transfer_request.from_account_id = transfer_request.to_account_id THEN
            RAISE EXCEPTION 'Cannot transfer to the same account (id=%)', transfer_request.from_account_id;
        END IF;

        -- Update account balances
        UPDATE pgledger_accounts
        SET balance = balance - transfer_request.amount,
            version = version + 1,
            updated_at = now()
        WHERE pgledger_accounts.id = transfer_request.from_account_id
        RETURNING * INTO from_account;

        -- Check balance constraints for the source account
        PERFORM pgledger_check_account_balance_constraints(from_account);

        UPDATE pgledger_accounts
        SET balance = balance + transfer_request.amount,
            version = version + 1,
            updated_at = now()
        WHERE pgledger_accounts.id = transfer_request.to_account_id
        RETURNING * INTO to_account;

        -- Check balance constraints for the destination account
        PERFORM pgledger_check_account_balance_constraints(to_account);

        -- Check that currencies match
        IF from_account.currency != to_account.currency THEN
            RAISE EXCEPTION 'Cannot transfer between different currencies (% and %)', from_account.currency, to_account.currency;
        END IF;

        -- Create transfer record
        INSERT INTO pgledger_transfers (from_account_id, to_account_id, amount, created_at, event_at, metadata)
        VALUES (transfer_request.from_account_id, transfer_request.to_account_id, transfer_request.amount, now(), coalesce(event_at, now()), metadata)
        RETURNING pgledger_transfers.id INTO transfer_id;

        transfer_ids := array_append(transfer_ids, transfer_id);

        -- Create entry for the source account (negative amount)
        INSERT INTO pgledger_entries (account_id, transfer_id, amount, account_previous_balance, account_current_balance, account_version, created_at)
        VALUES (transfer_request.from_account_id, transfer_id, -transfer_request.amount, from_account.balance + transfer_request.amount, from_account.balance, from_account.version, now());

        -- Create entry for the destination account (positive amount)
        INSERT INTO pgledger_entries (account_id, transfer_id, amount, account_previous_balance, account_current_balance, account_version, created_at)
        VALUES (transfer_request.to_account_id, transfer_id, transfer_request.amount, to_account.balance - transfer_request.amount, to_account.balance, to_account.version, now());
    END LOOP;

    -- Return all created transfers
    RETURN QUERY
    SELECT *
    FROM pgledger_transfers_view
    WHERE id = ANY(transfer_ids)
    ORDER BY id;
END;
$$ LANGUAGE plpgsql;
