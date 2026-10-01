import type { Pool, PoolClient } from 'pg';

export interface ReconciliationFinding {
  check: string;
  id: string;
}
/** Read-only, single consistent snapshot. No balancing entries or repairs are invented.
 * https://www.postgresql.org/docs/18/transaction-iso.html
 * https://www.postgresql.org/docs/18/functions-aggregate.html
 * https://www.postgresql.org/docs/18/functions-json.html
 * https://www.postgresql.org/docs/18/functions-window.html
 */
export async function reconcileLedger(db: Pool) {
  const c = await db.connect();
  try {
    await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const findings = await inspect(c);
    const trial = (
      await c.query('SELECT coalesce(sum(amount),0)::text total FROM pgledger_entries')
    ).rows[0].total as string;
    await c.query('COMMIT');
    return { ok: findings.length === 0 && trial === '0', trialBalanceMinor: trial, findings };
  } catch (error) {
    await c.query('ROLLBACK');
    throw error;
  } finally {
    c.release();
  }
}
async function inspect(c: PoolClient): Promise<ReconciliationFinding[]> {
  const findings: ReconciliationFinding[] = [];
  const checks: [string, string][] = [
    [
      'SLOT_CAPACITY',
      `SELECT s.id FROM fulfilment_slots s LEFT JOIN slot_reservations r ON r.slot_id=s.id AND r.active
       GROUP BY s.id HAVING s.booked<>count(r.id)`,
    ],
    [
      'ACCOUNT_BALANCE',
      `SELECT a.id FROM pgledger_accounts a LEFT JOIN pgledger_entries e ON e.account_id=a.id
      GROUP BY a.id HAVING a.balance <> coalesce(sum(e.amount),0) OR a.version <> count(e.id)`,
    ],
    [
      'TRANSFER_ENTRIES',
      `SELECT t.id FROM pgledger_transfers t LEFT JOIN pgledger_entries e ON e.transfer_id=t.id
      GROUP BY t.id HAVING count(e.id)<>2 OR sum(e.amount)<>0
      OR count(*) FILTER (WHERE e.account_id=t.from_account_id AND e.amount=-t.amount)<>1
      OR count(*) FILTER (WHERE e.account_id=t.to_account_id AND e.amount=t.amount)<>1`,
    ],
    [
      'ENTRY_CHAIN',
      `SELECT id FROM (SELECT id,amount,account_previous_balance,account_current_balance,account_version,
      lag(account_current_balance,1,0::bigint) OVER (PARTITION BY account_id ORDER BY account_version) previous,
      row_number() OVER (PARTITION BY account_id ORDER BY account_version) expected_version FROM pgledger_entries) e
      WHERE account_previous_balance<>previous OR account_current_balance<>account_previous_balance+amount OR account_version<>expected_version`,
    ],
    [
      'MONEY_EVENT_TRANSFER',
      `SELECT m.id FROM money_events m
      LEFT JOIN ledger_account_map f ON f.id=m.data->>'from' LEFT JOIN ledger_account_map t ON t.id=m.data->>'to'
      WHERE (SELECT count(*) FROM pgledger_transfers p WHERE p.metadata->>'key'=m.event_key AND p.amount=m.amount_minor
        AND p.from_account_id=f.ledger_id AND p.to_account_id=t.ledger_id)<>1`,
    ],
    [
      'UNJOURNALLED_TRANSFER',
      `SELECT t.id FROM pgledger_transfers t WHERE NOT EXISTS
      (SELECT 1 FROM money_events m WHERE m.event_key=t.metadata->>'key')`,
    ],
    [
      'NEGATIVE_INTERNAL_ACCOUNT',
      "SELECT id FROM pgledger_accounts WHERE name NOT LIKE 'external:%' AND balance<0",
    ],
    [
      'ORDER_PROJECTION',
      "SELECT o.id FROM orders o LEFT JOIN aggregates a ON a.id=o.id AND a.kind='order' WHERE a.id IS NULL OR a.data IS DISTINCT FROM o.data",
    ],
    [
      'POOL_PROJECTION',
      "SELECT p.id FROM pools p LEFT JOIN aggregates a ON a.id=p.id AND a.kind='pool' WHERE a.id IS NULL OR a.data IS DISTINCT FROM p.data",
    ],
  ];
  for (const [check, sql] of checks) {
    const rows = await c.query(sql);
    findings.push(...rows.rows.map((row) => ({ check, id: row.id as string })));
  }
  return findings;
}
