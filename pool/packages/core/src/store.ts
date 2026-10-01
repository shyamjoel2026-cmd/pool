import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
export interface Posting {
  from: string;
  to: string;
  minor: number;
  key: string;
}
export interface Change<T> {
  state: T;
  events: readonly { type: string; [key: string]: unknown }[];
  postings: readonly Posting[];
}
// pgledger API pinned to vendor commit; https://github.com/pgr0ss/pgledger
async function account(client: PoolClient, name: string) {
  // hashtextextended: https://raw.githubusercontent.com/postgres/postgres/REL_18_0/src/backend/access/hash/hashfunc.c
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['account:' + name]);
  const existing = await client.query('SELECT ledger_id FROM ledger_account_map WHERE id=$1', [
    name,
  ]);
  if (existing.rowCount) return existing.rows[0].ledger_id as string;
  const created = await client.query("SELECT id FROM pgledger_create_account($1,'INR',$2,true)", [
    name,
    name.startsWith('external:'),
  ]);
  const id = created.rows[0].id as string;
  await client.query('INSERT INTO ledger_account_map(id,ledger_id) VALUES($1,$2)', [name, id]);
  return id;
}
export async function post(client: PoolClient, p: Posting) {
  if (!Number.isSafeInteger(p.minor) || p.minor < 0)
    throw new Error('ledger requires nonnegative integer paise');
  if (p.minor === 0) return;
  const existing = await client.query('SELECT data FROM money_events WHERE event_key=$1', [p.key]);
  if (existing.rowCount) {
    if (JSON.stringify(existing.rows[0].data) !== JSON.stringify(JSON.parse(JSON.stringify(p)))) {
      const d = existing.rows[0].data as Posting;
      if (d.from !== p.from || d.to !== p.to || d.minor !== p.minor)
        throw new Error('money idempotency conflict');
    }
    return;
  }
  const ids = new Map<string, string>();
  for (const name of [...new Set([p.from, p.to])].sort())
    ids.set(name, await account(client, name));
  await client.query('SELECT id FROM pgledger_create_transfer($1,$2,$3::numeric,NULL,$4::jsonb)', [
    ids.get(p.from),
    ids.get(p.to),
    String(p.minor),
    JSON.stringify({ key: p.key, unit: 'paise' }),
  ]);
  await client.query(
    'INSERT INTO money_events(id,event_key,amount_minor,data) VALUES($1,$2,$3,$4)',
    [randomUUID(), p.key, String(p.minor), p],
  );
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value) ?? 'null';
}
/** Trusted service callers still cannot persist NaN, infinity, cycles, or fractional money.
 * JSON otherwise silently converts NaN to null, destroying replay fidelity.
 */
function validatePersistable(value: unknown, seen = new Set<object>()): void {
  if (
    typeof value === 'number' &&
    (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))
  )
    throw new Error('persisted numbers must be finite and integers must be safe');
  if (typeof value === 'bigint' || typeof value === 'function' || typeof value === 'symbol')
    throw new Error('unsupported persisted value');
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) throw new Error('cyclic persisted value');
  if (
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) !== Object.prototype &&
    Object.getPrototypeOf(value) !== null
  )
    throw new Error('persisted values must be plain JSON data');
  const object = value as Record<string, unknown>;
  if (
    'minor' in object &&
    'currency' in object &&
    (object.currency !== 'INR' || !Number.isSafeInteger(object.minor))
  )
    throw new Error('persisted money must be integer INR paise');
  seen.add(value);
  for (const item of Object.values(value)) validatePersistable(item, seen);
  seen.delete(value);
}
/** One DB transaction owns command deduplication, state, audit journal and money transfers.
 * Locks: https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS
 * Driver transactions: https://node-postgres.com/features/transactions
 */
export async function command<T>(
  db: Pool,
  id: string,
  kind: string,
  key: string,
  request: unknown,
  reduce: (state: T | undefined, client: PoolClient) => Change<T> | Promise<Change<T>>,
  project?: (c: PoolClient, state: T) => Promise<void>,
): Promise<T> {
  if (!id.trim() || !kind.trim() || !key.trim())
    throw new Error('command identity, kind and key required');
  validatePersistable(request);
  const client = await db.connect();
  const hash = createHash('sha256').update(canonical({ id, kind, request })).digest('hex');
  try {
    await client.query('BEGIN');
    // Prototype serializes commands to avoid cross-aggregate money deadlocks. Scale after profiling.
    await client.query('SELECT pg_advisory_xact_lock(7015003)');
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['command:' + key]);
    const previous = await client.query(
      'SELECT request_hash,result FROM idempotency_keys WHERE id=$1',
      [key],
    );
    if (previous.rowCount) {
      if (previous.rows[0].request_hash !== hash)
        throw new Error('idempotency key reused for another request');
      await client.query('COMMIT');
      return previous.rows[0].result as T;
    }
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['aggregate:' + id]);
    const loaded = await client.query('SELECT data,kind FROM aggregates WHERE id=$1 FOR UPDATE', [
      id,
    ]);
    if (loaded.rowCount && loaded.rows[0].kind !== kind) throw new Error('aggregate kind mismatch');
    const change = await reduce(loaded.rows[0]?.data as T | undefined, client);
    validatePersistable(change);
    for (const event of change.events)
      await client.query(
        'INSERT INTO audit_events(id,aggregate_id,event_type,data) VALUES($1,$2,$3,$4)',
        [randomUUID(), id, event.type, event],
      );
    for (const posting of change.postings) await post(client, posting);
    await client.query(
      'INSERT INTO aggregates(id,kind,data) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET data=excluded.data,version=aggregates.version+1',
      [id, kind, change.state],
    );
    if (project) await project(client, change.state);
    await client.query('INSERT INTO idempotency_keys(id,request_hash,result) VALUES($1,$2,$3)', [
      key,
      hash,
      change.state,
    ]);
    await client.query('COMMIT');
    return change.state;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
