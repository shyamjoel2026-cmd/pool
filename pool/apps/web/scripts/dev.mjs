import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Keep the single repository .env as the source of local secrets. Loading it here
// avoids propagating Node's --env-file flag through Next's Windows child process.
const envPath = resolve(process.cwd(), '../..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}
await import('next/dist/bin/next');
