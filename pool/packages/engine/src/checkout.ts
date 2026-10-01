import { money, type Money } from './money.ts';
import { handOver, recordOrder, type Order, type OrderEvent, OrderError } from './order.ts';
import { verifyCode, type StoredCode, type Checklist } from './codes.ts';
import type { CheckoutPlan } from './booking.ts';
// No cash: RBI PA Directions 2025, general escrow directions 17(b).
// https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12896
export function beginCheckout(
  order: Order,
  plan: CheckoutPlan,
  bookingApplied: Money,
  now: number,
) {
  if (
    !Number.isSafeInteger(now) ||
    !Number.isSafeInteger(order.promisedBy) ||
    order.promisedBy < now
  )
    throw new OrderError('CHECKOUT', 'delivery promise must not be in the past');
  if (
    order.status !== 'AWAITING_PAYMENT' ||
    bookingApplied.currency !== order.split.buyerTotal.currency ||
    bookingApplied.minor < 0 ||
    bookingApplied.minor > order.split.buyerTotal.minor
  )
    throw new OrderError('CHECKOUT', 'invalid booking credit');
  return recordOrder(
    {
      ...order,
      checkoutPlan: plan,
      collectedMinor: bookingApplied.minor,
      paymentRefs: [],
      status:
        plan === 'BALANCE_AT_HANDOVER' || bookingApplied.minor === order.split.buyerTotal.minor
          ? 'PAID'
          : 'AWAITING_PAYMENT',
    },
    now,
  );
}
export function collectBalance(
  order: Order,
  amount: Money,
  paymentRef: string,
  method: 'UPI' | 'CARD',
  now: number,
) {
  if (
    !['AWAITING_PAYMENT', 'PAID'].includes(order.status) ||
    !['UPI', 'CARD'].includes(method) ||
    !paymentRef.trim() ||
    order.collectedMinor === undefined
  )
    throw new OrderError('PAYMENT', 'valid checkout and PA payment receipt required');
  if (order.paymentRefs?.includes(paymentRef))
    throw new OrderError('DUPLICATE', 'payment already recorded');
  if (
    amount.currency !== order.split.buyerTotal.currency ||
    amount.minor <= 0 ||
    amount.minor !== order.split.buyerTotal.minor - order.collectedMinor
  )
    throw new OrderError('BALANCE', 'payment must equal outstanding balance');
  const result = recordOrder(
    {
      ...order,
      collectedMinor: order.collectedMinor + amount.minor,
      paymentRefs: [...(order.paymentRefs ?? []), paymentRef],
      status: 'PAID',
    },
    now,
  );
  const event: OrderEvent = {
    type: 'CAPTURE',
    orderId: order.id,
    amount,
    idempotencyKey: order.id + ':capture:' + paymentRef,
    at: now,
  };
  return { ...result, events: [event, ...result.events] };
}
export function verifyAndHandOver(
  order: Order,
  secret: string,
  stored: StoredCode,
  attempt: string,
  checklist: Checklist,
  now: number,
) {
  if (order.collectedMinor !== order.split.buyerTotal.minor)
    throw new OrderError('BALANCE', 'pay remaining balance through PA before code verification');
  if (stored.orderId !== order.id) throw new OrderError('CODE', 'code belongs to another order');
  const result = verifyCode(secret, stored, attempt, now, checklist);
  if (!result.ok) return { ok: false as const, code: result.code, reason: result.reason };
  return {
    ok: true as const,
    code: result.code,
    ...handOver(order, { secret, stored, attempt, checklist }, now),
  };
}
export const balanceDue = (order: Order) =>
  money(
    order.split.buyerTotal.currency,
    order.split.buyerTotal.minor - (order.collectedMinor ?? 0),
  );
