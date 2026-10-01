import { expect, it } from 'vitest';
import fc from 'fast-check';
import * as e from '../src/index.ts';

function original(): e.Order {
  const profile: e.FulfilmentProfile = {
    id: 'generic',
    label: 'generic',
    modes: ['pickup'],
    steps: [],
    handoverChecklist: [],
    codeDigits: 4,
    holds: [{ key: 'quality', bps: 2000, releaseAfterDays: 1 }],
    returnWindowDays: 2,
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
      indiaTax: {
        hsnCode: '9999',
        gstRateBps: 1800,
        sellerStateCode: '36',
        deliveryStateCode: '36',
        poolStateCode: '36',
        supplyKind: 'MOVEMENT_OF_GOODS',
      },
      profile,
      waveHoldMinor: 0,
    }),
    status: 'PAID',
    collectedMinor: 11000,
    steps: [],
    holdsReleased: [],
    holdDeferrals: {},
    openIssue: false,
    promisedBy: 20000,
    returnCost: e.money('INR', 100),
  };
}
const backup = (minor: number): e.Bid => ({
  id: 'backup',
  poolId: 'pool',
  sellerId: 'backup-seller',
  revision: 1,
  sellerPrice: e.money('INR', minor),
  uom: 'piece',
  capacityBase: 1,
  deliverBy: 10000,
  modes: ['pickup'],
  terms: {},
  optionsCovered: [],
  slabs: [],
  validUntil: 30000,
  submittedAt: 1,
});
const input = (order: e.Order): e.DefaultOrder => ({
  order,
  backupBidId: 'backup',
  backupSellerStateCode: '29',
  qty: e.qty(e.UOM.piece, 1),
  uom: e.UOM.piece,
  needBy: 20000,
  options: [],
});

it('default funding, recalculated holds and refund disposition conserve paise (property)', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 100000 }),
      fc.integer({ min: 0, max: 100000 }),
      fc.boolean(),
      fc.boolean(),
      (gap, deposit, returnAfterHandover, releaseHold) => {
        const old = original();
        const result = e.executeSellerDefault(
          'seller',
          [input(old)],
          [backup(10000 + gap)],
          new Map([['backup', 1]]),
          e.money('INR', deposit),
          e.money('INR', 100000),
          [],
          [],
          100,
        );
        let order: e.Order = {
          ...result.assignments[0]!.order,
          defaultFundingSources: [
            { id: 'deposit', account: 'seller:seller:deposit', amount: result.fromDeposit },
            { id: 'reserve', account: 'pool:reserve', amount: result.fromReserve },
          ].filter((s) => s.amount.minor > 0),
        };
        const split = order.split;
        expect(split.buyerTotal.minor).toBe(11000);
        expect(split.holds[0]!.amount.minor).toBe(
          e.allocate(split.sellerTotal, [2000, 8000])[0]!.minor,
        );
        expect(
          e.sum('INR', [
            split.margin,
            split.tcs,
            split.tds,
            split.waveHold,
            split.releaseOnHandover,
            ...split.holds.map((h) => h.amount),
          ]).minor,
        ).toBe(11000 + gap);
        const history = [...e.recordOrder(order, 100).events];
        const moneyEvents: e.OrderEvent[] = [];
        if (returnAfterHandover) {
          const code = e.issueCode('x'.repeat(32), order.id, 4, 30000, 1234);
          const handed = e.handOver(
            order,
            { secret: 'x'.repeat(32), stored: code.stored, attempt: code.plain, checklist: {} },
            200,
          );
          order = handed.order;
          history.push(...handed.events);
          moneyEvents.push(...handed.events);
          if (releaseHold) {
            const released = e.releaseDueHolds(order, 200 + 86400000);
            order = released.order;
            history.push(...released.events);
            moneyEvents.push(...released.events);
          }
        }
        const terminal = returnAfterHandover
          ? e.returnOrder(order, 'DEFECTIVE', releaseHold ? 86400300 : 300)
          : e.buyerCancels(order, 300);
        history.push(...terminal.events);
        moneyEvents.push(...terminal.events);
        const returned = terminal.events.filter((event) => event.type === 'DEFAULT_FUNDING_RETURN');
        expect(returned.reduce((n, event) => n + event.amount.minor, 0)).toBe(gap);
        const outgoing = moneyEvents.reduce(
          (n, event) =>
            n +
            (['REFUND', 'DEFAULT_FUNDING_RETURN', 'PAYOUT_RELEASE'].includes(event.type) &&
            'amount' in event
              ? event.amount.minor
              : 0),
          0,
        );
        const reversed = moneyEvents.reduce(
          (n, event) => n + (event.type === 'PAYOUT_REVERSAL' ? event.amount.minor : 0),
          0,
        );
        expect(outgoing - reversed).toBe(11000 + gap);
        expect(e.rebuildOrder(history)).toEqual(terminal.order);
        expect(() => e.buyerCancels(terminal.order, 400)).toThrow();
      },
    ),
  );
});

it('default refuses duplicated orders and a backup whose delivery promise has passed', () => {
  const order = original();
  expect(() =>
    e.executeSellerDefault(
      'seller',
      [input(order), input(order)],
      [backup(12000)],
      new Map([['backup', 2]]),
      e.money('INR', 10000),
      e.money('INR', 10000),
      [],
      [],
      100,
    ),
  ).toThrow(/unique orders/);
  const cancelled = e.executeSellerDefault(
    'seller',
    [input(order)],
    [backup(12000)],
    new Map([['backup', 1]]),
    e.money('INR', 10000),
    e.money('INR', 10000),
    [],
    [],
    10001,
  );
  expect(cancelled.cancelled).toHaveLength(1);
  expect(cancelled.compensation.minor).toBe(100);
});
