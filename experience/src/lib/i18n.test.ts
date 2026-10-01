import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HI, TE } from './i18n-dict';

const SRC = fileURLToPath(new URL('..', import.meta.url));
const files = [...readdirSync(join(SRC, 'buyer')).filter((f: string) => f.endsWith('.tsx')).map((f: string) => join(SRC, 'buyer', f)), join(SRC, 'demo', 'Landing.tsx')];
const literal = /\btr\(\s*'((?:\\.|[^'\\])*)'/g;
const keys = new Set<string>();
for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(literal)) keys.add(m[1].replace(/\\'/g, "'"));
const ph = (s: string) => (s.match(/\{[a-z]+\}/g) ?? []).sort().join(',');

describe('translations', () => {
  it('cover every buyer and landing string in Telugu and Hindi', () => {
    const missing = [...keys].filter((k) => !(k in TE) || !(k in HI));
    expect(missing).toEqual([]);
  });
  it('keep every {placeholder}', () => {
    for (const [k, v] of [...Object.entries(TE), ...Object.entries(HI)]) expect(ph(v), k).toBe(ph(k));
  });
});
