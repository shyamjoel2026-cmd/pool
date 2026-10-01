import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { validateEnv } from './env.ts';
export * from './env.ts';
export * as schema from './schema.ts';
// Official driver APIs: https://node-postgres.com/features/transactions
// Drizzle adapter: https://orm.drizzle.team/docs/get-started/node-postgres
export function connect() {
  const config = validateEnv();
  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  return { pool, db: drizzle(pool) };
}
