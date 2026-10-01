import { allocate, money, sum, type Money } from './money.ts';
import { backupCostGap, sellerCancels, type Order, type OrderEvent } from './order.ts';
import { lineTotal, type Quantity, type UnitOfMeasure } from './uom.ts';
import { type Bid } from './bids.ts';
import { closeWave, type WaveOrder, type Slab } from './wave-drop.ts';
export interface DefaultOrder {
  order: Order;
  backupBidId?: string;
  qty: Quantity;
  uom: UnitOfMeasure;
  needBy: number;
  options: readonly string[];
}
/** Remaining capacity includes commitments outside this default batch and is mandatory. */
export function executeSellerDefault(
  sellerId: string,
  open: readonly DefaultOrder[],
  bids: readonly Bid[],
  remainingCapacity: ReadonlyMap<string, number>,
  deposit: Money,
  reserve: Money,
  slabs: readonly Slab[],
  waveOrders: readonly WaveOrder[],
  now: number,
) {
  if (deposit.currency !== reserve.currency || deposit.minor < 0 || reserve.minor < 0)
    throw new Error('invalid default funding');
  const remaining = new Map(remainingCapacity);
  const events: OrderEvent[] = [];
  const assignments: { order: Order; bidId: string; gap: Money }[] = [];
  const cancelled: Order[] = [];
  for (const item of [...open].sort((a, b) => a.order.id.localeCompare(b.order.id))) {
    const o = item.order;
    if (o.sellerId !== sellerId || !['PAID', 'AWAITING_PAYMENT'].includes(o.status))
      throw new Error('default applies only to this seller open orders');
    const bid = bids.find(
      (b) =>
        b.id === item.backupBidId &&
        b.sellerId !== sellerId &&
        b.poolId === o.poolId &&
        b.validUntil >= now &&
        b.deliverBy <= item.needBy &&
        b.uom === item.qty.uom &&
        item.options.every((x) => b.optionsCovered.includes(x)),
    );
    if (bid && (remaining.get(bid.id) ?? 0) >= item.qty.base) {
      remaining.set(bid.id, remaining.get(bid.id)! - item.qty.base);
      const gap = backupCostGap(
        o.split.sellerTotal,
        lineTotal(bid.sellerPrice, item.qty, item.uom),
      );
      const backupTotal = lineTotal(bid.sellerPrice, item.qty, item.uom);
      const difference = backupTotal.minor - o.split.sellerTotal.minor;
      if (o.split.releaseOnHandover.minor + difference < 0)
        throw new Error('backup price insufficient for existing deductions');
      const split = {
        ...o.split,
        sellerTotal: backupTotal,
        margin: money(deposit.currency, o.split.margin.minor + Math.max(0, -difference)),
        releaseOnHandover: money(deposit.currency, o.split.releaseOnHandover.minor + difference),
      };
      assignments.push({
        order: { ...o, split, sellerId: bid.sellerId, promisedBy: bid.deliverBy },
        bidId: bid.id,
        gap,
      });
      events.push({
        type: 'SELLER_CHARGE',
        orderId: o.id,
        amount: gap,
        reason: 'BACKUP_COST_GAP',
        idempotencyKey: o.id + ':default-gap',
        at: now,
      });
    } else {
      if (o.status !== 'PAID')
        throw new Error('unpaid default cancellation requires checkout refund accounting');
      const result = sellerCancels(o, now);
      cancelled.push(result.order);
      events.push(...result.events);
    }
  }
  const wavePenalty = closeWave(deposit.currency, slabs, waveOrders).sellerPenalty;
  const gapTotal = sum(
    deposit.currency,
    assignments.map((a) => a.gap),
  );
  const compensation = sum(
    deposit.currency,
    cancelled.map((o) => o.returnCost),
  );
  const totalCharge = sum(deposit.currency, [gapTotal, compensation, wavePenalty]);
  const depositUsed = Math.min(deposit.minor, totalCharge.minor);
  const reserveUsed = totalCharge.minor - depositUsed;
  if (reserveUsed > reserve.minor)
    throw new Error('insufficient seller deposit and POOL reserve; no partial default execution');
  const [fromDeposit, fromReserve] = allocate(
    totalCharge,
    totalCharge.minor === 0 ? [1, 0] : [depositUsed, reserveUsed],
  );
  return {
    assignments,
    cancelled,
    events,
    backupCostGap: gapTotal,
    wavePenalty,
    compensation,
    totalCharge,
    fromDeposit: fromDeposit!,
    fromReserve: fromReserve!,
    remainingCapacity: remaining,
  };
}
