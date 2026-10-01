import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import pg from 'pg';

// Only isolated generated test databases may be copied or removed.
// https://www.postgresql.org/docs/18/app-pgdump.html
// https://www.postgresql.org/docs/18/app-pgrestore.html
// https://docs.docker.com/reference/cli/docker/compose/exec/
// https://nodejs.org/api/child_process.html
export async function verifyRestore(source: URL, admin: pg.Pool, sourceName: string) {
  if (!/^pool_test_[a-f0-9]{32}$/.test(sourceName) || source.pathname !== '/' + sourceName)
    throw new Error('restore verification requires a generated test database');
  const targetName = sourceName + '_restore';
  const target = new URL(source);
  target.pathname = '/' + targetName;
  const docker = join(
    process.env.LOCALAPPDATA ?? '',
    'Programs',
    'DockerDesktop',
    'resources',
    'bin',
    'docker.exe',
  );
  const cwd = fileURLToPath(new URL('../../../', import.meta.url));
  const run = (args: string[], input?: Buffer) =>
    new Promise<Buffer>((resolve, reject) => {
      const child = spawn(docker, ['compose', 'exec', '-T', 'postgres', ...args], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const chunks: Buffer[] = [];
      child.stdout.on('data', (chunk) => chunks.push(chunk));
      // Never print dump contents, connection strings or unsanitized subprocess errors.
      child.stderr.resume();
      child.once('error', () => reject(new Error('Docker backup/restore process could not start')));
      child.once('exit', (code) =>
        code === 0
          ? resolve(Buffer.concat(chunks))
          : reject(new Error('Docker backup/restore failed')),
      );
      child.stdin.on('error', () => {});
      child.stdin.end(input);
    });
  let created = false;
  const original = new pg.Pool({ connectionString: source.toString() });
  const restored = new pg.Pool({ connectionString: target.toString() });
  try {
    const before = await fingerprint(original);
    const dump = await run(['pg_dump', '-U', 'pool', '-Fc', '--no-owner', '--no-acl', sourceName]);
    await admin.query(`CREATE DATABASE "${targetName}"`);
    created = true;
    await run(
      ['pg_restore', '-U', 'pool', '--exit-on-error', '--no-owner', '--no-acl', '-d', targetName],
      dump,
    );
    if (JSON.stringify(before) !== JSON.stringify(await fingerprint(restored)))
      throw new Error('restored table contents differ from backup source');
    const immutable = await restored.query(
      "SELECT tgname FROM pg_trigger WHERE tgrelid='audit_events'::regclass AND NOT tgisinternal",
    );
    if (!immutable.rowCount) throw new Error('audit protection absent after restore');
    const trial = (
      await restored.query('SELECT coalesce(sum(amount),0)::text value FROM pgledger_entries')
    ).rows[0].value;
    if (trial !== '0') throw new Error('restored ledger trial balance mismatch');
    console.log(
      `Backup/restore verified: ${before.length} table fingerprints match; ledger trial balance 0`,
    );
  } finally {
    await original.end();
    await restored.end();
    if (created) await admin.query(`DROP DATABASE "${targetName}" WITH (FORCE)`);
  }
}
async function fingerprint(db: pg.Pool) {
  // https://www.postgresql.org/docs/18/infoschema-tables.html
  // https://www.postgresql.org/docs/18/functions-json.html
  const tables = await db.query(
    "SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema IN ('public','dbos') AND table_type='BASE TABLE' ORDER BY table_schema,table_name",
  );
  const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"';
  const result: { table: string; hash: string }[] = [];
  for (const table of tables.rows) {
    const name = quote(table.table_schema) + '.' + quote(table.table_name);
    const rows = await db.query(
      `SELECT to_jsonb(t)::text value FROM ${name} t ORDER BY to_jsonb(t)::text`,
    );
    result.push({
      table: name,
      hash: createHash('sha256').update(JSON.stringify(rows.rows)).digest('hex'),
    });
  }
  return result;
}
