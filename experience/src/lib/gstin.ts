/** GSTIN format + checksum (base-36 weighted mod 36, alternating factors 1,2), and PAN shape. */
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const STATE_CODES: Record<string, string> = {
  '27': 'Maharashtra', '29': 'Karnataka', '32': 'Kerala', '33': 'Tamil Nadu', '36': 'Telangana', '37': 'Andhra Pradesh', '07': 'Delhi', '24': 'Gujarat', '09': 'Uttar Pradesh', '19': 'West Bengal',
};

export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = CHARS.indexOf(first14[i]);
    const p = v * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(p / 36) + (p % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36];
}

export function makeGstin(stateCode: string, pan: string, entity = '1'): string {
  const base = `${stateCode}${pan}${entity}Z`;
  return base + gstinCheckChar(base);
}

export interface GstinCheck {
  ok: boolean;
  format: boolean;
  checksum: boolean;
  stateCode?: string;
  state?: string;
  pan?: string;
  message: string;
}

export function checkGstin(raw: string): GstinCheck {
  const g = raw.trim().toUpperCase();
  const format = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g);
  if (!format) return { ok: false, format, checksum: false, message: 'A GSTIN has 15 characters: 2-digit state code, 10-character PAN, entity number, Z, check character.' };
  const checksum = gstinCheckChar(g.slice(0, 14)) === g[14];
  const stateCode = g.slice(0, 2);
  const state = STATE_CODES[stateCode];
  if (!checksum) return { ok: false, format, checksum, stateCode, state, pan: g.slice(2, 12), message: 'The last character does not match. Check for a typo.' };
  return { ok: true, format, checksum, stateCode, state, pan: g.slice(2, 12), message: `Valid · ${state ?? 'State ' + stateCode}` };
}

export const checkPan = (pan: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.trim().toUpperCase());
export const checkPincode = (p: string) => /^[1-9][0-9]{5}$/.test(p.trim());
