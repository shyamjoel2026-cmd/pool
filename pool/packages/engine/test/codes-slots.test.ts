import { describe, expect, it } from 'vitest';
import { availableSlots, createSlot, issueCode, releaseSlot, reserveSlot, verifyCode } from '../src/index.ts';

const SECRET = 'test-secret-that-is-at-least-32-characters-long';
const NOW = Date.UTC(2026, 10, 15);
const DAY_END = NOW + 12 * 3_600_000;
const allChecked = { rightModel: true, noDamage: true, serialMatches: true };

describe('handover codes', () => {
  it('pickup codes are 4 digits, delivery codes 6; only a hash is stored', () => {
    const p = issueCode(SECRET, 'o1', 'PICKUP', DAY_END);
    const d = issueCode(SECRET, 'o2', 'DELIVERY', DAY_END);
    expect(p.plain).toMatch(/^\d{4}$/);
    expect(d.plain).toMatch(/^\d{6}$/);
    expect(JSON.stringify(p.stored)).not.toContain(p.plain);
  });
  it('correct code verifies once, then is used', () => {
    const { plain, stored } = issueCode(SECRET, 'o1', 'PICKUP', DAY_END);
    const ok = verifyCode(SECRET, stored, plain, NOW);
    expect(ok.ok).toBe(true);
    expect(verifyCode(SECRET, ok.code, plain, NOW)).toMatchObject({ ok: false, reason: 'ALREADY_USED' });
  });
  it('wrong attempts lock the code', () => {
    let { plain, stored } = issueCode(SECRET, 'o1', 'PICKUP', DAY_END, { maxAttempts: 3 });
    const wrong = plain === '0000' ? '1111' : '0000';
    for (let i = 0; i < 3; i++) stored = verifyCode(SECRET, stored, wrong, NOW).code;
    expect(verifyCode(SECRET, stored, plain, NOW)).toMatchObject({ ok: false, reason: 'LOCKED' });
  });
  it('expires at the end of the day', () => {
    const { plain, stored } = issueCode(SECRET, 'o1', 'PICKUP', DAY_END);
    expect(verifyCode(SECRET, stored, plain, DAY_END + 1)).toMatchObject({ ok: false, reason: 'EXPIRED' });
  });
  it('delivery codes need the open-box checklist first', () => {
    const { plain, stored } = issueCode(SECRET, 'o1', 'DELIVERY', DAY_END);
    expect(verifyCode(SECRET, stored, plain, NOW)).toMatchObject({ ok: false, reason: 'CHECKLIST_INCOMPLETE' });
    expect(verifyCode(SECRET, stored, plain, NOW, { ...allChecked, noDamage: false })).toMatchObject({ reason: 'CHECKLIST_INCOMPLETE' });
    expect(verifyCode(SECRET, stored, plain, NOW, allChecked).ok).toBe(true);
  });
  it('a code for one order does not open another order', () => {
    const a = issueCode(SECRET, 'o1', 'PICKUP', DAY_END);
    const b = issueCode(SECRET, 'o2', 'PICKUP', DAY_END);
    expect(verifyCode(SECRET, b.stored, a.plain, NOW).ok).toBe(a.plain === b.plain ? true : false);
  });
  it('refuses a short secret', () => {
    expect(() => issueCode('short', 'o1', 'PICKUP', DAY_END)).toThrow(/32/);
  });
});

describe('pickup slots', () => {
  const slot = createSlot({ id: 's9', areaKey: 'kondapur', startsAt: NOW + 3_600_000, endsAt: NOW + 5_400_000, capacity: 2 });
  it('fills up and refuses more', () => {
    const s2 = reserveSlot(reserveSlot(slot, NOW), NOW);
    expect(() => reserveSlot(s2, NOW)).toThrow(/full/);
    expect(releaseSlot(s2).booked).toBe(1);
  });
  it('lists only open future slots in the area, earliest first', () => {
    const other = createSlot({ id: 's1', areaKey: 'kondapur', startsAt: NOW + 7_200_000, endsAt: NOW + 9_000_000, capacity: 1 });
    const elsewhere = createSlot({ id: 's2', areaKey: 'miyapur', startsAt: NOW + 3_600_000, endsAt: NOW + 5_400_000, capacity: 5 });
    expect(availableSlots([other, slot, elsewhere], 'kondapur', NOW).map((s) => s.id)).toEqual(['s9', 's1']);
  });
});
