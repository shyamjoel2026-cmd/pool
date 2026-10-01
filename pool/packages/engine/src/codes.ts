// Crypto API: https://nodejs.org/api/crypto.html; random entropy belongs in the I/O layer.
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Handover codes (delivery or pickup) for ANY product.
 * - Length (4 or 6 digits) and the buyer's pre-handover checklist come from the fulfilment profile.
 * - Only an HMAC of the code is stored (keyed by a server secret), never the code itself.
 * - Valid until `expiresAt` (e.g. end of the delivery/pickup day), limited attempts, single use.
 */
export interface StoredCode {
  readonly orderId: string;
  readonly digits: 4 | 6;
  readonly hash: string;
  readonly expiresAt: number;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly usedAt?: number;
  /** Checklist keys the buyer must confirm before the code is accepted (from the fulfilment profile). */
  readonly requiredChecklist: readonly string[];
}

export type Checklist = Readonly<Record<string, boolean>>;

export type VerifyResult =
  | { ok: true; code: StoredCode }
  | {
      ok: false;
      code: StoredCode;
      reason: 'WRONG_CODE' | 'EXPIRED' | 'LOCKED' | 'ALREADY_USED' | 'CHECKLIST_INCOMPLETE';
    };

function hmac(secret: string, orderId: string, code: string): string {
  return createHmac('sha256', secret).update(`${orderId}:${code}`).digest('hex');
}

export function issueCode(
  secret: string,
  orderId: string,
  digits: 4 | 6,
  expiresAt: number,
  entropy: number,
  requiredChecklist: readonly string[] = [],
  maxAttempts = 5,
): { plain: string; stored: StoredCode } {
  if (secret.length < 32) throw new Error('code secret must be at least 32 characters');
  if (
    ![4, 6].includes(digits) ||
    !Number.isSafeInteger(expiresAt) ||
    !Number.isSafeInteger(maxAttempts) ||
    maxAttempts < 1
  )
    throw new Error('invalid code policy');
  if (!Number.isSafeInteger(entropy) || entropy < 0 || entropy >= 10 ** digits)
    throw new Error('caller must supply cryptographically generated integer entropy');
  const plain = String(entropy).padStart(digits, '0');
  return {
    plain,
    stored: {
      orderId,
      digits,
      hash: hmac(secret, orderId, plain),
      expiresAt,
      attempts: 0,
      maxAttempts,
      requiredChecklist,
    },
  };
}

export function verifyCode(
  secret: string,
  stored: StoredCode,
  attempt: string,
  now: number,
  checklist: Checklist = {},
): VerifyResult {
  if (stored.usedAt !== undefined) return { ok: false, code: stored, reason: 'ALREADY_USED' };
  if (now > stored.expiresAt) return { ok: false, code: stored, reason: 'EXPIRED' };
  if (stored.attempts >= stored.maxAttempts) return { ok: false, code: stored, reason: 'LOCKED' };
  if (!stored.requiredChecklist.every((k) => checklist[k] === true))
    return { ok: false, code: stored, reason: 'CHECKLIST_INCOMPLETE' };
  const expected = Buffer.from(stored.hash, 'hex');
  const actual = Buffer.from(hmac(secret, stored.orderId, attempt.trim()), 'hex');
  const match = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!match)
    return { ok: false, code: { ...stored, attempts: stored.attempts + 1 }, reason: 'WRONG_CODE' };
  return { ok: true, code: { ...stored, usedAt: now } };
}
