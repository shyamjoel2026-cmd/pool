import type { Pool } from 'pg';
/** Read the retained state journal and reject a missing/reordered/altered revision.
 * A legacy baseline is explicit; history before that baseline is never invented.
 * https://www.postgresql.org/docs/18/transaction-iso.html
 * https://www.postgresql.org/docs/18/functions-binarystring.html
 */
export async function readVerifiedHistory(db: Pool, id: string) {
  const c = await db.connect();
  try {
    await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const rows = (
      await c.query(
        'SELECT *,pool_state_hash(aggregate_id,version,kind,data,previous_hash) expected_hash FROM aggregate_history WHERE aggregate_id=$1 ORDER BY version',
        [id],
      )
    ).rows;
    if (!rows.length) throw new Error('aggregate history missing');
    let previous = '',
      version = BigInt(rows[0].version) - 1n;
    if (rows[0].version !== '0' && !rows[0].legacy_baseline)
      throw new Error('history beginning missing');
    for (const row of rows) {
      if (
        BigInt(row.version) !== version + 1n ||
        row.previous_hash !== previous ||
        row.state_hash !== row.expected_hash
      )
        throw new Error('aggregate history integrity failure');
      previous = row.state_hash;
      version = BigInt(row.version);
    }
    const head = (await c.query('SELECT version,kind,data FROM aggregates WHERE id=$1', [id]))
      .rows[0];
    const last = rows.at(-1)!;
    const matches = (await c.query('SELECT $1::jsonb=$2::jsonb same', [head?.data, last.data]))
      .rows[0].same;
    if (!head || head.version !== last.version || head.kind !== last.kind || !matches)
      throw new Error('aggregate history head mismatch');
    await c.query('COMMIT');
    return {
      id,
      kind: head.kind,
      version: head.version,
      state: head.data,
      legacyBaseline: rows[0].legacy_baseline,
      revisions: rows.length,
    };
  } catch (error) {
    await c.query('ROLLBACK');
    throw error;
  } finally {
    c.release();
  }
}
