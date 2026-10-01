export function validateEnv(env: NodeJS.ProcessEnv = process.env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required in pool/.env');
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw new Error('DATABASE_URL must be a PostgreSQL URL');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    !url.pathname.slice(1)
  )
    throw new Error('DATABASE_URL must specify PostgreSQL host/database');
  if (!env.CODE_SECRET || env.CODE_SECRET.length < 32 || env.CODE_SECRET.startsWith('REPLACE'))
    throw new Error('CODE_SECRET must contain 32+ locally generated characters');
  return { databaseUrl: env.DATABASE_URL, codeSecret: env.CODE_SECRET };
}
