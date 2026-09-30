import { divRoundHalfUp, min, money, type Money, MoneyError, percentOf, sub, sum } from './money.ts';
import type { Policy } from './policy.ts';
import { type FulfilmentProfile, stepsBeforeHandover } from './fulfilment.ts';

export class OrderError extends Error {
  override name = 'OrderError';
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

/**
 * Where every rupee/cent of one order goes. Invariant (tested):
 *   buyerTotal = margin + tcs + tds + Σ holds + waveHold + releaseOnHandover
 * - margin: POOL's difference (buyer price set by the team − seller price); in India it contains GST on commission.
 * - tcs/tds: withheld from the SELLER's share (India), they are the seller's tax credits.
 * - holds: per the fulfilment profile (e.g. installation), taken from the seller's share.
 */
export interface Split {
  readonly buyerTotal: Money;
  readonly sellerTotal: Money;
  readonly margin: Money;
  readonly gstInMargin: Money;
  readonly tcs: Money;
  readonly tds: Money;
  readonly holds: ReadonlyArray<{ key: string; amount: Money }>;
  readonly waveHold: Money;
  readonly releaseOnHandover: Money;
}

export function splitOrder(
  policy: Policy,
  input: {
    buyerTotal: Money;
    sellerTotal: Money;
    /** GST rate of THIS product (varies: 0% fresh produce, 5%, 18% …). Used for the TCS taxable value. */
    goodsTaxBps: number;
    profile: FulfilmentProfile;
    waveHoldMinor: number;
  },
): Split {
  const { buyerTotal, sellerTotal, goodsTaxBps, profile } = input;
  if (buyerTotal.currency !== policy.currency || sellerTotal.currency !== policy.currency) throw new MoneyError('currency does not match region');
  if (buyerTotal.minor <= 0 || sellerTotal.minor <= 0) throw new MoneyError('totals must be positive');
  const margin = sub(buyerTotal, sellerTotal);
  if (margin.minor < 0 && !policy.allowBelowSellerPrice) throw new OrderError('BELOW_SELLER_PRICE', 'buyer total below seller total');
  const gstInMargin =
    margin.minor > 0 && policy.gstOnCommissionBps > 0
      ? money(margin.currency, divRoundHalfUp(margin.minor * policy.gstOnCommissionBps, 10_000 + policy.gstOnCommissionBps))
      : money(margin.currency, 0);
  // The seller invoices the buyer at buyerTotal; TCS is on its net taxable value, TDS on the gross.
  const taxable = money(buyerTotal.currency, divRoundHalfUp(buyerTotal.minor * 10_000, 10_000 + goodsTaxBps));
  const tcs = percentOf(taxable, policy.tcsBps);
  const tds = percentOf(buyerTotal, policy.tdsBps);
  const holds = profile.holds.map((h) => ({ key: h.key, amount: percentOf(sellerTotal, h.bps) }));
  const waveHold = money(sellerTotal.currency, input.waveHoldMinor);
  const releaseOnHandover = sub(sellerTotal, sum(sellerTotal.currency, [tcs, tds, waveHold, ...holds.map((h) => h.amount)]));
  if (releaseOnHandover.minor < 0) throw new OrderError('NEGATIVE_RELEASE', 'deductions exceed the seller total');
  return { buyerTotal, sellerTotal, margin, gstInMargin, tcs, tds, holds, waveHold, releaseOnHandover };
}

export type OrderStatus =
  | 'AWAITING_PAYMENT'
  | 'PAID' // captured by the payment aggregator; seller share on hold
  | 'HANDED_OVER' // handover code verified → releaseOnHandover paid out
  | 'SETTLED' // return window passed, no open issue → counts for Wave Drop
  | 'CANCELLED_BY_BUYER'
  | 'CANCELLED_BY_SELLER'
  | 'RETURNED'; // defective / not as described / late → full refund

export interface StepRecord {
  readonly key: string;
  readonly proofRef: string;
  readonly by: string;
  readonly at: number;
}

export interface Order {
  readonly id: string;
  readonly poolId: string;
  readonly buyerId: string;
  readonly sellerId: string;
  readonly profile: FulfilmentProfile;
  readonly split: Split;
  readonly promisedBy: number;
  /** Disclosed before acceptance: max charge on refusal after a return-cost step; also paid to the buyer if the seller cancels. */
  readonly returnCost: Money;
  readonly status: OrderStatus;
  readonly steps: readonly StepRecord[];
  readonly handedOverAt?: number;
  /** Hold key → date the buyer deferred to (e.g. installation later). */
  readonly holdDeferrals: Readonly<Record<string, number>>;
  readonly holdsReleased: readonly string[];
  readonly openIssue: boolean;
}

export type OrderEvent =
  | { type: 'ORDER_STATUS'; orderId: string; from: OrderStatus; to: OrderStatus; at: number }
  | { type: 'STEP_DONE'; orderId: string; step: string; proofRef: string; at: number }
  | { type: 'PAYOUT_RELEASE'; orderId: string; amount: Money; reason: string; idempotencyKey: string; at: number }
  | { type: 'LATE_CREDIT'; orderId: string; amount: Money; idempotencyKey: string; at: number }
  | { type: 'REFUND'; orderId: string; amount: Money; reason: string; idempotencyKey: string; at: number }
  | { type: 'SELLER_CHARGE'; orderId: string; amount: Money; reason: string; idempotencyKey: string; at: number };

const key = (orderId: string, action: string) => `${orderId}:${action}`;
const isDone = (o: Order, stepKey: string) => o.steps.some((s) => s.key === stepKey);
const terminal: readonly OrderStatus[] = ['SETTLED', 'CANCELLED_BY_BUYER', 'CANCELLED_BY_SELLER', 'RETURNED'];

function status(o: Order, to: OrderStatus, now: number): { order: Order; event: OrderEvent } {
  return { order: { ...o, status: to }, event: { type: 'ORDER_STATUS', orderId: o.id, from: o.status, to, at: now } };
}

export function markPaid(o: Order, now: number) {
  if (o.status !== 'AWAITING_PAYMENT') throw new OrderError('BAD_STATE', `cannot mark paid from ${o.status}`);
  return status(o, 'PAID', now);
}

/**
 * Complete a fulfilment step with its proof. Steps before handover must be done in the profile's order.
 * After-handover steps (e.g. installation) may release a hold.
 */
export function completeStep(o: Order, stepKey: string, proofRef: string, by: string, now: number): { order: Order; events: OrderEvent[] } {
  const step = o.profile.steps.find((s) => s.key === stepKey);
  if (!step) throw new OrderError('UNKNOWN_STEP', `step ${stepKey} is not in profile ${o.profile.id}`);
  if (!proofRef.trim()) throw new OrderError('PROOF_MISSING', `step ${stepKey} needs proof (${step.proof})`);
  if (isDone(o, stepKey)) throw new OrderError('ALREADY_DONE', `step ${stepKey} already done`);
  if (terminal.includes(o.status)) throw new OrderError('BAD_STATE', `order is ${o.status}`);
  if (!step.afterHandover) {
    if (o.status !== 'PAID') throw new OrderError('BAD_STATE', 'pre-handover steps need a paid, not yet handed-over order');
    const before = stepsBeforeHandover(o.profile);
    const idx = before.findIndex((s) => s.key === stepKey);
    const pending = before.slice(0, idx).find((s) => !isDone(o, s.key));
    if (pending) throw new OrderError('OUT_OF_ORDER', `complete ${pending.key} first`);
  } else if (o.status !== 'HANDED_OVER') {
    throw new OrderError('BAD_STATE', 'after-handover steps need a handed-over order');
  }
  const record: StepRecord = { key: stepKey, proofRef, by, at: now };
  let order: Order = { ...o, steps: [...o.steps, record] };
  const events: OrderEvent[] = [{ type: 'STEP_DONE', orderId: o.id, step: stepKey, proofRef, at: now }];
  if (step.releasesHold && !order.holdsReleased.includes(step.releasesHold)) {
    const h = order.split.holds.find((x) => x.key === step.releasesHold)!;
    order = { ...order, holdsReleased: [...order.holdsReleased, h.key] };
    events.push({ type: 'PAYOUT_RELEASE', orderId: o.id, amount: h.amount, reason: `HOLD_${h.key.toUpperCase()}_STEP`, idempotencyKey: key(o.id, `hold-${h.key}`), at: now });
  }
  return { order, events };
}

/**
 * Handover: all pre-handover steps done and the handover code verified (codes.ts). Releases `releaseOnHandover`,
 * minus the profile's late credit to the buyer if after the promised time.
 */
export function handOver(o: Order, codeVerificationRef: string, now: number): { order: Order; events: OrderEvent[] } {
  if (o.status !== 'PAID') throw new OrderError('BAD_STATE', `cannot hand over from ${o.status}`);
  if (!codeVerificationRef.trim()) throw new OrderError('PROOF_MISSING', 'handover needs a verified code');
  const pending = stepsBeforeHandover(o.profile).find((s) => !isDone(o, s.key));
  if (pending) throw new OrderError('OUT_OF_ORDER', `complete ${pending.key} first`);
  const { order: moved, event } = status(o, 'HANDED_OVER', now);
  const events: OrderEvent[] = [event];
  let release = o.split.releaseOnHandover;
  if (now > o.promisedBy && o.profile.lateCreditMinor > 0) {
    const credit = min(money(release.currency, o.profile.lateCreditMinor), release);
    release = sub(release, credit);
    events.push({ type: 'LATE_CREDIT', orderId: o.id, amount: credit, idempotencyKey: key(o.id, 'late-credit'), at: now });
  }
  events.push({ type: 'PAYOUT_RELEASE', orderId: o.id, amount: release, reason: 'HANDOVER_CODE', idempotencyKey: key(o.id, 'release-on-handover'), at: now });
  return { order: { ...moved, handedOverAt: now, steps: [...moved.steps, { key: 'handover', proofRef: codeVerificationRef, by: o.buyerId, at: now }] }, events };
}

export function deferHold(o: Order, holdKey: string, until: number): Order {
  if (!o.profile.holds.some((h) => h.key === holdKey)) throw new OrderError('UNKNOWN_HOLD', holdKey);
  return { ...o, holdDeferrals: { ...o.holdDeferrals, [holdKey]: until } };
}

/** When each unreleased hold falls due (after handover). */
export function holdsDue(o: Order): ReadonlyArray<{ key: string; dueAt: number }> {
  if (o.handedOverAt === undefined) return [];
  const day = 86_400_000;
  return o.profile.holds
    .filter((h) => !o.holdsReleased.includes(h.key))
    .map((h) => {
      const deferred = o.holdDeferrals[h.key];
      const dueAt =
        deferred !== undefined && h.deferredMaxDays !== undefined
          ? Math.min(deferred, o.handedOverAt! + h.deferredMaxDays * day)
          : o.handedOverAt! + h.releaseAfterDays * day;
      return { key: h.key, dueAt };
    });
}

export function releaseDueHolds(o: Order, now: number): { order: Order; events: OrderEvent[] } {
  if (o.openIssue) return { order: o, events: [] };
  const due = holdsDue(o).filter((h) => now >= h.dueAt);
  const events: OrderEvent[] = due.map((d) => {
    const h = o.split.holds.find((x) => x.key === d.key)!;
    return { type: 'PAYOUT_RELEASE', orderId: o.id, amount: h.amount, reason: `HOLD_${h.key.toUpperCase()}_TIMEOUT`, idempotencyKey: key(o.id, `hold-${h.key}`), at: now };
  });
  return { order: { ...o, holdsReleased: [...o.holdsReleased, ...due.map((d) => d.key)] }, events };
}

/** Settled = handed over, return window passed, no open issue. */
export function canSettle(o: Order, now: number): boolean {
  return !o.openIssue && o.status === 'HANDED_OVER' && o.handedOverAt !== undefined && now >= o.handedOverAt + o.profile.returnWindowDays * 86_400_000;
}

export function settle(o: Order, now: number) {
  if (!canSettle(o, now)) throw new OrderError('NOT_SETTLEABLE', 'order cannot be settled yet');
  return status(o, 'SETTLED', now);
}

/**
 * Buyer cancels before handover. Free, unless a step marked `returnCostAppliesAfter` is done (e.g. dispatched):
 * then at most the disclosed return cost (E-Commerce Rules 2020 Rule 4 symmetry — see sellerCancels).
 */
export function buyerCancels(o: Order, now: number): { order: Order; events: OrderEvent[] } {
  if (o.status !== 'AWAITING_PAYMENT' && o.status !== 'PAID') throw new OrderError('BAD_STATE', `cannot cancel from ${o.status}`);
  const costApplies = o.profile.steps.some((s) => s.returnCostAppliesAfter && isDone(o, s.key));
  const charge = costApplies ? min(o.returnCost, o.split.buyerTotal) : money(o.split.buyerTotal.currency, 0);
  const { order, event } = status(o, 'CANCELLED_BY_BUYER', now);
  const events: OrderEvent[] = [event];
  if (o.status === 'PAID') events.push({ type: 'REFUND', orderId: o.id, amount: sub(o.split.buyerTotal, charge), reason: 'BUYER_CANCELLED', idempotencyKey: key(o.id, 'refund-cancel'), at: now });
  return { order, events };
}

/** Seller cancels: full refund to the buyer + compensation equal to the disclosed return cost, charged to the seller. */
export function sellerCancels(o: Order, now: number): { order: Order; events: OrderEvent[] } {
  if (o.status !== 'PAID') throw new OrderError('BAD_STATE', `cannot cancel from ${o.status}`);
  const { order, event } = status(o, 'CANCELLED_BY_SELLER', now);
  return {
    order,
    events: [
      event,
      { type: 'REFUND', orderId: o.id, amount: o.split.buyerTotal, reason: 'SELLER_CANCELLED', idempotencyKey: key(o.id, 'refund-seller-cancel'), at: now },
      { type: 'SELLER_CHARGE', orderId: o.id, amount: o.returnCost, reason: 'CANCELLATION_COMPENSATION', idempotencyKey: key(o.id, 'seller-comp'), at: now },
    ],
  };
}

/**
 * Seller default → the backup seller serves the buyer at the SAME buyer price. If the backup's seller price is
 * higher, the gap is charged to the defaulting seller (deposit first; POOL covers any shortfall).
 */
export function backupCostGap(originalSellerPrice: Money, backupSellerPrice: Money): Money {
  const gap = sub(backupSellerPrice, originalSellerPrice);
  return gap.minor > 0 ? gap : money(originalSellerPrice.currency, 0);
}

/** Defective / not as described / late: full refund (Rule 6). */
export function returnOrder(o: Order, reason: 'DEFECTIVE' | 'NOT_AS_DESCRIBED' | 'LATE', now: number): { order: Order; events: OrderEvent[] } {
  if (o.status !== 'HANDED_OVER') throw new OrderError('BAD_STATE', `cannot return from ${o.status}`);
  const { order, event } = status(o, 'RETURNED', now);
  return { order, events: [event, { type: 'REFUND', orderId: o.id, amount: o.split.buyerTotal, reason, idempotencyKey: key(o.id, 'refund-return'), at: now }] };
}

