import { randomUUID } from 'node:crypto';
import type { Pool as PgPool, PoolClient } from 'pg';
import * as e from '@pool/engine';
import { command, type Posting } from './store.ts';
import { claimPayment } from './payments.ts';
import { orderPostings, projectOrder } from './index.ts';

export const sellerDepositAccount = (sellerId: string) => 'seller:' + sellerId + ':deposit';
export const poolReserveAccount = 'pool:reserve';
interface DefaultResult {
  poolId: string;
  sellerId: string;
  affected: e.Order[];
  backupCostGap: e.Money;
  compensation: e.Money;
  fromDeposit: e.Money;
  fromReserve: e.Money;
}

/** Trusted receipt boundary, like buyer capture. M3 supplies verified PA receipts; no network here.
 * Transactions use https://node-postgres.com/features/transactions and the pinned pgledger adapter.
 */
export function fundDefaultAccount(
  db: PgPool,
  target: { sellerId: string } | 'RESERVE',
  amount: e.Money,
  reference: string,
  actorId: string,
) {
  if (amount.currency !== 'INR' || amount.minor <= 0 || !actorId.trim())
    throw new Error('positive INR funding and audit actor required');
  e.money('INR', amount.minor);
  const account = target === 'RESERVE' ? poolReserveAccount : sellerDepositAccount(target.sellerId);
  return command(
    db,
    account,
    'default-funding',
    'default-fund:' + reference,
    { target, amount, reference, actorId },
    async (_, c) => {
      if (
        target !== 'RESERVE' &&
        !(await c.query('SELECT id FROM sellers WHERE id=$1', [target.sellerId])).rowCount
      )
        throw new Error('seller missing');
      await claimPayment(c, reference, account, amount.minor);
      return {
        state: { account, reference, amount },
        events: [{ type: 'DEFAULT_BACKING_CAPTURED', account, reference, amount, actorId }],
        postings: [
          {
            from: target === 'RESERVE' ? 'external:capital' : 'external:seller:' + target.sellerId,
            to: account,
            minor: amount.minor,
            key: 'default-fund:' + reference,
          },
        ],
      };
    },
  );
}

async function balance(c: PoolClient, account: string): Promise<e.Money> {
  const row = (
    await c.query(
      'SELECT a.balance::text AS balance FROM ledger_account_map m JOIN pgledger_accounts a ON a.id=m.ledger_id WHERE m.id=$1',
      [account],
    )
  ).rows[0];
  return e.money('INR', row ? Number(row.balance) : 0);
}

/** One atomic default per seller/pool. Reads stored orders, backup assignments and funded balances.
 * Failed funding rolls back every state change; a retry after funding executes the whole batch.
 * Wave penalties settle at wave close using final settled volume, not an invented count at default time.
 */
export function defaultSeller(
  db: PgPool,
  poolId: string,
  sellerId: string,
  actorId: string,
  now: number,
) {
  if (!actorId.trim() || !sellerId.trim() || !Number.isSafeInteger(now))
    throw new Error('seller default requires actor and UTC time');
  const id = 'default:' + poolId + ':' + sellerId;
  return command<DefaultResult>(
    db,
    id,
    'seller-default',
    id,
    { poolId, sellerId, actorId, now },
    async (existing, c) => {
      if (existing) throw new Error('seller default already executed');
      const pool = (await c.query('SELECT data FROM pools WHERE id=$1 FOR UPDATE', [poolId]))
        .rows[0]?.data as e.Pool | undefined;
      if (!pool || pool.region !== 'IN' || pool.state !== 'AWARDED')
        throw new Error('awarded India pool required');
      const orders = (
        await c.query('SELECT data FROM orders WHERE pool_id=$1 FOR UPDATE', [poolId])
      ).rows.map((r) => r.data as e.Order);
      const open = orders.filter(
        (o) => o.sellerId === sellerId && ['PAID', 'AWAITING_PAYMENT'].includes(o.status),
      );
      if (!open.length) throw new Error('no open orders for this seller');
      const bids = (await c.query('SELECT data FROM bids WHERE pool_id=$1', [poolId])).rows.map(
        (r) => r.data as e.Bid,
      );
      const sellers = (
        await c.query(
          'SELECT id,state_code,data FROM sellers WHERE id IN (SELECT seller_id FROM bids WHERE pool_id=$1)',
          [poolId],
        )
      ).rows;
      for (const b of bids)
        await c.query('INSERT INTO bid_access_log(id,bid_id,actor_id,data) VALUES($1,$2,$3,$4)', [
          randomUUID(),
          b.id,
          actorId,
          { reason: 'seller-default' },
        ]);
      if (!pool.bidRequirements) throw new Error('pool requirements missing');
      const eligible = e.rankBids(
        bids,
        pool.bidRequirements,
        new Map(sellers.map((r) => [r.id, r.data])),
      );
      const capacity = new Map(eligible.map((b) => [b.id, b.capacityBase]));
      // Accepted orders and still-live offers reserve capacity. A cancelled order frees its reservation.
      for (const o of orders.filter(
        (o) => !['CANCELLED_BY_BUYER', 'CANCELLED_BY_SELLER', 'RETURNED'].includes(o.status),
      )) {
        const member = pool.members.find((m) => m.memberId === o.buyerId);
        const bidId = o.bidId ?? pool.offers?.find((offer) => offer.memberId === o.buyerId)?.bidId;
        if (!member || !bidId) throw new Error('order capacity provenance missing');
        if (capacity.has(bidId)) capacity.set(bidId, capacity.get(bidId)! - member.qty.base);
      }
      for (const member of pool.members.filter((m) => m.status === 'OFFERED')) {
        const assignment = pool.assignments?.find((a) => a.memberId === member.memberId);
        if (assignment && capacity.has(assignment.bidId))
          capacity.set(assignment.bidId, capacity.get(assignment.bidId)! - member.qty.base);
      }
      if ([...capacity.values()].some((n) => n < 0))
        throw new Error('persisted commitments exceed bid capacity');
      const depositAccount = sellerDepositAccount(sellerId);
      const result = e.executeSellerDefault(
        sellerId,
        open.map((order) => {
          const member = pool.members.find((m) => m.memberId === order.buyerId)!;
          const assignment = pool.assignments?.find((a) => a.memberId === order.buyerId);
          const backupBidId =
            assignment?.sellerId === sellerId ? assignment.backupBidId : undefined;
          const backup = eligible.find((b) => b.id === backupBidId);
          const stateCode = sellers.find((s) => s.id === backup?.sellerId)?.state_code as
            string | undefined;
          return {
            order,
            ...(backupBidId ? { backupBidId } : {}),
            ...(stateCode ? { backupSellerStateCode: stateCode } : {}),
            qty: member.qty,
            uom: pool.quantityRule.uom,
            needBy: member.needBy,
            options: member.options,
          };
        }),
        eligible,
        capacity,
        await balance(c, depositAccount),
        await balance(c, poolReserveAccount),
        [],
        [],
        now,
      );
      const expenses = [
        ...result.assignments.map((a) => ({ order: a.order, amount: a.gap, replacement: true })),
        ...result.cancelled.map((order) => ({
          order,
          amount: order.returnCost,
          replacement: false,
        })),
      ];
      const depositParts = result.totalCharge.minor
        ? e.allocate(
            result.fromDeposit,
            expenses.map((x) => x.amount.minor),
          )
        : expenses.map(() => e.money('INR', 0));
      const postings: Posting[] = [];
      const affected: e.Order[] = [];
      const events: { type: string; [key: string]: unknown }[] = [
        {
          type: 'SELLER_DEFAULT_EXECUTED',
          poolId,
          sellerId,
          actorId,
          at: now,
          fromDeposit: result.fromDeposit,
          fromReserve: result.fromReserve,
        },
      ];
      for (let i = 0; i < expenses.length; i++) {
        const expense = expenses[i]!;
        const parts = e.allocate(
          expense.amount,
          expense.amount.minor
            ? [depositParts[i]!.minor, expense.amount.minor - depositParts[i]!.minor]
            : [1, 0],
        );
        const sources = [depositAccount, poolReserveAccount]
          .map((account, j) => ({
            id: id + ':' + expense.order.id + ':' + j,
            account,
            amount: parts[j]!,
          }))
          .filter((s) => s.amount.minor > 0);
        for (const source of sources)
          postings.push({
            from: source.account,
            to: expense.order.id + ':held',
            minor: source.amount.minor,
            key: source.id,
          });
        const order = expense.replacement
          ? {
              ...expense.order,
              defaultFundingSources: [...(expense.order.defaultFundingSources ?? []), ...sources],
            }
          : expense.order;
        const orderEvents = result.events.filter(
          (event) =>
            event.orderId === order.id &&
            event.type !== 'SELLER_CHARGE' &&
            event.type !== 'ORDER_SNAPSHOT',
        );
        postings.push(...orderPostings(order, orderEvents));
        affected.push(order);
        // Keep the funding charge and its real source in the audit even though it is not posted as a receivable.
        for (const event of [
          ...result.events.filter(
            (event) => event.orderId === order.id && event.type !== 'ORDER_SNAPSHOT',
          ),
          ...e.recordOrder(order, now).events,
        ])
          await c.query(
            'INSERT INTO audit_events(id,aggregate_id,event_type,data) VALUES($1,$2,$3,$4)',
            [randomUUID(), order.id, event.type, event],
          );
        events.push({
          type: 'DEFAULT_FUNDING_ASSIGNED',
          orderId: order.id,
          sources,
          amount: expense.amount,
          at: now,
        });
      }
      return {
        state: {
          poolId,
          sellerId,
          affected,
          backupCostGap: result.backupCostGap,
          compensation: result.compensation,
          fromDeposit: result.fromDeposit,
          fromReserve: result.fromReserve,
        },
        events,
        postings,
      };
    },
    async (c, state) => {
      for (const order of state.affected) {
        const updated = await c.query(
          "UPDATE aggregates SET data=$2,version=version+1 WHERE id=$1 AND kind='order'",
          [order.id, order],
        );
        if (updated.rowCount !== 1) throw new Error('order aggregate missing');
        // A code issued for the previous seller's attempt cannot authorize the replacement's handover.
        const codes = await c.query('SELECT id,data FROM handover_codes WHERE order_id=$1', [
          order.id,
        ]);
        for (const code of codes.rows)
          await c.query('UPDATE handover_codes SET data=$2 WHERE id=$1', [
            code.id,
            { ...code.data, usedAt: now },
          ]);
        await projectOrder(c, order);
      }
    },
  );
}
