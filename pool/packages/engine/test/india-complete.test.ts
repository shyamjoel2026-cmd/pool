import { expect, it } from 'vitest';
import fc from 'fast-check';
import {
  applyBooking,
  bookingAmount,
  refundBooking,
  calculateIndiaTaxes,
  formatINR,
  formatIST,
  validateAddress,
  validateGSTIN,
  gstinCheckDigit,
  createPool,
  join,
  confirmBooking,
  close,
  cancelPool,
  expirePricing,
  stageAward,
  publishOffers,
  decide,
  expireOffers,
  rebuildPool,
  INDIA_POLICY,
  UOM,
  qty,
  money,
  splitOrder,
  PROFILES,
  beginCheckout,
  collectBalance,
  verifyAndHandOver,
  issueCode,
  completeStep,
  rebuildOrder,
  releaseDueHolds,
  returnOrder,
  executeSellerDefault,
  detectJoinAbuse,
  detectBidAbuse,
  type PoolEvent,
  type Order,
  type Bid,
  type IndiaTaxContext,
} from '../src/index.ts';
const tax: IndiaTaxContext = {
  hsnCode: '9999',
  gstRateBps: 1800,
  sellerStateCode: '36',
  deliveryStateCode: '36',
  poolStateCode: '36',
  supplyKind: 'MOVEMENT_OF_GOODS',
};
const create = () =>
  createPool(
    INDIA_POLICY,
    {
      id: 'p',
      createdBy: 'u',
      createdAt: 0,
      closesAt: 3600000,
      categoryPath: ['generic'],
      productKey: 'x',
      areaKey: 'a',
      quantityRule: { uom: UOM.piece, minBase: 1, stepBase: 1 },
      fulfilmentProfileId: 'f',
      waveCountMode: 'per_order',
      bookingRule: { kind: 'FIXED', amountMinor: 100, minMinor: 100, maxMinor: 100 },
      checkoutPlan: 'PREPAY_FULL',
      hsnCode: '9999',
      gstRateBps: 1800,
      pricingDeadline: 3600100,
      acceptWindowMinutes: 1,
    },
    0,
  );
const bid: Bid = {
  id: 'b',
  poolId: 'p',
  sellerId: 's',
  revision: 1,
  sellerPrice: money('INR', 1000),
  uom: 'piece',
  capacityBase: 10,
  deliverBy: 4000000,
  modes: ['pickup'],
  terms: {},
  optionsCovered: [],
  slabs: [],
  validUntil: 5000000,
  submittedAt: 1,
};
function offered() {
  let r = create();
  const events: PoolEvent[] = [...r.events];
  for (const id of ['a', 'b']) {
    r = join(
      INDIA_POLICY,
      r.value,
      {
        memberId: id,
        userId: id,
        payerKey: id,
        householdKey: id,
        qty: qty(UOM.piece, 1),
        options: [],
        needBy: 5000000,
      },
      1,
    );
    events.push(...r.events);
    r = confirmBooking(r.value, id, 2, { amount: money('INR', 100), paymentRef: id, paidAt: 2 });
    events.push(...r.events);
  }
  r = close(r.value, 3600000);
  events.push(...r.events);
  r = stageAward(
    r.value,
    ['a', 'b'].map((memberId) => ({
      memberId,
      bidId: 'b',
      sellerId: 's',
      sellerPrice: bid.sellerPrice,
      qty: qty(UOM.piece, 1),
      backupBidId: undefined,
    })),
    3600000,
  );
  events.push(...r.events);
  return { r, events };
}
it('fixed and estimate-based booking clamps are exact', () => {
  expect(
    bookingAmount(
      { kind: 'BPS', bps: 1000, minMinor: 50, maxMinor: 200 },
      'INR',
      money('INR', 1000),
    ).minor,
  ).toBe(100);
  expect(
    bookingAmount(
      { kind: 'BPS', bps: 1000, minMinor: 50, maxMinor: 200 },
      'INR',
      money('INR', 10000),
    ).minor,
  ).toBe(200);
  expect(() => bookingAmount({ kind: 'BPS', bps: 1, minMinor: 0, maxMinor: 10 }, 'INR')).toThrow();
});
it('every closed booking is either fully refunded or applied, never both (property)', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 1000000 }),
      fc.integer({ min: 0, max: 1000000 }),
      fc.boolean(),
      (paid, balance, apply) => {
        const booking = {
          due: money('INR', paid),
          paid: money('INR', paid),
          disposition: 'HELD' as const,
        };
        if (apply) {
          const r = applyBooking(booking, money('INR', paid + balance), 'order');
          expect(r.applied.minor + r.balanceDue.minor).toBe(paid + balance);
          expect(r.applied.minor).toBe(paid);
          expect(() => refundBooking(r.booking)).toThrow();
        } else {
          const r = refundBooking(booking);
          expect(r.refund.minor).toBe(paid);
          expect(refundBooking(r.booking).refund.minor).toBe(0);
          expect(() => applyBooking(r.booking, money('INR', paid + balance), 'order')).toThrow();
        }
      },
    ),
  );
});
it('pricing stage requires every decision and keeps replay equal after accept/expiry', () => {
  let { r, events } = offered();
  expect(r.value.state).toBe('PRICING');
  expect(() => publishOffers(INDIA_POLICY, r.value, new Map(), [bid], 3600000)).toThrow();
  r = publishOffers(
    INDIA_POLICY,
    r.value,
    new Map([
      [
        'b',
        {
          poolId: 'p',
          bidId: 'b',
          buyerPrice: money('INR', 1100),
          decidedBy: 'ops',
          decidedAt: 3600000,
        },
      ],
    ]),
    [bid],
    3600000,
  );
  events.push(...r.events);
  r = decide(r.value, 'a', 'ACCEPTED', 3600001, 'oa');
  events.push(...r.events);
  r = expireOffers(r.value, 3660001);
  events.push(...r.events);
  expect(r.value.members.map((m) => m.booking!.disposition)).toEqual(['APPLIED', 'REFUNDED']);
  expect(rebuildPool(events)).toEqual(r.value);
});
it('pricing deadline and ops cancellation refund full paid bookings', () => {
  const { r } = offered();
  for (const end of [expirePricing(INDIA_POLICY, r.value, 3600101), cancelPool(r.value, 3600001)])
    expect(
      end.events
        .filter((e) => e.type === 'BOOKING_REFUND')
        .reduce((n, e) => n + ('amount' in e ? e.amount.minor : 0), 0),
    ).toBe(200);
});
it('booking replay is exact over different amounts (property)', () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 10000 }), (amount) => {
      const first = create();
      let r = join(
        INDIA_POLICY,
        {
          ...first.value,
          bookingRule: { kind: 'FIXED', amountMinor: amount, minMinor: amount, maxMinor: amount },
        },
        {
          memberId: 'm',
          userId: 'u',
          payerKey: 'p',
          householdKey: 'h',
          qty: qty(UOM.piece, 1),
          options: [],
          needBy: 5000000,
        },
        1,
      );
      const events = [...first.events, ...r.events];
      r = confirmBooking(r.value, 'm', 2, {
        amount: money('INR', amount),
        paymentRef: 'p',
        paidAt: 2,
      });
      events.push(...r.events);
      r = cancelPool(r.value, 3);
      events.push(...r.events);
      expect(rebuildPool(events)).toEqual(r.value);
    }),
  );
});
it('GST to the paisa for intra/inter-state; goods GST is inside invoice, not another payout deduction', () => {
  const intra = calculateIndiaTaxes(money('INR', 4300000), money('INR', 300000), tax);
  expect(intra.goods.total.minor).toBe(655932);
  expect(intra.goods.cgst.minor).toBe(327966);
  expect(intra.goods.sgst.minor).toBe(327966);
  expect(intra.tcs.total.minor).toBe(18220);
  expect(intra.commission.total.minor).toBe(45763);
  const inter = calculateIndiaTaxes(money('INR', 4300000), money('INR', 300000), {
    ...tax,
    deliveryStateCode: '29',
    poolStateCode: '29',
  });
  expect(inter.goods.igst.minor).toBe(655932);
  expect(inter.commission.igst.minor).toBe(45763);
});
it('all nested tax parts and payout parts conserve paise (property)', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 10000, max: 100000000 }),
      fc.integer({ min: 0, max: 1000000 }),
      fc.integer({ min: 0, max: 4000 }),
      fc.boolean(),
      (seller, margin, rate, inter) => {
        const s = splitOrder(INDIA_POLICY, {
          buyerTotal: money('INR', seller + margin),
          sellerTotal: money('INR', seller),
          indiaTax: { ...tax, gstRateBps: rate, deliveryStateCode: inter ? '29' : '36' },
          profile: PROFILES.home_delivery!,
          waveHoldMinor: 0,
        });
        const t = s.indiaTaxes!;
        for (const p of [t.goods, t.commission, t.tcs])
          expect(p.cgst.minor + p.sgst.minor + p.igst.minor).toBe(p.total.minor);
        expect(t.taxable.minor + t.goods.total.minor).toBe(s.buyerTotal.minor);
        expect(t.commissionNet.minor + t.commission.total.minor).toBe(margin);
        expect(s.margin.minor + s.tcs.minor + s.tds.minor + s.releaseOnHandover.minor).toBe(
          s.buyerTotal.minor,
        );
      },
    ),
  );
});
function order(): Order {
  const profile = { ...PROFILES.home_delivery!, steps: [], holds: [] };
  return {
    id: 'o',
    poolId: 'p',
    buyerId: 'a',
    sellerId: 's',
    profile,
    split: splitOrder(INDIA_POLICY, {
      buyerTotal: money('INR', 1100),
      sellerTotal: money('INR', 1000),
      indiaTax: tax,
      profile,
      waveHoldMinor: 0,
    }),
    promisedBy: 4000000,
    returnCost: money('INR', 10),
    status: 'AWAITING_PAYMENT',
    steps: [],
    holdDeferrals: {},
    holdsReleased: [],
    openIssue: false,
  };
}
it.each(['PREPAY_FULL', 'BALANCE_AT_HANDOVER'] as const)(
  '%s blocks code until exact digital balance is captured',
  (plan) => {
    let r = beginCheckout(order(), plan, money('INR', 100), 0);
    const secret = 'x'.repeat(32),
      code = issueCode(secret, 'o', 4, 1000, 1234);
    expect(() => verifyAndHandOver(r.order, secret, code.stored, code.plain, {}, 1)).toThrow(
      /balance/,
    );
    r = collectBalance(r.order, money('INR', 1000), 'receipt', 'UPI', 2);
    const h = verifyAndHandOver(r.order, secret, code.stored, code.plain, {}, 3);
    expect(h.ok).toBe(true);
    if (h.ok) expect(rebuildOrder([...r.events, ...h.events])).toEqual(h.order);
  },
);
it('seller default preserves guaranteed buyer total and funding balances (property)', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1000, max: 100000 }),
      fc.integer({ min: 0, max: 1000 }),
      (backupPrice, deposit) => {
        const o = { ...order(), status: 'PAID' as const };
        const b = {
          ...bid,
          id: 'backup',
          sellerId: 'backup',
          sellerPrice: money('INR', backupPrice),
        };
        const r = executeSellerDefault(
          's',
          [
            {
              order: o,
              backupBidId: 'backup',
              qty: qty(UOM.piece, 1),
              uom: UOM.piece,
              needBy: 5000000,
              options: [],
            },
          ],
          [b],
          new Map([['backup', 1]]),
          money('INR', deposit),
          money('INR', 100000),
          [],
          [],
          10,
        );
        expect(r.assignments[0]!.order.split.buyerTotal).toEqual(o.split.buyerTotal);
        expect(r.fromDeposit.minor + r.fromReserve.minor).toBe(r.totalCharge.minor);
      },
    ),
  );
});
it('missing backup capacity refunds and compensates the buyer', () => {
  const o = { ...order(), status: 'PAID' as const };
  const r = executeSellerDefault(
    's',
    [{ order: o, qty: qty(UOM.piece, 1), uom: UOM.piece, needBy: 5000000, options: [] }],
    [],
    new Map(),
    money('INR', 100),
    money('INR', 100),
    [],
    [],
    1,
  );
  expect(r.cancelled).toHaveLength(1);
  expect(r.events.some((e) => e.type === 'COMPENSATION')).toBe(true);
});
it('India formatting and validation', () => {
  expect(formatINR(money('INR', 459990000))).toBe('₹45,99,900');
  expect(formatINR(money('INR', 101))).toBe('₹1.01');
  expect(formatIST(Date.UTC(2026, 0, 1))).toContain('5:30');
  expect(() =>
    validateAddress({ line1: '1', city: 'Hyderabad', pincode: '500001', stateCode: '36' }),
  ).not.toThrow();
  expect(() =>
    validateAddress({ line1: '1', city: 'x', pincode: '12345', stateCode: '99' }),
  ).toThrow();
  const prefix = '36ABCDE1234F1Z';
  expect(validateGSTIN(prefix + gstinCheckDigit(prefix))).toBe(true);
  expect(validateGSTIN(prefix + '!')).toBe(false);
});
it('abuse signals have positive and negative cases without auto-punishment', () => {
  const rows = Array.from({ length: 4 }, (_, i) => ({
    memberId: String(i),
    poolId: 'p',
    householdKey: String(i),
    payerKey: 'shared',
    deviceKey: 'device',
    areaKey: 'area',
    at: i,
  }));
  expect(detectJoinAbuse(rows, 10, 3).map((s) => s.kind)).toContain('SHARED_PAYER');
  expect(detectJoinAbuse(rows.slice(0, 1), 10, 3)).toEqual([]);
  expect(
    detectBidAbuse(INDIA_POLICY, [bid, { ...bid, id: 'c', sellerId: 'c' }], 10, []).some(
      (s) => s.kind === 'SIMILAR_BIDS',
    ),
  ).toBe(true);
  expect(detectBidAbuse(INDIA_POLICY, [bid], 10, [])).toEqual([]);
  expect(
    detectBidAbuse(
      INDIA_POLICY,
      [],
      10,
      Array.from({ length: 4 }, (_, i) => ({
        poolId: String(i),
        sellerId: i % 2 ? 'a' : 'b',
        participants: ['a', 'b'],
      })),
    ).map((s) => s.kind),
  ).toContain('WINNER_ROTATION');
});

it('full checkout payments conserve the buyer total (property)', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 1100 }), (paid) => {
      const o = beginCheckout(order(), 'BALANCE_AT_HANDOVER', money('INR', paid), 0).order;
      if (paid < 1100) {
        const r = collectBalance(o, money('INR', 1100 - paid), 'r', 'CARD', 1);
        expect(
          paid +
            r.events
              .filter((e) => e.type === 'CAPTURE')
              .reduce((n, e) => n + ('amount' in e ? e.amount.minor : 0), 0),
        ).toBe(1100);
      } else expect(o.collectedMinor).toBe(1100);
    }),
  );
});
it('hold timeout never releases seller funds on a returned order', () => {
  const o = { ...order(), status: 'RETURNED' as const, handedOverAt: 0 };
  expect(releaseDueHolds(o, 999999999).events.some((e) => e.type === 'PAYOUT_RELEASE')).toBe(false);
});
it('pool overrides stay inside policy bounds', () => {
  const p = create().value;
  expect(() => createPool(INDIA_POLICY, { ...p, id: 'bad', minimumPoolMinutes: 1 }, 0)).toThrow(
    /limits/,
  );
  expect(() => createPool(INDIA_POLICY, { ...p, id: 'bad', acceptWindowMinutes: 1441 }, 0)).toThrow(
    /limits/,
  );
});
it('late publication refuses bids that expire before acceptance completes', () => {
  const { r } = offered();
  expect(() =>
    publishOffers(
      INDIA_POLICY,
      r.value,
      new Map([
        [
          'b',
          {
            poolId: 'p',
            bidId: 'b',
            buyerPrice: money('INR', 1100),
            decidedBy: 'ops',
            decidedAt: 3600000,
          },
        ],
      ]),
      [{ ...bid, validUntil: 3600001 }],
      3600000,
    ),
  ).toThrow(/expires/);
});
