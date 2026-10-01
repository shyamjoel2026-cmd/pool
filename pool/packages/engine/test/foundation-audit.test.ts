import { expect, it } from 'vitest';
import fc from 'fast-check';
import * as e from '../src/index.ts';

const day = 86400000;
function handed(): e.Order {
  const profile: e.FulfilmentProfile = {
    id: 'generic',
    label: 'generic',
    modes: ['pickup'],
    codeDigits: 4,
    handoverChecklist: [],
    steps: [
      { key: 'verification', proof: 'evidence', afterHandover: true, releasesHold: 'quality' },
    ],
    holds: [{ key: 'quality', bps: 1000, releaseAfterDays: 5, deferredMaxDays: 10 }],
    returnWindowDays: 1,
    lateCreditMinor: 0,
  };
  return {
    id: 'order',
    poolId: 'pool',
    buyerId: 'buyer',
    sellerId: 'seller',
    profile,
    split: e.splitOrder(e.INDIA_POLICY, {
      buyerTotal: e.money('INR', 11000),
      sellerTotal: e.money('INR', 10000),
      profile,
      waveHoldMinor: 0,
      indiaTax: {
        hsnCode: '9999',
        gstRateBps: 1800,
        sellerStateCode: '36',
        deliveryStateCode: '36',
        poolStateCode: '36',
        supplyKind: 'MOVEMENT_OF_GOODS',
      },
    }),
    status: 'HANDED_OVER',
    handedOverAt: 100,
    collectedMinor: 11000,
    promisedBy: 100,
    returnCost: e.money('INR', 100),
    steps: [],
    holdsReleased: [],
    holdDeferrals: {},
    openIssue: false,
  };
}
function pool() {
  return e.createPool(
    e.INDIA_POLICY,
    {
      id: 'pool',
      categoryPath: ['any'],
      productKey: 'any',
      areaKey: 'a',
      createdBy: 'u',
      createdAt: 0,
      closesAt: 3600000,
      quantityRule: { uom: e.UOM.piece, minBase: 1, stepBase: 1 },
      fulfilmentProfileId: 'f',
      waveCountMode: 'per_order',
      bookingRule: { kind: 'FIXED', amountMinor: 100, minMinor: 100, maxMinor: 100 },
      checkoutPlan: 'PREPAY_FULL',
      hsnCode: '9999',
      gstRateBps: 1800,
      pricingDeadline: 3601000,
    },
    0,
  );
}
it('settlement does not destroy later profile proof and deferral capabilities', () => {
  const settled = e.settle(handed(), day + 100).order;
  expect(
    e.completeStep(settled, 'verification', 'proof', 'seller', day + 101).order.holdsReleased,
  ).toEqual(['quality']);
  expect(
    e.deferHold(settled, 'quality', 8 * day + 100, day + 101).order.holdDeferrals.quality,
  ).toBe(8 * day + 100);
});
it('proof blocked by an issue releases exactly once after resolution (property)', () => {
  fc.assert(
    fc.property(fc.integer({ min: 1000, max: 1000000 }), (minor) => {
      const base = handed();
      const split = { ...base.split, holds: [{ key: 'quality', amount: e.money('INR', minor) }] };
      let order = e.completeStep(
        { ...base, split, openIssue: true },
        'verification',
        'proof',
        'seller',
        200,
      ).order;
      order = e.setOrderIssue(order, false, 300).order;
      const release = e.releaseDueHolds(order, 300);
      expect(
        release.events
          .filter((x) => x.type === 'PAYOUT_RELEASE')
          .reduce((n, x) => n + x.amount.minor, 0),
      ).toBe(minor);
      expect(
        e.releaseDueHolds(release.order, 301).events.filter((x) => x.type === 'PAYOUT_RELEASE'),
      ).toHaveLength(0);
    }),
  );
});
it('pricing deadline refunds paid bookings even if award processing never ran', () => {
  let p = pool().value;
  p = e.join(
    e.INDIA_POLICY,
    p,
    {
      memberId: 'm',
      userId: 'u',
      householdKey: 'h',
      payerKey: 'p',
      qty: e.qty(e.UOM.piece, 1),
      options: [],
      needBy: 9000000,
    },
    1,
  ).value;
  p = e.confirmBooking(p, 'm', 2, {
    amount: e.money('INR', 100),
    paymentRef: 'receipt',
    paidAt: 2,
  }).value;
  p = e.close(p, 3600000).value;
  const expired = e.expirePricing(e.INDIA_POLICY, p, 3601001);
  expect(expired.value.state).toBe('NO_DEAL');
  expect(
    expired.events.reduce((n, x) => n + (x.type === 'BOOKING_REFUND' ? x.amount.minor : 0), 0),
  ).toBe(100);
});
it('snapshot replay rejects mixed identities before the first snapshot and mismatched snapshot identities', () => {
  const r = pool();
  expect(() =>
    e.rebuildPool([
      { type: 'POOL_CLOSED', poolId: 'other', committedCount: 0, at: 0 },
      ...r.events,
    ]),
  ).toThrow(/REPLAY|mixed|identity/);
  const o = handed();
  expect(() =>
    e.rebuildOrder([{ type: 'ORDER_SNAPSHOT', orderId: 'other', state: o, at: 100 }]),
  ).toThrow(/REPLAY|identity/);
});
it('slot validation rejects nonfinite timestamps and corrupt capacity counters', () => {
  expect(() =>
    e.createSlot({ id: 's', areaKey: 'a', startsAt: NaN, endsAt: 100, capacity: 1 }),
  ).toThrow();
  expect(() =>
    e.reserveSlot(
      { id: 's', areaKey: 'a', startsAt: 100, endsAt: 200, capacity: 1, booked: -1 },
      1,
    ),
  ).toThrow();
});
it('quantity rules reject noninteger or NaN caps and invalid embedded units', () => {
  for (const max of [NaN, Infinity, 1.5])
    expect(() =>
      e.validateQuantityRule({ uom: e.UOM.piece, minBase: 1, stepBase: 1, maxPerBuyerBase: max }),
    ).toThrow();
  expect(() =>
    e.validateQuantityRule({ uom: { ...e.UOM.piece, baseScale: 0 }, minBase: 1, stepBase: 1 }),
  ).toThrow();
});
