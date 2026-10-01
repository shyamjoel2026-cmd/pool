import { describe, expect, it } from 'vitest';
import {
  applyAward,
  stageAward,
  publishOffers,
  money,
  type Bid,
  close,
  committedCount,
  confirmBooking,
  createPool,
  decide,
  expireOffers,
  extendClose,
  INDIA_POLICY,
  join,
  leave,
  optInToExtension,
  type Pool,
  poolMatchKey,
  qty,
  type Quantity,
  type QuantityRule,
  UOM,
} from '../src/index.ts';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const NOW = Date.UTC(2026, 10, 10);

function openPool(
  rule: QuantityRule,
  closesAt = NOW + 2 * DAY,
  categoryPath = ['food', 'meat'],
): Pool {
  return createPool(
    INDIA_POLICY,
    {
      id: 'p1',
      bookingRule: {
        kind: 'FIXED',
        amountMinor: 100,
        minMinor: 100,
        maxMinor: 100,
      },
      checkoutPlan: 'PREPAY_FULL',
      hsnCode: '9999',
      gstRateBps: 1800,
      categoryPath,
      productKey: 'k',
      areaKey: 'kondapur',
      quantityRule: rule,
      fulfilmentProfileId: 'store_pickup',
      waveCountMode: 'per_order',
      createdBy: 'u0',
      createdAt: NOW,
      closesAt,
    },
    NOW,
  ).value;
}
const meatRule: QuantityRule = {
  uom: UOM.kg,
  minBase: 500,
  stepBase: 250,
  maxPerHouseholdBase: 2000,
};
const pieceRule: QuantityRule = { uom: UOM.piece, minBase: 1, stepBase: 1 };
const m = (id: string, q: Quantity, household = `h-${id}`) => ({
  memberId: id,
  userId: `u-${id}`,
  householdKey: household,
  payerKey: `pay-${id}`,
  qty: q,
  options: [],
  needBy: NOW + 10 * DAY,
});

describe('createPool — any category, starter chooses the close time', () => {
  it('works for any category path and any chosen time within platform limits', () => {
    expect(openPool(pieceRule, NOW + 90 * MIN, ['books', 'school']).closesAt).toBe(NOW + 90 * MIN);
    expect(openPool(meatRule, NOW + 20 * DAY).categoryPath).toEqual(['food', 'meat']);
  });
  it('rejects too soon, too late, missing category, broken quantity rule', () => {
    expect(() => openPool(pieceRule, NOW + 10 * MIN)).toThrow(/at least/);
    expect(() => openPool(pieceRule, NOW + 31 * DAY)).toThrow(/at most/);
    expect(() => openPool(pieceRule, NOW + DAY, [])).toThrow(/categoryPath/);
    expect(() => openPool({ uom: UOM.kg, minBase: 0, stepBase: 1 })).toThrow();
  });
  it('match key groups the same product and area', () => {
    expect(poolMatchKey('IN', ' K-1 ', 'Kondapur')).toBe(poolMatchKey('IN', 'k-1', 'kondapur'));
  });
});

describe('joining — rules come from the pool, not the product type', () => {
  it('typical 1 kg buyers join; only confirmed bookings count', () => {
    let p = join(INDIA_POLICY, openPool(meatRule), m('a', qty(UOM.kg, 1000)), NOW).value;
    expect(committedCount(p)).toBe(0);
    p = confirmBooking(p, 'a', NOW + 1, receipt('a')).value;
    expect(committedCount(p)).toBe(1);
    expect(confirmBooking(p, 'a', NOW + 2, receipt('a')).events).toEqual([]); // same verified receipt replay is idempotent
  });
  it('household cap only when the pool sets one (here 2 kg)', () => {
    const p = join(
      INDIA_POLICY,
      openPool(meatRule),
      m('a', qty(UOM.kg, 1500), 'flat-1'),
      NOW,
    ).value;
    expect(() => join(INDIA_POLICY, p, m('b', qty(UOM.kg, 1000), 'flat-1'), NOW)).toThrow(
      /household/,
    );
    expect(
      join(INDIA_POLICY, p, m('c', qty(UOM.kg, 500), 'flat-1'), NOW).value.members,
    ).toHaveLength(2);
  });
  it('no cap set → a buyer can take 40 pieces (e.g. a school)', () => {
    expect(
      join(INDIA_POLICY, openPool(pieceRule), m('school', qty(UOM.piece, 40)), NOW).value.members,
    ).toHaveLength(1);
  });
  it('quantity must follow the pool rule', () => {
    expect(() => join(INDIA_POLICY, openPool(meatRule), m('a', qty(UOM.kg, 300)), NOW)).toThrow(
      /minimum/,
    );
    expect(() => join(INDIA_POLICY, openPool(meatRule), m('a', qty(UOM.piece, 1)), NOW)).toThrow(
      /priced per kg/,
    );
  });
  it('same user cannot hold two places; cannot join after close; leaving refunds', () => {
    const p = join(INDIA_POLICY, openPool(pieceRule), m('a', qty(UOM.piece, 1)), NOW).value;
    expect(() =>
      join(INDIA_POLICY, p, { ...m('b', qty(UOM.piece, 1)), userId: 'u-a' }, NOW),
    ).toThrow(/already/);
    expect(() =>
      join(
        INDIA_POLICY,
        openPool(pieceRule, NOW + 2 * HOUR),
        m('z', qty(UOM.piece, 1)),
        NOW + 2 * HOUR,
      ),
    ).toThrow();
    expect(leave(p, 'a', NOW + 1).events[0]).toMatchObject({
      type: 'MEMBER_LEFT',
      refundBooking: true,
    });
  });
});

describe('close time: extend only with every committed member opting in; never shorten', () => {
  it('works', () => {
    let p = openPool(pieceRule);
    for (const id of ['a', 'b'])
      p = confirmBooking(
        join(INDIA_POLICY, p, m(id, qty(UOM.piece, 1)), NOW).value,
        id,
        NOW,
        receipt(id),
      ).value;
    expect(() => extendClose(INDIA_POLICY, p, p.closesAt + DAY, NOW)).toThrow(/have not agreed/);
    p = optInToExtension(
      optInToExtension(p, 'a', NOW, p.closesAt + DAY).value,
      'b',
      NOW,
      p.closesAt + DAY,
    ).value;
    expect(extendClose(INDIA_POLICY, p, p.closesAt + DAY, NOW).value.closesAt).toBe(NOW + 3 * DAY);
    expect(() => extendClose(INDIA_POLICY, p, NOW + DAY, NOW)).toThrow(/never shortened/);
  });
});

describe('close → award → decide', () => {
  const committed = (ids: string[]) => {
    let p = openPool(pieceRule);
    for (const id of ids)
      p = confirmBooking(
        join(INDIA_POLICY, p, m(id, qty(UOM.piece, 1)), NOW).value,
        id,
        NOW,
        receipt(id),
      ).value;
    return p;
  };
  it('closes only at the chosen time; unpaid joiners are dropped', () => {
    const p = join(INDIA_POLICY, committed(['a']), m('unpaid', qty(UOM.piece, 1)), NOW).value;
    expect(() => close(p, p.closesAt - 1)).toThrow(/chosen time/);
    expect(close(p, p.closesAt).value.members.find((x) => x.memberId === 'unpaid')?.status).toBe(
      'LEFT',
    );
  });
  it('nobody served → NO_DEAL and every booking refunded', () => {
    const r = applyAward(
      INDIA_POLICY,
      close(committed(['a', 'b']), NOW + 2 * DAY).value,
      new Set(),
      NOW + 2 * DAY,
    );
    expect(r.value.state).toBe('NO_DEAL');
    expect(r.events[0]).toMatchObject({ type: 'POOL_NO_DEAL', refunds: 2 });
  });
  it('default B: no reply = walk away with refund; walking away is never blocked', () => {
    let p = close(committed(['a', 'b', 'c']), NOW + 2 * DAY).value;
    const b: Bid = {
      id: 'b',
      poolId: p.id,
      sellerId: 's',
      revision: 1,
      sellerPrice: money('INR', 1000),
      uom: 'piece',
      capacityBase: 2,
      deliverBy: NOW + 3 * DAY,
      modes: ['pickup'],
      terms: {},
      optionsCovered: [],
      slabs: [],
      validUntil: NOW + 5 * DAY,
      submittedAt: NOW,
    };
    p = stageAward(
      p,
      ['a', 'b'].map((memberId) => ({
        memberId,
        bidId: b.id,
        sellerId: b.sellerId,
        sellerPrice: b.sellerPrice,
        qty: qty(UOM.piece, 1),
        backupBidId: undefined,
      })),
      NOW + 2 * DAY,
    ).value;
    p = publishOffers(
      INDIA_POLICY,
      p,
      new Map([
        [
          'b',
          {
            poolId: p.id,
            bidId: 'b',
            buyerPrice: money('INR', 1100),
            decidedBy: 'ops',
            decidedAt: NOW + 2 * DAY,
          },
        ],
      ]),
      [b],
      NOW + 2 * DAY,
    ).value;
    expect(p.members.find((x) => x.memberId === 'c')?.status).toBe('UNSERVED');
    expect(decide(p, 'a', 'WALKED_AWAY', NOW + 2 * DAY + 1).events[0]).toMatchObject({
      refundBooking: true,
    });
    p = decide(p, 'a', 'ACCEPTED', NOW + 2 * DAY + HOUR, 'oa').value;
    const r = expireOffers(p, p.acceptBy! + 1);
    expect(r.events.filter((e) => e.type === 'MEMBER_DECIDED')).toEqual([
      expect.objectContaining({
        memberId: 'b',
        decision: 'TIMED_OUT',
        refundBooking: true,
      }),
    ]);
  });
});

function receipt(id: string) {
  return { amount: money('INR', 100), paymentRef: 'pay-' + id, paidAt: NOW };
}
