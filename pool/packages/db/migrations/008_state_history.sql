-- https://www.postgresql.org/docs/18/plpgsql-trigger.html
-- https://www.postgresql.org/docs/18/functions-binarystring.html
CREATE TABLE aggregate_history (
 aggregate_id text NOT NULL, version bigint NOT NULL, currency text NOT NULL DEFAULT 'INR' CHECK(currency='INR'),
 kind text NOT NULL, data jsonb NOT NULL, previous_hash text NOT NULL, state_hash text NOT NULL,
 legacy_baseline boolean NOT NULL DEFAULT false, PRIMARY KEY(aggregate_id,version)
);
CREATE FUNCTION pool_state_hash(id text, v bigint, k text, d jsonb, previous text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT encode(sha256(convert_to(jsonb_build_array(id,v,k,d,previous)::text,'UTF8')),'hex')
$$;
-- Existing rows are baseline snapshots, not invented historical revisions.
INSERT INTO aggregate_history(aggregate_id,version,kind,data,previous_hash,state_hash,legacy_baseline)
 SELECT id,version,kind,data,'',pool_state_hash(id,version,kind,data,''),true FROM aggregates;
CREATE FUNCTION pool_record_state() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous text;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW.kind<>OLD.kind OR NEW.version<>OLD.version+1) THEN
   RAISE EXCEPTION 'aggregate identity and consecutive revision required';
 END IF;
 IF TG_OP='INSERT' AND NEW.version<>0 THEN RAISE EXCEPTION 'new aggregate starts at revision zero'; END IF;
 SELECT state_hash INTO previous FROM aggregate_history WHERE aggregate_id=NEW.id ORDER BY version DESC LIMIT 1;
 previous:=coalesce(previous,'');
 INSERT INTO aggregate_history(aggregate_id,version,kind,data,previous_hash,state_hash)
 VALUES(NEW.id,NEW.version,NEW.kind,NEW.data,previous,pool_state_hash(NEW.id,NEW.version,NEW.kind,NEW.data,previous));
 RETURN NEW;
END $$;
CREATE TRIGGER aggregate_history_record AFTER INSERT OR UPDATE ON aggregates FOR EACH ROW EXECUTE FUNCTION pool_record_state();
CREATE TRIGGER history_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON aggregate_history FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();
CREATE TRIGGER aggregate_no_delete BEFORE DELETE OR TRUNCATE ON aggregates FOR EACH STATEMENT EXECUTE FUNCTION pool_append_only();
