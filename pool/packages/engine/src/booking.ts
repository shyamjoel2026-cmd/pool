import { allocate, money, percentOf, sub, type Money } from './money.ts';

export type CheckoutPlan = 'PREPAY_FULL' | 'BALANCE_AT_HANDOVER';
export type BookingRule = { kind: 'FIXED'; amountMinor: number; minMinor: number; maxMinor: number } | { kind: 'BPS'; bps: number; minMinor: number; maxMinor: number };
export interface Booking { readonly due: Money; readonly paid: Money; readonly disposition: 'UNPAID' | 'HELD' | 'REFUNDED' | 'APPLIED'; readonly paymentRef?: string; readonly orderId?: string }
export function bookingAmount(rule: BookingRule, currency: Money['currency'], estimate?: Money): Money {
  for (const n of [rule.minMinor, rule.maxMinor, rule.kind === 'FIXED' ? rule.amountMinor : rule.bps]) if (!Number.isSafeInteger(n) || n < 0) throw new Error('booking rule needs non-negative integers');
  if (rule.maxMinor < rule.minMinor) throw new Error('booking maximum below minimum');
  if (rule.kind === 'BPS' && (!estimate || estimate.currency !== currency || estimate.minor < 0 || rule.bps > 10000)) throw new Error('booking needs an estimate in pool currency and bps <=10000');
  const amount = rule.kind === 'FIXED' ? rule.amountMinor : percentOf(estimate!, rule.bps).minor;
  return money(currency, Math.max(rule.minMinor, Math.min(rule.maxMinor, amount)));
}
export function refundBooking(booking: Booking): { booking: Booking; refund: Money } {
  if (booking.disposition === 'APPLIED') throw new Error('booking already applied to an order');
  const refund = booking.disposition === 'HELD' ? booking.paid : money(booking.due.currency, 0);
  return { booking: { ...booking, disposition: 'REFUNDED' }, refund };
}
export function applyBooking(booking: Booking, total: Money, orderId: string) {
  if (booking.disposition !== 'HELD' || total.currency !== booking.paid.currency || !orderId.trim()) throw new Error('booking cannot be applied');
  // Avoid inventing a partial-refund policy: team price must cover the disclosed booking.
  if (total.minor < booking.paid.minor) throw new Error('buyer total below booking; refund and re-offer before acceptance');
  const [applied, balanceDue] = allocate(total, total.minor === 0 ? [1,0] : [booking.paid.minor, sub(total, booking.paid).minor]);
  return { booking: { ...booking, disposition: 'APPLIED' as const, orderId }, applied: applied!, balanceDue: balanceDue! };
}
