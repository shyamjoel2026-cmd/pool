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
  buyerCancels,
  sellerCancels,
  executeSellerDefault,
  detectJoinAbuse,
  detectBidAbuse,
  type PoolEvent,
  type Order,
  type Bid,
  type IndiaTaxContext,
  optInToExtension,
  extendClose,
} from '../src/index.ts';
const tax: IndiaTaxContext = {
  hsnCode: '9999',
  gstRateBps: 1800,
  sellerStateCode: '36',
  deliveryStateCode: '36',
  poolStateCode: '36',
  supplyKind: 'MOVEMENT_OF_GOODS',
};

it('unpaid active members must also consent to a closing-time extension; zero booking cannot create India demand', () => {
  let pool = create().value;
  const member = {
    memberId: 'pending',
    userId: 'pending',
    householdKey: 'pending',
    payerKey: 'pending',
    qty: qty(UOM.piece, 1),
    options: [],
    needBy: 5000000,
  };
  expect(() =>
    join(
      INDIA_POLICY,
      { ...pool, bookingRule: { kind: 'FIXED', amountMinor: 0, minMinor: 0, maxMinor: 0 } },
      member,
      1,
    ),
  ).toThrow(/positive paid booking/);
  pool = join(INDIA_POLICY, pool, member, 1).value;
  const later = pool.closesAt + 60000;
  expect(() => extendClose(INDIA_POLICY, pool, later, 2)).toThrow(/have not agreed/);
  pool = optInToExtension(pool, member.memberId, 2, later).value;
  expect(extendClose(INDIA_POLICY, pool, later, 3).value.closesAt).toBe(later);
});

it('delayed booking receipt is captured and fully refunded, never committed (property)', () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 100000 }), fc.boolean(), (amount, alreadyClosed) => {
      let p = create().value;
      p = {
        ...p,
        bookingRule: { kind: 'FIXED', amountMinor: amount, minMinor: amount, maxMinor: amount },
      };
      p = join(
        INDIA_POLICY,
        p,
        {
          memberId: 'late',
          userId: 'late',
          payerKey: 'late',
          householdKey: 'late',
          qty: qty(UOM.piece, 1),
          options: [],
          needBy: 5000000,
        },
        1,
      ).value;
      if (alreadyClosed) p = close(p, 3600000).value;
      const receipt = { amount: money('INR', amount), paymentRef: 'late-receipt', paidAt: 2 };
      const r = confirmBooking(p, 'late', 3600001, receipt);
      expect(r.value.members[0]!.status).toBe('LEFT');
      expect(r.value.members[0]!.booking!.disposition).toBe('REFUNDED');
      const capture = r.events.reduce(
        (n, e) => n + (e.type === 'BOOKING_CAPTURE' ? e.amount.minor : 0),
        0,
      );
      const refund = r.events.reduce(
        (n, e) => n + (e.type === 'BOOKING_REFUND' ? e.amount.minor : 0),
        0,
      );
      expect(capture).toBe(amount);
      expect(capture - refund).toBe(0);
      expect(confirmBooking(r.value, 'late', 3600002, receipt).events).toEqual([]);
    }),
  );
});
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
      bookingRule: {
        kind: 'FIXED',
        amountMinor: 100,
        minMinor: 100,
        maxMinor: 100,
      },
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
it('a PA receipt cannot commit two members or be replaced on replay', () => {
  let p = create().value;
  for (const id of ['a', 'b'])
    p = join(
      INDIA_POLICY,
      p,
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
    ).value;
  const receipt = {
    amount: money('INR', 100),
    paymentRef: 'same-pa-payment',
    paidAt: 2,
  };
  p = confirmBooking(p, 'a', 2, receipt).value;
  expect(() => confirmBooking(p, 'b', 2, receipt)).toThrow(/receipt/);
  expect(() =>
    confirmBooking(p, 'a', 2, {
      ...receipt,
      paymentRef: 'different-pa-payment',
    }),
  ).toThrow(/receipt/);
  expect(confirmBooking(p, 'a', 2, receipt).events).toEqual([]);
});
it('booking receipt timestamps must be finite and cannot precede membership', () => {
  const p = join(
    INDIA_POLICY,
    create().value,
    {
      memberId: 'a',
      userId: 'a',
      payerKey: 'a',
      householdKey: 'a',
      qty: qty(UOM.piece, 1),
      options: [],
      needBy: 5000000,
    },
    100,
  ).value;
  for (const paidAt of [NaN, Infinity, 99])
    expect(() =>
      confirmBooking(p, 'a', 101, {
        amount: money('INR', 100),
        paymentRef: 'receipt',
        paidAt,
      }),
    ).toThrow();
});
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
    r = confirmBooking(r.value, id, 2, {
      amount: money('INR', 100),
      paymentRef: id,
      paidAt: 2,
    });
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
          bookingRule: {
            kind: 'FIXED',
            amountMinor: amount,
            minMinor: amount,
            maxMinor: amount,
          },
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
          indiaTax: {
            ...tax,
            gstRateBps: rate,
            deliveryStateCode: inter ? '29' : '36',
          },
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
it('explicit zero-rate TCS treatment is honoured and conserves paise (property)', () => {
  fc.assert(
    fc.property(fc.integer({ min: 10000, max: 100000000 }), fc.boolean(), (total, applicable) => {
      const split = splitOrder(INDIA_POLICY, {
        buyerTotal: money('INR', total),
        sellerTotal: money('INR', total - 1000),
        indiaTax: { ...tax, gstRateBps: 0, tcsApplicable: applicable },
        profile: { ...PROFILES.home_delivery!, holds: [] },
        waveHoldMinor: 0,
      });
      expect(split.indiaTaxes!.goods.total.minor).toBe(0);
      expect(split.tcs.minor).toBe(applicable ? Number((BigInt(total) * 50n + 5000n) / 10000n) : 0);
      expect(
        split.margin.minor + split.tcs.minor + split.tds.minor + split.releaseOnHandover.minor,
      ).toBe(total);
    }),
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
it('a valid code with a weaker checklist or digit policy cannot release payment', () => {
  const o = beginCheckout(order(), 'PREPAY_FULL', money('INR', 1100), 0).order,
    secret = 'x'.repeat(32);
  const c = issueCode(secret, o.id, 4, 1000, 1234, []);
  expect(() => verifyAndHandOver(o, secret, c.stored, c.plain, {}, 1)).toThrow(/policy/);
});
it.each(['PREPAY_FULL', 'BALANCE_AT_HANDOVER'] as const)(
  '%s blocks code until exact digital balance is captured',
  (plan) => {
    let r = beginCheckout(order(), plan, money('INR', 100), 0);
    const secret = 'x'.repeat(32),
      code = issueCode(
        secret,
        'o',
        order().profile.codeDigits,
        1000,
        1234,
        order().profile.handoverChecklist,
      );
    expect(() => verifyAndHandOver(r.order, secret, code.stored, code.plain, {}, 1)).toThrow(
      /balance/,
    );
    r = collectBalance(r.order, money('INR', 1000), 'receipt', 'UPI', 2);
    const h = verifyAndHandOver(
      r.order,
      secret,
      code.stored,
      code.plain,
      { right_item: true, no_damage: true },
      3,
    );
    expect(h.ok).toBe(true);
    if (h.ok) expect(rebuildOrder([...r.events, ...h.events])).toEqual(h.order);
  },
);
it('seller default preserves guaranteed buyer total and funding balances (property)', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 100, max: 100000 }),
      fc.integer({ min: 0, max: 1000 }),
      (backupPrice, deposit) => {
        const o = { ...order(), status: 'PAID' as const };
        const b = {
          ...bid,
          id: 'backup',
          sellerId: 'backup',
          sellerPrice: money('INR', backupPrice),
          // Recovery must honour the accepted fulfilment modes as well as price.
          modes: o.profile.modes,
        };
        const r = executeSellerDefault(
          's',
          [
            {
              order: o,
              backupBidId: 'backup',
              backupSellerStateCode: '29',
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
        const split = r.assignments[0]!.order.split;
        expect(
          split.margin.minor +
            split.tcs.minor +
            split.tds.minor +
            split.releaseOnHandover.minor +
            split.waveHold.minor +
            split.holds.reduce((n, h) => n + h.amount.minor, 0),
        ).toBe(split.buyerTotal.minor + split.defaultFunding!.minor);
        expect(
          split.indiaTaxes!.commissionNet.minor + split.indiaTaxes!.commission.total.minor,
        ).toBe(split.margin.minor);
      },
    ),
  );
});
it('missing backup capacity refunds and compensates the buyer', () => {
  const o = { ...order(), status: 'PAID' as const };
  const r = executeSellerDefault(
    's',
    [
      {
        order: o,
        qty: qty(UOM.piece, 1),
        uom: UOM.piece,
        needBy: 5000000,
        options: [],
      },
    ],
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
    validateAddress({
      line1: '1',
      city: 'Hyderabad',
      pincode: '500001',
      stateCode: '36',
    }),
  ).not.toThrow();
  expect(() =>
    validateAddress({
      line1: '1',
      city: 'x',
      pincode: '12345',
      stateCode: '99',
    }),
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

it('cancellation refunds only collected money and accounts for every paise (property)', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 1100 }), fc.boolean(), (paid, seller) => {
      const o = beginCheckout(order(), 'BALANCE_AT_HANDOVER', money('INR', paid), 0).order;
      const r = seller ? sellerCancels(o, 1) : buyerCancels(o, 1);
      const amount = (type: string) =>
        r.events.reduce((n, e) => n + (e.type === type && 'amount' in e ? e.amount.minor : 0), 0);
      expect(amount('REFUND') + amount('PAYOUT_RELEASE')).toBe(paid);
      expect(amount('SELLER_CHARGE')).toBe(amount('COMPENSATION'));
    }),
  );
});
it('returned paid-out orders reverse all prior deductions before full refund (property)', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 90 }), (credit) => {
      let o = beginCheckout(
        {
          ...order(),
          profile: { ...order().profile, lateCreditMinor: credit },
          promisedBy: 0,
        },
        'PREPAY_FULL',
        money('INR', 1100),
        0,
      ).order;
      const secret = 'x'.repeat(32),
        c = issueCode(secret, o.id, o.profile.codeDigits, 100, 1234, o.profile.handoverChecklist);
      const h = verifyAndHandOver(
        o,
        secret,
        c.stored,
        c.plain,
        { right_item: true, no_damage: true },
        1,
      );
      if (!h.ok) throw new Error('code');
      o = h.order;
      const returned = returnOrder(o, 'DEFECTIVE', 2);
      const additions = returned.events.reduce(
        (n, e) =>
          n +
          (['PAYOUT_REVERSAL', 'ALLOCATION_REVERSAL', 'SELLER_CHARGE'].includes(e.type) &&
          'amount' in e
            ? e.amount.minor
            : 0),
        0,
      );
      const held =
        1100 -
        o.releasedMinor! -
        o.lateCreditsMinor! -
        o.split.margin.minor -
        o.split.tcs.minor -
        o.split.tds.minor;
      expect(held + additions).toBe(1100);
    }),
  );
});
