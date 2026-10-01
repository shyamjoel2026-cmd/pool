import { describe, expect, it } from 'vitest';
import {
  availableSlots,
  createSlot,
  issueCode,
  PROFILES,
  releaseSlot,
  reserveSlot,
  verifyCode,
} from '../src/index.ts';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const NOW = Date.UTC(2026, 10, 15);
const END = NOW + 12 * 3_600_000;

describe('handover codes follow the fulfilment profile', () => {
  it('length and checklist come from the profile', () => {
    const pickup = PROFILES.store_pickup!;
    const { plain, stored } = issueCode(
      SECRET,
      'o1',
      pickup.codeDigits,
      END,
      1234,
      pickup.handoverChecklist,
    );
    expect(plain).toMatch(/^\d{4}$/);
    expect(JSON.stringify(stored)).not.toContain(plain);
    expect(verifyCode(SECRET, stored, plain, NOW)).toMatchObject({
      ok: false,
      reason: 'CHECKLIST_INCOMPLETE',
    });
    expect(
      verifyCode(SECRET, stored, plain, NOW, { right_item: true, right_quantity: true }).ok,
    ).toBe(true);
  });
  it('no checklist → code alone is enough', () => {
    const { plain, stored } = issueCode(SECRET, 'o2', 6, END, 123456);
    expect(plain).toMatch(/^\d{6}$/);
    expect(verifyCode(SECRET, stored, plain, NOW).ok).toBe(true);
  });
  it('single use, attempt lock, expiry, per-order binding, secret length', () => {
    const { plain, stored } = issueCode(SECRET, 'o1', 4, END, 1234, [], 3);
    const used = verifyCode(SECRET, stored, plain, NOW);
    expect(verifyCode(SECRET, used.code, plain, NOW)).toMatchObject({ reason: 'ALREADY_USED' });
    let s = stored;
    const wrong = plain === '0000' ? '1111' : '0000';
    for (let i = 0; i < 3; i++) s = verifyCode(SECRET, s, wrong, NOW).code;
    expect(verifyCode(SECRET, s, plain, NOW)).toMatchObject({ reason: 'LOCKED' });
    expect(verifyCode(SECRET, stored, plain, END + 1)).toMatchObject({ reason: 'EXPIRED' });
    const other = issueCode(SECRET, 'o9', 4, END, 1234);
    expect(verifyCode(SECRET, other.stored, plain, NOW).ok).toBe(plain === other.plain);
    expect(() => issueCode('short', 'o1', 4, END, 1234)).toThrow(/32/);
  });
});

describe('time slots (pickup or service, any product)', () => {
  const slot = createSlot({
    id: 's9',
    areaKey: 'kondapur',
    startsAt: NOW + 3_600_000,
    endsAt: NOW + 5_400_000,
    capacity: 2,
  });
  it('fills up and refuses more', () => {
    const full = reserveSlot(reserveSlot(slot, NOW), NOW);
    expect(() => reserveSlot(full, NOW)).toThrow(/full/);
    expect(releaseSlot(full).booked).toBe(1);
  });
  it('lists open future slots in the area, earliest first', () => {
    const later = createSlot({
      id: 's1',
      areaKey: 'kondapur',
      startsAt: NOW + 7_200_000,
      endsAt: NOW + 9_000_000,
      capacity: 1,
    });
    const elsewhere = createSlot({
      id: 's2',
      areaKey: 'miyapur',
      startsAt: NOW + 3_600_000,
      endsAt: NOW + 5_400_000,
      capacity: 5,
    });
    expect(availableSlots([later, slot, elsewhere], 'kondapur', NOW).map((s) => s.id)).toEqual([
      's9',
      's1',
    ]);
  });
});
