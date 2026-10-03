/** All times are stored as epoch ms (UTC) and always shown in IST. */
export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
const TZ = 'Asia/Kolkata';
const IST_OFFSET = 330 * MIN;

let locale = 'en-IN';
export function setTimeLocale(lang: 'en' | 'te' | 'hi') {
  locale = lang === 'te' ? 'te-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
}

const f = (opts: Intl.DateTimeFormatOptions) => (ms: number) => new Intl.DateTimeFormat(locale, { timeZone: TZ, ...opts }).format(ms);

export const fmtTime = (ms: number) => f({ hour: 'numeric', minute: '2-digit', hour12: true })(ms).replace(' am', ' AM').replace(' pm', ' PM');
export const fmtDay = (ms: number) => f({ weekday: 'short', day: 'numeric', month: 'short' })(ms);
export const fmtDate = (ms: number) => f({ day: 'numeric', month: 'short', year: 'numeric' })(ms);
export const fmtDayTime = (ms: number) => `${fmtDay(ms)}, ${fmtTime(ms)}`;

export function startOfDayIST(ms: number): number {
  const shifted = ms + IST_OFFSET;
  return shifted - (shifted % DAY) - IST_OFFSET;
}
/** A clock time on the IST day of `ms` plus `days`. */
export const atIST = (ms: number, days: number, hour: number, minute = 0) => startOfDayIST(ms) + days * DAY + hour * HOUR + minute * MIN;

export function isSameDayIST(a: number, b: number) {
  return startOfDayIST(a) === startOfDayIST(b);
}

const REL: Record<string, [string, string, string]> = { 'en-IN': ['Today', 'Tomorrow', 'Yesterday'], 'te-IN': ['ఈరోజు', 'రేపు', 'నిన్న'], 'hi-IN': ['आज', 'कल', 'बीता कल'] };

/** "Today, 6:00 PM" / "Tomorrow, 9:00 AM" / "Fri 3 Oct, 6:00 PM" */
export function fmtWhen(ms: number, now: number): string {
  const d = Math.round((startOfDayIST(ms) - startOfDayIST(now)) / DAY);
  const w = REL[locale] ?? REL['en-IN'];
  if (d === 0) return `${w[0]}, ${fmtTime(ms)}`;
  if (d === 1) return `${w[1]}, ${fmtTime(ms)}`;
  if (d === -1) return `${w[2]}, ${fmtTime(ms)}`;
  return fmtDayTime(ms);
}

export function countdown(ms: number, now: number): { d: number; h: number; m: number; s: number; past: boolean; total: number } {
  const total = ms - now;
  const t = Math.max(0, total);
  return { d: Math.floor(t / DAY), h: Math.floor((t % DAY) / HOUR), m: Math.floor((t % HOUR) / MIN), s: Math.floor((t % MIN) / 1000), past: total <= 0, total };
}

/** "1d 5h", "5h 12m", "12m 05s" */
export function fmtLeft(ms: number, now: number): string {
  const c = countdown(ms, now);
  if (c.past) return '0m';
  if (c.d > 0) return `${c.d}d ${c.h}h`;
  if (c.h > 0) return `${c.h}h ${String(c.m).padStart(2, '0')}m`;
  return `${c.m}m ${String(c.s).padStart(2, '0')}s`;
}

export function fmtAgo(ms: number, now: number): string {
  const t = now - ms;
  if (t < MIN) return 'just now';
  if (t < HOUR) return `${Math.floor(t / MIN)} min ago`;
  if (t < DAY) return `${Math.floor(t / HOUR)} h ago`;
  if (t < 7 * DAY) return `${Math.floor(t / DAY)} d ago`;
  return fmtDate(ms);
}
