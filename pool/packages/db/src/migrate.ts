import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { connect } from './index.ts';
import { pathToFileURL } from 'node:url';
// pgledger + vendored scoville ULID helpers: both copied from this immutable source tree.
// https://github.com/pgr0ss/pgledger/tree/5e2c1fe2ee7bf471ddca3097e1c1acbb17b562a6/vendor/scoville-pgsql-ulid
// BSD-3-Clause helper license preserved in vendor/ULID-LICENSE; MIT ledger license in vendor/LICENSE.
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
    // https://nodejs.org/api/crypto.html#class-hash
    // https://www.postgresql.org/docs/18/sql-altertable.html
    await client.query(
      'ALTER TABLE pool_migrations ADD COLUMN IF NOT EXISTS checksum text, ADD COLUMN IF NOT EXISTS legacy_baseline boolean NOT NULL DEFAULT false',
    );
    const sources = [
      [
        'vendor/ulid-to-uuid.sql',
        'vendor/uuid-to-ulid.sql',
        'vendor/pgledger.sql',
        'migrations/001_pool.sql',
      ],
      ['migrations/002_durability.sql'],
      ['migrations/003_receipts.sql'],
      ['migrations/004_bigint_ledger.sql'],
      ['migrations/005_foundation_constraints.sql'],
      ['migrations/006_slots.sql'],
      ['migrations/007_dispatch.sql'],
      ['migrations/008_state_history.sql'],
    ];
    const applied = await client.query('SELECT id,checksum FROM pool_migrations ORDER BY id');
    for (let i = 0; i < applied.rows.length; i++)
      if (i >= sources.length || applied.rows[i].id !== String(i + 1).padStart(3, '0'))
        throw new Error('migration history is not a known contiguous prefix');
    const checksums: string[] = [];
    for (const files of sources) {
      const sql = await Promise.all(
        files.map(async (file) => ({
          file,
          text: (await readFile(new URL('../' + file, import.meta.url), 'utf8')).replaceAll(
            '\r\n',
            '\n',
          ),
        })),
      );
      checksums.push(createHash('sha256').update(JSON.stringify(sql)).digest('hex'));
    }
    for (let i = 0; i < applied.rows.length; i++)
      if (applied.rows[i].checksum && applied.rows[i].checksum !== checksums[i])
        throw new Error('migration checksum mismatch: ' + applied.rows[i].id);
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
    if (!(await client.query("SELECT id FROM pool_migrations WHERE id='005'")).rowCount) {
      await client.query(
        await readFile(
          new URL('../migrations/005_foundation_constraints.sql', import.meta.url),
          'utf8',
        ),
      );
      await client.query("INSERT INTO pool_migrations(id) VALUES('005')");
    }
    if (!(await client.query("SELECT id FROM pool_migrations WHERE id='006'")).rowCount) {
      await client.query(
        await readFile(new URL('../migrations/006_slots.sql', import.meta.url), 'utf8'),
      );
      await client.query("INSERT INTO pool_migrations(id) VALUES('006')");
    }
    if (!(await client.query("SELECT id FROM pool_migrations WHERE id='007'")).rowCount) {
      await client.query(
        await readFile(new URL('../migrations/007_dispatch.sql', import.meta.url), 'utf8'),
      );
      await client.query("INSERT INTO pool_migrations(id) VALUES('007')");
    }
    if (!(await client.query("SELECT id FROM pool_migrations WHERE id='008'")).rowCount) {
      await client.query(
        await readFile(new URL('../migrations/008_state_history.sql', import.meta.url), 'utf8'),
      );
      await client.query("INSERT INTO pool_migrations(id) VALUES('008')");
    }
    for (let i = 0; i < checksums.length; i++) {
      const id = String(i + 1).padStart(3, '0');
      // Legacy adoption detects future drift; it cannot prove what SQL originally ran.
      const legacy = applied.rows.some((row) => row.id === id && !row.checksum);
      await client.query(
        'UPDATE pool_migrations SET checksum=$2,legacy_baseline=legacy_baseline OR $3 WHERE id=$1',
        [id, checksums[i], legacy],
      );
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
    .then(() => console.log('Migrations applied: 001, 002, 003, 004, 005, 006, 007, 008'))
    .catch(() => {
      console.error(
        'Migration failed; check database availability and migration SQL (credentials redacted)',
      );
      process.exitCode = 1;
    });
