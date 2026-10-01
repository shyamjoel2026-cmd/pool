import { beforeAll, afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { connect } from '@pool/db';
import { migrate } from '../../db/src/migrate.ts';
import { command, poolCommand } from '../src/index.ts';
import { reconcileLedger } from '../src/reconciliation.ts';
import * as e from '@pool/engine';
const { pool: db } = connect();
beforeAll(() => migrate(), 30000);
afterAll(() => db.end());
function create(id: string) {
  return e.createPool(
    e.INDIA_POLICY,
    {
      id,
      categoryPath: ['any'],
      productKey: 'any',
      areaKey: 'area',
      createdBy: 'u',
      createdAt: 0,
      closesAt: 3600000,
      quantityRule: { uom: e.UOM.piece, minBase: 1, stepBase: 1 },
      fulfilmentProfileId: 'f',
      waveCountMode: 'per_order',
      bookingRule: { kind: 'FIXED', amountMinor: 100, minMinor: 100, maxMinor: 100 },
      checkoutPlan: 'PREPAY_FULL',
      hsnCode: '9999',
      gstRateBps: 1800,
    },
    0,
  );
}
it('commands reject a projection identity mismatch without leaving an aggregate', async () => {
  const id = randomUUID();
  await expect(poolCommand(db, id, id, {}, () => create(id + ':other'))).rejects.toThrow(
    /identity/,
  );
  expect((await db.query('SELECT id FROM aggregates WHERE id=$1', [id])).rowCount).toBe(0);
});
it('database rejects negative order totals and immutable receipt/idempotency changes', async () => {
  const id = randomUUID();
  await poolCommand(db, id, id, {}, () => create(id));
  await expect(
    db.query(
      'INSERT INTO orders(id,pool_id,buyer_total_minor,seller_total_minor) VALUES($1,$2,-1,1)',
      [id + ':o', id],
    ),
  ).rejects.toThrow(/order_totals_positive/);
  await db.query('INSERT INTO payments(id,pa_reference,amount_minor) VALUES($1,$1,1)', [
    id + ':receipt',
  ]);
  await expect(
    db.query('UPDATE payments SET amount_minor=2 WHERE id=$1', [id + ':receipt']),
  ).rejects.toThrow(/append-only/);
  await expect(db.query('DELETE FROM idempotency_keys WHERE id=$1', [id])).rejects.toThrow(
    /append-only/,
  );
});
it('reconciliation detects corrupted account balances even when the overall trial balance is zero', async () => {
  const id = randomUUID();
  await command(db, id, 'test', id, {}, () => ({
    state: {},
    events: [],
    postings: [{ from: 'external:buyers', to: id + ':held', minor: 100, key: id }],
  }));
  const account = (
    await db.query('SELECT ledger_id FROM ledger_account_map WHERE id=$1', [id + ':held'])
  ).rows[0].ledger_id;
  expect((await reconcileLedger(db)).findings.filter((f) => f.id === account)).toEqual([]);
  await db.query('UPDATE pgledger_accounts SET balance=balance+1 WHERE id=$1', [account]);
  try {
    const result = await reconcileLedger(db);
    expect(result.trialBalanceMinor).toBe('0');
    expect(result.ok).toBe(false);
    expect(result.findings).toContainEqual({ check: 'ACCOUNT_BALANCE', id: account });
  } finally {
    await db.query('UPDATE pgledger_accounts SET balance=balance-1 WHERE id=$1', [account]);
  }
  expect((await reconcileLedger(db)).findings.filter((f) => f.id === account)).toEqual([]);
}, 30000);
