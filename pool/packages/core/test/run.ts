import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { validateEnv } from '@pool/db';
import { verifyRestore } from './restore-fixture.ts';

// Each run proves migrations from an empty REAL Docker PostgreSQL database.
// https://www.postgresql.org/docs/18/sql-createdatabase.html
// https://www.postgresql.org/docs/18/sql-dropdatabase.html
const url = new URL(validateEnv().databaseUrl);
const admin = new pg.Pool({ connectionString: url.toString() });
const name = 'pool_test_' + randomUUID().replaceAll('-', '');
if (!/^pool_test_[a-f0-9]{32}$/.test(name)) throw new Error('invalid generated test database name');
let created = false;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  created = true;
  url.pathname = '/' + name;
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)), 'run'],
    {
      env: { ...process.env, DATABASE_URL: url.toString() },
      stdio: 'inherit',
    },
  );
  process.exitCode = await new Promise<number>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  if (process.exitCode === 0) await verifyRestore(url, admin, name);
} finally {
  // Only the unique database created above is eligible for cleanup; never the configured app database.
  if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
  await admin.end();
}
