import type { Money } from './money.ts';
// State master: https://docs.ewaybillgst.gov.in/apidocs/state-code.html (domestic codes only).
export const INDIA_STATE_CODES = new Set(
  '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 26 27 29 30 31 32 33 34 35 36 37 38 97'.split(
    ' ',
  ),
);
export function validateStateCode(code: string): void {
  if (!INDIA_STATE_CODES.has(code)) throw new Error('invalid domestic GST state code');
}
export interface Address {
  line1: string;
  city: string;
  pincode: string;
  stateCode: string;
}
export function validateAddress(address: Address): void {
  validateStateCode(address.stateCode);
  // Syntax only: no claim that this PIN exists or maps to this state. https://www.indiapost.gov.in/
  if (!/^[1-9][0-9]{5}$/.test(address.pincode) || !address.line1.trim() || !address.city.trim())
    throw new Error('address requires city, line1 and six-digit pincode');
}
/** Display-only arithmetic. Money calculations never use formatted strings. https://nodejs.org/api/intl.html */
export function formatINR(value: Money): string {
  if (value.currency !== 'INR' || !Number.isSafeInteger(value.minor))
    throw new Error('INR paise required');
  const abs = BigInt(Math.abs(value.minor));
  const rupees = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(abs / 100n);
  const paise = abs % 100n;
  return `${value.minor < 0 ? '-' : ''}₹${rupees}${paise === 0n ? '' : '.' + String(paise).padStart(2, '0')}`;
}
export function formatIST(
  utcMillis: number,
  locale: 'en-IN' | 'hi-IN' | 'te-IN' = 'en-IN',
): string {
  if (!Number.isSafeInteger(utcMillis)) throw new Error('UTC epoch milliseconds required');
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(utcMillis);
}
// UNVERIFIED: no official GSTN algorithm specification located. This local modulus-36
// check is advisory only; a checksum never establishes registration/KYC status.
export function gstinCheckDigit(prefix: string): string {
  if (!/^[0-9A-Z]{14}$/.test(prefix))
    throw new Error('GSTIN prefix needs 14 uppercase alphanumeric characters');
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let total = 0;
  for (let i = 0; i < 14; i++) {
    const n = alphabet.indexOf(prefix[i]!) * (i % 2 === 0 ? 1 : 2);
    total += Math.floor(n / 36) + (n % 36);
  }
  return alphabet[(36 - (total % 36)) % 36]!;
}
export function validateGSTIN(value: string): boolean {
  return (
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value) &&
    INDIA_STATE_CODES.has(value.slice(0, 2)) &&
    gstinCheckDigit(value.slice(0, 14)) === value[14]
  );
}
