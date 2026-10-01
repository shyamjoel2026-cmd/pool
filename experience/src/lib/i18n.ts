import { useSim } from '../sim/store';
import type { Lang } from '../sim/types';
import { HI, TE } from './i18n-dict';

/** English strings are the keys; Telugu and Hindi fall back to English when a string has no translation yet. */
export function translate(lang: Lang, s: string, vars?: Record<string, string | number>): string {
  const dict = lang === 'te' ? TE : lang === 'hi' ? HI : undefined;
  let out = (dict && dict[s]) || s;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}

export function useT() {
  const lang = useSim().prefs.lang;
  return (s: string, vars?: Record<string, string | number>) => translate(lang, s, vars);
}

export const LANGS: Array<{ id: Lang; label: string; native: string }> = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'te', label: 'Telugu', native: 'తెలుగు' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी' },
];
