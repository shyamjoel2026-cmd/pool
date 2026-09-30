import { divRoundHalfUp, min, money, type Money, MoneyError, percentOf, sub, sum } from './money.ts';
import type { Category, Policy } from './policy.ts';

export class OrderError extends Error {
  override name = 'OrderError';
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

/** Where every rupee/cent of one order goes. Invariant (tested): parts sum exactly to `total`. */
export interface Split {
  readonly total: Money;
  readonly fee: Money;
  readonly gstOnFee: Money;
  readonly tcs: Money;
  readonly tds: Money;
  readonly installHold: Money;
  readonly waveHold: Money;
  readonly releaseOnCode: Money;
}

export function splitOrder(
  policy: Policy,
  category: Category,
  total: Money,
  opts: { installationIncluded: boolean; waveHoldMinor: number },
): Split {
  if (total.currency !== policy.currency) throw new MoneyError('order currency does not match region');
  if (total.minor <= 0) throw new MoneyError('order total must be positive');
  const fee = percentOf(total, policy.feeBpsByCategory[category]);
  const gstOnFee = percentOf(fee, policy.gstOnFeeBps);
  // TCS is on the net taxable value (price excluding GST); derive it from the GST-inclusive total.
  const taxable = money(total.currency, divRoundHalfUp(total.minor * 10_000, 10_000 + policy.goodsGstBps));
  const tcs = percentOf(taxable, policy.tcsBps);
  const tds = percentOf(total, policy.tdsBps);
  const installHold = opts.installationIncluded ? percentOf(total, policy.installHoldBps) : money(total.currency, 0);
  const waveHold = money(total.currency, opts.waveHoldMinor);
  const deducted = sum(total.currency, [fee, gstOnFee, tcs, tds, installHold, waveHold]);
  const releaseOnCode = sub(total, deducted);
  if (releaseOnCode.minor < 0) throw new OrderError('NEGATIVE_RELEASE', 'deductions exceed the order total');
  return { total, fee, gstOnFee, tcs, tds, installHold, waveHold, releaseOnCode };
}

export type OrderStatus =
  | 'AWAITING_PAYMENT'
  | 'PAID' // captured by the PA; seller share is on hold
  | 'SELLER_CONFIRMED'
  | 'DISPATCHED'
  | 'HANDED_OVER' // code verified → releaseOnCode paid out
  | 'INSTALLED'
  | 'SETTLED' // replacement window passed, no open issue → counts for Wave Drop
  | 'CANCELLED_BY_BUYER'
  | 'CANCELLED_BY_SELLER'
  | 'RETURNED'; // defective / not as described / late → full refund

export type ProofKind = 'SELLER_CONFIRMATION' | 'DISPATCH_PHOTO' | 'CODE_VERIFIED' | 'SERIAL_PHOTO' | 'INVOICE' | 'INSTALL_JOB';

export interface Proof {
  readonly kind: ProofKind;
  readonly ref: string; // storage key / job number / verification id
  readonly by: string;
  readonly at: number;
}

export interface Order {
  readonly id: string;
  readonly poolId: string;
  readonly buyerId: string;
  readonly sellerId: string;
  readonly category: Category;
  readonly split: Split;
  readonly promisedBy: number;
  readonly installationIncluded: boolean;
  readonly installDeferredUntil?: number;
  /** Disclosed before acceptance; charged at most this on refusal after dispatch (and paid to buyer if seller cancels). */
  readonly returnCost: Money;
  readonly status: OrderStatus;
  readonly proofs: readonly Proof[];
  readonly handedOverAt?: number;
  readonly installedAt?: number;
  readonly openIssue: boolean;
}

export type OrderEvent =
  | { type: 'ORDER_STATUS'; orderId: string; from: OrderStatus; to: OrderStatus; at: number }
  | { type: 'PAYOUT_RELEASE'; orderId: string; amount: Money; reason: 'CODE_VERIFIED' | 'INSTALL_CONFIRMED' | 'INSTALL_TIMEOUT'; idempotencyKey: string; at: number }
  | { type: 'LATE_CREDIT'; orderId: string; amount: Money; idempotencyKey: string; at: number }
  | { type: 'REFUND'; orderId: string; amount: Money; reason: string; idempotencyKey: string; at: number }
  | { type: 'SELLER_CHARGE'; orderId: string; amount: Money; reason: string; idempotencyKey: string; at: number };

const flow: Record<OrderStatus, readonly OrderStatus[]> = {
  AWAITING_PAYMENT: ['PAID', 'CANCELLED_BY_BUYER'],
  PAID: ['SELLER_CONFIRMED', 'CANCELLED_BY_BUYER', 'CANCELLED_BY_SELLER'],
  SELLER_CONFIRMED: ['DISPATCHED', 'CANCELLED_BY_BUYER', 'CANCELLED_BY_SELLER'],
  DISPATCHED: ['HANDED_OVER', 'CANCELLED_BY_BUYER', 'CANCELLED_BY_SELLER'],
  HANDED_OVER: ['INSTALLED', 'SETTLED', 'RETURNED'],
  INSTALLED: ['SETTLED', 'RETURNED'],
  SETTLED: [],
  CANCELLED_BY_BUYER: [],
  CANCELLED_BY_SELLER: [],
  RETURNED: [],
};

/** Proof that must exist before an order may enter a status. Status only moves on proof. */
const requiredProof: Partial<Record<OrderStatus, ProofKind>> = {
  SELLER_CONFIRMED: 'SELLER_CONFIRMATION',
  DISPATCHED: 'DISPATCH_PHOTO',
  HANDED_OVER: 'CODE_VERIFIED',
  INSTALLED: 'INSTALL_JOB',
};

export function addProof(order: Order, proof: Proof): Order {
  return { ...order, proofs: [...order.proofs, proof] };
}

function move(order: Order, to: OrderStatus, now: number): { order: Order; event: OrderEvent } {
  if (!flow[order.status].includes(to)) throw new OrderError('BAD_TRANSITION', `${order.status} → ${to} is not allowed`);
  const need = requiredProof[to];
  if (need && !order.proofs.some((p) => p.kind === need)) throw new OrderError('PROOF_MISSING', `${to} needs proof ${need}`);
  return { order: { ...order, status: to }, event: { type: 'ORDER_STATUS', orderId: order.id, from: order.status, to, at: now } };
}

const key = (orderId: string, action: string) => `${orderId}:${action}`;

export function markPaid(order: Order, now: number) {
  return move(order, 'PAID', now);
}
export function confirmBySeller(order: Order, now: number) {
  return move(order, 'SELLER_CONFIRMED', now);
}
export function dispatch(order: Order, now: number) {
  return move(order, 'DISPATCHED', now);
}

/**
 * Handover: the delivery/pickup code was verified (proof CODE_VERIFIED already attached by codes.ts).
 * Releases `releaseOnCode`, minus a late credit to the buyer if delivered after the promised date.
 */
export function handOver(policy: Policy, order: Order, now: number): { order: Order; events: OrderEvent[] } {
  const { order: moved, event } = move(order, 'HANDED_OVER', now);
  const events: OrderEvent[] = [event];
  let release = order.split.releaseOnCode;
  if (now > order.promisedBy) {
    const credit = min(money(release.currency, policy.lateCreditMinor), release);
    release = sub(release, credit);
    events.push({ type: 'LATE_CREDIT', orderId: order.id, amount: credit, idempotencyKey: key(order.id, 'late-credit'), at: now });
  }
  events.push({ type: 'PAYOUT_RELEASE', orderId: order.id, amount: release, reason: 'CODE_VERIFIED', idempotencyKey: key(order.id, 'release-on-code'), at: now });
  return { order: { ...moved, handedOverAt: now }, events };
}

export function confirmInstalled(order: Order, now: number): { order: Order; events: OrderEvent[] } {
  const { order: moved, event } = move(order, 'INSTALLED', now);
  return {
    order: { ...moved, installedAt: now },
    events: [event, { type: 'PAYOUT_RELEASE', orderId: order.id, amount: order.split.installHold, reason: 'INSTALL_CONFIRMED', idempotencyKey: key(order.id, 'install-hold'), at: now }],
  };
}

/**
 * If installation is included but not confirmed: release the install hold after `installReleaseDays`
 * (no issue open), or at the deferred date capped at `deferredInstallMaxDays` after handover.
 */
export function installHoldDue(policy: Policy, order: Order): number | undefined {
  if (!order.installationIncluded || order.handedOverAt === undefined || order.status !== 'HANDED_OVER') return undefined;
  const day = 86_400_000;
  if (order.installDeferredUntil !== undefined) {
    return Math.min(order.installDeferredUntil, order.handedOverAt + policy.deferredInstallMaxDays * day);
  }
  return order.handedOverAt + policy.installReleaseDays * day;
}

export function releaseInstallHoldOnTimeout(policy: Policy, order: Order, now: number): OrderEvent[] {
  const due = installHoldDue(policy, order);
  if (due === undefined || now < due || order.openIssue) return [];
  return [{ type: 'PAYOUT_RELEASE', orderId: order.id, amount: order.split.installHold, reason: 'INSTALL_TIMEOUT', idempotencyKey: key(order.id, 'install-hold'), at: now }];
}

/** Settled = handed over (and installed if required), replacement window passed, no open issue. */
export function canSettle(policy: Policy, order: Order, now: number): boolean {
  if (order.openIssue || order.handedOverAt === undefined) return false;
  if (order.status !== 'HANDED_OVER' && order.status !== 'INSTALLED') return false;
  return now >= order.handedOverAt + policy.settleAfterDays * 86_400_000;
}

export function settle(policy: Policy, order: Order, now: number) {
  if (!canSettle(policy, order, now)) throw new OrderError('NOT_SETTLEABLE', 'order cannot be settled yet');
  return move(order, 'SETTLED', now);
}

/**
 * Buyer cancels. Before dispatch: full refund. After dispatch (refused at the door): refund minus at most the
 * disclosed return cost. Rule 4 symmetry: a seller who cancels pays the buyer the same amount (see sellerCancels).
 */
export function buyerCancels(order: Order, now: number): { order: Order; events: OrderEvent[] } {
  const { order: moved, event } = move(order, 'CANCELLED_BY_BUYER', now);
  const charge = order.status === 'DISPATCHED' ? min(order.returnCost, order.split.total) : money(order.split.total.currency, 0);
  const paid = order.status !== 'AWAITING_PAYMENT';
  const events: OrderEvent[] = [event];
  if (paid) events.push({ type: 'REFUND', orderId: order.id, amount: sub(order.split.total, charge), reason: 'BUYER_CANCELLED', idempotencyKey: key(order.id, 'refund-cancel'), at: now });
  return { order: moved, events };
}

/**
 * Seller cancels a confirmed order: buyer gets a full refund plus compensation equal to the disclosed return cost
 * (mirror of what a refusing buyer would pay). The Wave Drop penalty slab is applied at wave close (wave-drop.ts).
 * The caller then re-offers the buyer the backup bid at the SAME price (seller default rule).
 */
export function sellerCancels(order: Order, now: number): { order: Order; events: OrderEvent[] } {
  const { order: moved, event } = move(order, 'CANCELLED_BY_SELLER', now);
  return {
    order: moved,
    events: [
      event,
      { type: 'REFUND', orderId: order.id, amount: order.split.total, reason: 'SELLER_CANCELLED', idempotencyKey: key(order.id, 'refund-seller-cancel'), at: now },
      { type: 'SELLER_CHARGE', orderId: order.id, amount: order.returnCost, reason: 'CANCELLATION_COMPENSATION', idempotencyKey: key(order.id, 'seller-comp'), at: now },
    ],
  };
}

/**
 * Seller default → backup takes over at the SAME buyer price. If the backup's price is higher, the difference is charged
 * to the defaulting seller (deposit first; POOL reserve covers any shortfall — handled by the ledger).
 */
export function backupCostGap(originalPrice: Money, backupPrice: Money): Money {
  const gap = sub(backupPrice, originalPrice);
  return gap.minor > 0 ? gap : money(originalPrice.currency, 0);
}

/** Defective / not as described / late: full refund (Rule 6). */
export function returnOrder(order: Order, reason: 'DEFECTIVE' | 'NOT_AS_DESCRIBED' | 'LATE', now: number): { order: Order; events: OrderEvent[] } {
  const { order: moved, event } = move(order, 'RETURNED', now);
  return {
    order: moved,
    events: [event, { type: 'REFUND', orderId: order.id, amount: order.split.total, reason, idempotencyKey: key(order.id, 'refund-return'), at: now }],
  };
}
