import { describe, expect, it } from 'vitest';
import {
  applyAward,
  close,
  committedCount,
  confirmBooking,
  createPool,
  decide,
  expireOffers,
  extendClose,
  grams,
  INDIA_POLICY,
  join,
  leave,
  optInToExtension,
  type Pool,
  poolMatchKey,
  units,
} from '../src/index.ts';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const NOW = Date.UTC(2026, 10, 10);

function openPool(closesAt = NOW + 2 * DAY, basis: 'unit' | 'kg' = 'unit'): Pool {
  return createPool(
    INDIA_POLICY,
    { id: 'p1', category: basis === 'unit' ? 'tv' : 'meat', productKey: 'samsung-55', areaKey: 'kondapur', basis, createdBy: 'u0', createdAt: NOW, closesAt },
    NOW,
  ).value;
}

const m = (id: string, household = `h-${id}`, qty = units(1)) => ({
  memberId: id,
  userId: `u-${id}`,
  householdKey: household,
  payerKey: `pay-${id}`,
  qty,
  options: [],
  needBy: NOW + 10 * DAY,
});

describe('createPool — the starter chooses the closing time', () => {
  it('accepts any time within product limits', () => {
    expect(openPool(NOW + 90 * MIN).closesAt).toBe(NOW + 90 * MIN);
    expect(openPool(NOW + 20 * DAY).closesAt).toBe(NOW + 20 * DAY);
  });
  it('rejects too soon (sellers need time) and too late (holds expire)', () => {
    expect(() => openPool(NOW + 10 * MIN)).toThrow(/at least/);
    expect(() => openPool(NOW + 31 * DAY)).toThrow(/at most/);
  });
  it('match key groups the same product and area', () => {
    expect(poolMatchKey('IN', ' Samsung-55 ', 'Kondapur')).toBe(poolMatchKey('IN', 'samsung-55', 'kondapur'));
  });
});

describe('joining and committing', () => {
  it('only confirmed bookings count as committed', () => {
    let p = join(INDIA_POLICY, openPool(), m('a'), NOW).value;
    expect(committedCount(p)).toBe(0);
    p = confirmBooking(p, 'a', NOW + 1).value;
    expect(committedCount(p)).toBe(1);
    expect(confirmBooking(p, 'a', NOW + 2).events).toEqual([]); // webhook replay is idempotent
  });
  it('household cap: at most 2 units per household', () => {
    let p = join(INDIA_POLICY, openPool(), m('a', 'flat-101', units(2)), NOW).value;
    expect(() => join(INDIA_POLICY, p, m('b', 'flat-101'), NOW)).toThrow(/household/);
    p = join(INDIA_POLICY, p, m('c', 'flat-102'), NOW).value;
    expect(p.members).toHaveLength(2);
  });
  it('same user cannot hold two places', () => {
    const p = join(INDIA_POLICY, openPool(), m('a'), NOW).value;
    expect(() => join(INDIA_POLICY, p, { ...m('b'), userId: 'u-a' }, NOW)).toThrow(/already/);
  });
  it('weighed goods use grams and a gram cap (5 kg guess)', () => {
    const p = openPool(NOW + 2 * DAY, 'kg');
    expect(join(INDIA_POLICY, p, m('a', 'h', grams(1500)), NOW).value.members).toHaveLength(1);
    expect(() => join(INDIA_POLICY, p, m('b', 'h', grams(6000)), NOW)).toThrow(/household/);
  });
  it('cannot join after the chosen close time', () => {
    expect(() => join(INDIA_POLICY, openPool(NOW + 2 * HOUR), m('a'), NOW + 2 * HOUR)).toThrow();
  });
  it('leaving before close refunds the booking', () => {
    const p = join(INDIA_POLICY, openPool(), m('a'), NOW).value;
    expect(leave(p, 'a', NOW + 1).events[0]).toMatchObject({ type: 'MEMBER_LEFT', refundBooking: true });
  });
});

describe('close time is never extended without every committed member opting in', () => {
  it('blocks extension until all committed members agree', () => {
    let p = openPool();
    for (const id of ['a', 'b']) p = confirmBooking(join(INDIA_POLICY, p, m(id), NOW).value, id, NOW).value;
    expect(() => extendClose(INDIA_POLICY, p, p.closesAt + DAY, NOW)).toThrow(/have not agreed/);
    p = optInToExtension(p, 'a', NOW);
    expect(() => extendClose(INDIA_POLICY, p, p.closesAt + DAY, NOW)).toThrow(/1 committed/);
    p = optInToExtension(p, 'b', NOW);
    expect(extendClose(INDIA_POLICY, p, p.closesAt + DAY, NOW).value.closesAt).toBe(NOW + 3 * DAY);
  });
  it('can never be shortened', () => {
    expect(() => extendClose(INDIA_POLICY, openPool(), NOW + DAY, NOW)).toThrow(/never shortened/);
  });
});

describe('close → award → decide', () => {
  function committedPool(ids: string[]): Pool {
    let p = openPool();
    for (const id of ids) p = confirmBooking(join(INDIA_POLICY, p, m(id), NOW).value, id, NOW).value;
    return p;
  }
  it('closes only at the chosen time and drops unpaid joiners', () => {
    let p = committedPool(['a']);
    p = join(INDIA_POLICY, p, m('unpaid'), NOW).value;
    expect(() => close(p, p.closesAt - 1)).toThrow(/chosen time/);
    const closed = close(p, p.closesAt).value;
    expect(closed.members.find((x) => x.memberId === 'unpaid')?.status).toBe('LEFT');
  });
  it('no offer for anyone → NO_DEAL, every booking refunded', () => {
    const p = close(committedPool(['a', 'b']), NOW + 2 * DAY).value;
    const r = applyAward(INDIA_POLICY, p, new Set(), NOW + 2 * DAY);
    expect(r.value.state).toBe('NO_DEAL');
    expect(r.events[0]).toMatchObject({ type: 'POOL_NO_DEAL', refunds: 2 });
  });
  it('default B: no reply by the accept deadline = walk away with refund', () => {
    const closed = close(committedPool(['a', 'b', 'c']), NOW + 2 * DAY).value;
    let p = applyAward(INDIA_POLICY, closed, new Set(['a', 'b']), NOW + 2 * DAY).value;
    expect(p.members.find((x) => x.memberId === 'c')?.status).toBe('UNSERVED');
    p = decide(p, 'a', 'ACCEPTED', NOW + 2 * DAY + HOUR).value;
    expect(() => expireOffers(p, p.acceptBy!)).toThrow(/still open/);
    const r = expireOffers(p, p.acceptBy! + 1);
    expect(r.value.members.find((x) => x.memberId === 'b')?.status).toBe('TIMED_OUT');
    expect(r.events).toEqual([expect.objectContaining({ memberId: 'b', decision: 'TIMED_OUT', refundBooking: true })]);
    expect(() => decide(r.value, 'b', 'ACCEPTED', p.acceptBy! + 2)).toThrow();
  });
  it('walking away refunds the booking and is never blocked', () => {
    const closed = close(committedPool(['a']), NOW + 2 * DAY).value;
    const p = applyAward(INDIA_POLICY, closed, new Set(['a']), NOW + 2 * DAY).value;
    expect(decide(p, 'a', 'WALKED_AWAY', NOW + 2 * DAY + 1).events[0]).toMatchObject({ refundBooking: true });
  });
});
