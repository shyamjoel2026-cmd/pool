import { readFile } from 'node:fs/promises';
import { connect } from './index.ts';
import { pathToFileURL } from 'node:url';
export async function migrate() {
  const { pool } = connect();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Transaction-scoped lock: https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS
    await client.query('SELECT pg_advisory_xact_lock(7015002)');
    await client.query(
      "CREATE TABLE IF NOT EXISTS pool_migrations(id text PRIMARY KEY, currency text NOT NULL DEFAULT 'INR', applied_at timestamptz DEFAULT now())",
    );
    if (!(await client.query("SELECT id FROM pool_migrations WHERE id='001'")).rowCount) {
      for (const file of [
        'vendor/ulid-to-uuid.sql',
        'vendor/uuid-to-ulid.sql',
        'vendor/pgledger.sql',
        'migrations/001_pool.sql',
      ])
        await client.query(await readFile(new URL('../' + file, import.meta.url), 'utf8'));
      await client.query("INSERT INTO pool_migrations(id) VALUES('001')");
    }
    if (!(await client.query("SELECT id FROM pool_migrations WHERE id='002'")).rowCount) {
      await client.query(
        await readFile(new URL('../migrations/002_durability.sql', import.meta.url), 'utf8'),
      );
      await client.query("INSERT INTO pool_migrations(id) VALUES('002')");
    }
    if (!(await client.query("SELECT id FROM pool_migrations WHERE id='003'")).rowCount) {
      await client.query(
        await readFile(new URL('../migrations/003_receipts.sql', import.meta.url), 'utf8'),
      );
      await client.query("INSERT INTO pool_migrations(id) VALUES('003')");
    }
    if (!(await client.query("SELECT id FROM pool_migrations WHERE id='004'")).rowCount) {
      await client.query(
        await readFile(new URL('../migrations/004_bigint_ledger.sql', import.meta.url), 'utf8'),
      );
      await client.query("INSERT INTO pool_migrations(id) VALUES('004')");
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  migrate()
    .then(() => console.log('Migrations applied: 001, 002, 003, 004'))
    .catch(() => {
      console.error(
        'Migration failed; check database availability and migration SQL (credentials redacted)',
      );
      process.exitCode = 1;
    });
