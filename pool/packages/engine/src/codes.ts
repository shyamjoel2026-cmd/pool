import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * Delivery / pickup handover codes.
 * - 4 digits for pickup, 6 for high-value delivery (UX research).
 * - Only an HMAC of the code is stored (keyed by a server secret), never the code itself.
 * - Valid for the whole delivery/pickup day, limited attempts, single use.
 * - For open-box deliveries the code is only accepted after the buyer's 3-item checklist passes.
 */
export type CodeKind = 'PICKUP' | 'DELIVERY';

export interface StoredCode {
  readonly orderId: string;
  readonly kind: CodeKind;
  readonly hash: string;
  readonly expiresAt: number;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly usedAt?: number;
  readonly requireOpenBoxCheck: boolean;
}

export interface OpenBoxChecklist {
  readonly rightModel: boolean;
  readonly noDamage: boolean;
  readonly serialMatches: boolean;
}

export type VerifyResult =
  | { ok: true; code: StoredCode }
  | { ok: false; code: StoredCode; reason: 'WRONG_CODE' | 'EXPIRED' | 'LOCKED' | 'ALREADY_USED' | 'CHECKLIST_INCOMPLETE' };

function hmac(secret: string, orderId: string, code: string): string {
  return createHmac('sha256', secret).update(`${orderId}:${code}`).digest('hex');
}

export function issueCode(
  secret: string,
  orderId: string,
  kind: CodeKind,
  expiresAt: number,
  opts: { maxAttempts?: number; requireOpenBoxCheck?: boolean } = {},
): { plain: string; stored: StoredCode } {
  if (secret.length < 32) throw new Error('code secret must be at least 32 characters');
  const digits = kind === 'PICKUP' ? 4 : 6;
  const plain = String(randomInt(0, 10 ** digits)).padStart(digits, '0');
  return {
    plain,
    stored: {
      orderId,
      kind,
      hash: hmac(secret, orderId, plain),
      expiresAt,
      attempts: 0,
      maxAttempts: opts.maxAttempts ?? 5,
      requireOpenBoxCheck: opts.requireOpenBoxCheck ?? kind === 'DELIVERY',
    },
  };
}

export function verifyCode(
  secret: string,
  stored: StoredCode,
  attempt: string,
  now: number,
  checklist?: OpenBoxChecklist,
): VerifyResult {
  if (stored.usedAt !== undefined) return { ok: false, code: stored, reason: 'ALREADY_USED' };
  if (now > stored.expiresAt) return { ok: false, code: stored, reason: 'EXPIRED' };
  if (stored.attempts >= stored.maxAttempts) return { ok: false, code: stored, reason: 'LOCKED' };
  if (stored.requireOpenBoxCheck && !(checklist?.rightModel && checklist.noDamage && checklist.serialMatches)) {
    return { ok: false, code: stored, reason: 'CHECKLIST_INCOMPLETE' };
  }
  const expected = Buffer.from(stored.hash, 'hex');
  const actual = Buffer.from(hmac(secret, stored.orderId, attempt.trim()), 'hex');
  const match = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!match) return { ok: false, code: { ...stored, attempts: stored.attempts + 1 }, reason: 'WRONG_CODE' };
  return { ok: true, code: { ...stored, usedAt: now } };
}
