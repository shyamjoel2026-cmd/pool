import { ArrowDownLeft, ArrowUpRight, ChevronRight, Copy, Info, Lock, Receipt, RotateCcw, ShieldCheck, Sparkles, Waves } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useT } from '../lib/i18n';
import { inr } from '../lib/money';
import { fmtDate, fmtDayTime, startOfDayIST } from '../lib/time';
import { productOf } from '../sim/engine';
import { myMoneySummary, myTxns, type Txn } from '../sim/selectors';
import { useNow, useSim } from '../sim/store';
import { Card, Chip, EmptyState, ErrorState, KV, LinkButton, ListSkeleton, Segmented, SimTag, Timeline, useToast } from '../ui/core';
import { AppBar, BellButton, useLoadState } from './parts';

const KIND_ICON: Record<Txn['kind'], typeof ArrowUpRight> = { booking: Lock, order: ArrowUpRight, balance: ArrowUpRight, refund: RotateCcw, wave_drop: Waves, late_credit: ArrowDownLeft, applied: Receipt };

export function MoneyPage() {
  const s = useSim();
  const t = useNow(30000);
  const tr = useT();
  const load = useLoadState('money');
  const [f, setF] = useState<'all' | 'out' | 'in' | 'wave'>('all');
  const txns = useMemo(() => myTxns(s, t), [s, t]);
  const sum = useMemo(() => myMoneySummary(s, t), [s, t]);
  const shown = txns.filter((x) => (f === 'all' ? true : f === 'out' ? x.direction === 'out' : f === 'in' ? x.direction === 'in' && x.kind !== 'wave_drop' : x.kind === 'wave_drop'));
  const groups = new Map<number, Txn[]>();
  for (const x of shown) {
    const d = startOfDayIST(x.at);
    groups.set(d, [...(groups.get(d) ?? []), x]);
  }
  const completed = s.orders.filter((o) => o.isMe && ['handed_over', 'settled'].includes(o.status)).length;
  const pools = new Set(s.pools.filter((p) => p.members.some((m) => m.isMe && m.bookingPaidAt)).map((p) => p.id)).size;
  const neighbours = s.pools.filter((p) => p.members.some((m) => m.isMe && m.bookingPaidAt)).reduce((a, p) => a + p.members.filter((m) => !m.isMe && m.bookingPaidAt).length, 0);
  return (
    <div className="pb-6">
      <AppBar title={tr('Money')} right={<BellButton to="/buyer/notifications" />} />
      {load.state === 'loading' ? <div className="p-4"><ListSkeleton rows={4} /></div> : load.state === 'error' ? <div className="p-4"><ErrorState onRetry={load.retry} /></div> : (
        <div className="space-y-5 px-4 pt-3">
          <div className="overflow-hidden rounded-[22px] bg-night p-4 text-white shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between">
              <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-white/55">{tr('Saved with POOL')}</div>
              <SimTag className="border-white/25 bg-white/10 text-white">{tr('Sample data')}</SimTag>
            </div>
            <div className="num mt-1 text-[36px] font-bold leading-none tracking-[-0.02em]">{inr(sum.savedTotal)}</div>
            <div className="mt-1.5 text-[12.5px] text-white/60">{tr('vs the best outside price on the day, including Wave Drops')}</div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
              <div className="rounded-[12px] bg-white/[0.07] p-2.5"><div className="text-white/55">{tr('Held for you')}</div><div className="num mt-0.5 text-[15px] font-bold">{inr(sum.heldBookings + sum.heldOrders)}</div></div>
              <div className="rounded-[12px] bg-white/[0.07] p-2.5"><div className="text-white/55">{tr('Refunds coming')}</div><div className="num mt-0.5 text-[15px] font-bold">{inr(sum.refundsInProgress)}</div></div>
              <div className="rounded-[12px] bg-white/[0.07] p-2.5"><div className="text-white/55">{tr('Wave Drops')}</div><div className="num mt-0.5 text-[15px] font-bold text-[#7ff0e6]">{inr(sum.waveReceived, { exact: sum.waveReceived % 100 !== 0 })}</div></div>
            </div>
          </div>

          <Card className="flex gap-3 p-4">
            <ShieldCheck className="h-5 w-5 shrink-0 text-save" />
            <div className="text-[12.5px] leading-relaxed text-ink-2"><b className="text-ink">{tr('POOL never keeps a balance for you.')}</b> {tr('Bookings and payments sit with a licensed payment company until your code. Every refund goes back to the same UPI or card you paid with.')}</div>
          </Card>

          {/* Year in POOL: derived from real state only */}
          <div className="relative overflow-hidden rounded-[20px] border border-wave/25 bg-gradient-to-br from-wave-soft via-surface to-brand-soft p-4">
            <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-wave-ink"><Sparkles className="h-4 w-4" />{tr('Your 2026 with POOL')}</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div><div className="num text-[22px] font-bold text-ink">{pools}</div><div className="text-[11.5px] text-ink-3">{tr(pools === 1 ? 'pool joined' : 'pools joined')}</div></div>
              <div><div className="num text-[22px] font-bold text-ink">{completed}</div><div className="text-[11.5px] text-ink-3">{tr(completed === 1 ? 'purchase delivered' : 'purchases delivered')}</div></div>
              <div><div className="num text-[22px] font-bold text-ink">{neighbours}</div><div className="text-[11.5px] text-ink-3">{tr('neighbours pooled with')}</div></div>
            </div>
            <p className="mt-2 text-[12px] text-ink-3">{tr('Counted from your own pools and orders. No estimates.')}</p>
          </div>

          <Segmented value={f} onChange={setF} options={[{ value: 'all', label: tr('All') }, { value: 'out', label: tr('Paid') }, { value: 'in', label: tr('Refunds') }, { value: 'wave', label: tr('Wave Drop') }]} />

          {shown.length === 0 ? (
            <EmptyState icon={<Receipt className="h-6 w-6" />} title={tr('Nothing here yet')} body={tr('Bookings, payments and refunds show up here with their exact status.')} action={<LinkButton to="/buyer/explore" size="sm" variant="outline">{tr('Explore pools')}</LinkButton>} />
          ) : (
            [...groups.entries()].map(([day, xs]) => (
              <div key={day} className="space-y-2">
                <div className="px-1 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-3">{fmtDate(day)}</div>
                <div className="divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-surface">
                  {xs.map((x) => <TxnRow key={x.id} x={x} />)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TxnRow({ x }: { x: Txn }) {
  const tr = useT();
  const Icon = KIND_ICON[x.kind];
  const tone = x.kind === 'wave_drop' ? 'bg-wave-soft text-wave' : x.direction === 'in' ? 'bg-save-soft text-save' : x.direction === 'none' ? 'bg-surface-3 text-ink-3' : 'bg-brand-soft text-brand';
  return (
    <Link to={`/buyer/money/${x.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-[12px]', tone)}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-ink">{x.title}</div>
        <div className="truncate text-[12px] text-ink-3">{x.sub}</div>
      </div>
      <div className="text-right">
        <div className={cn('num text-[14.5px] font-bold', x.direction === 'in' ? 'text-save' : x.direction === 'none' ? 'text-ink-3' : 'text-ink')}>{x.direction === 'in' ? '+' : x.direction === 'out' ? '−' : ''}{inr(x.amount, { exact: x.amount % 100 !== 0 })}</div>
        {x.status === 'processing' ? <Chip tone="warn" className="mt-0.5">{tr('On its way')}</Chip> : x.direction === 'none' ? <span className="text-[11px] text-ink-3">{tr('applied')}</span> : null}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
    </Link>
  );
}

export function TxnPage() {
  const { id } = useParams();
  const s = useSim();
  const t = useNow(15000);
  const tr = useT();
  const toast = useToast();
  const x = myTxns(s, t).find((y) => y.id === id);
  if (!x) return <><AppBar back="/buyer/money" title={tr('Transaction')} /><div className="p-4"><EmptyState title={tr('Transaction not found')} action={<LinkButton to="/buyer/money" size="sm">{tr('Money')}</LinkButton>} /></div></>;
  const Icon = KIND_ICON[x.kind];
  const order = x.orderId ? s.orders.find((o) => o.id === x.orderId) : undefined;
  const pool = x.poolId ? s.pools.find((p) => p.id === x.poolId) : order ? s.pools.find((p) => p.id === order.poolId) : undefined;
  const product = pool ? productOf(s, pool.productId) : undefined;
  const isUpi = (x.method ?? '').includes('UPI');
  const bankRef = x.direction === 'in' ? (isUpi ? `UTR ${x.ref?.slice(-6).replace(/[^0-9]/g, '7').padStart(12, '4')}` : `ARN 74${x.ref?.slice(-6).replace(/[^0-9]/g, '3').padStart(21, '1')}`) : undefined;
  return (
    <div className="pb-10">
      <AppBar back="/buyer/money" title={tr('Transaction')} />
      <div className="space-y-5 px-4 pt-3">
        <div className="flex flex-col items-center py-4 text-center">
          <span className={cn('grid h-14 w-14 place-items-center rounded-[18px]', x.kind === 'wave_drop' ? 'bg-wave-soft text-wave' : x.direction === 'in' ? 'bg-save-soft text-save' : 'bg-brand-soft text-brand')}><Icon className="h-7 w-7" /></span>
          <div className={cn('num mt-3 text-[34px] font-bold tracking-[-0.02em]', x.direction === 'in' ? 'text-save' : 'text-ink')}>{x.direction === 'in' ? '+' : x.direction === 'out' ? '−' : ''}{inr(x.amount, { exact: x.amount % 100 !== 0 })}</div>
          <div className="mt-1 text-[15px] font-semibold text-ink">{x.title}</div>
          <div className="text-[13px] text-ink-3">{x.sub}</div>
          <div className="mt-2">{x.status === 'processing' ? <Chip tone="warn" dot>{tr('On its way')}</Chip> : x.status === 'credited' ? <Chip tone="save" dot>{tr('Credited')}</Chip> : <Chip tone="save" dot>{tr('Successful')}</Chip>}</div>
        </div>

        {x.timeline.length > 0 && <Card className="p-4"><Timeline items={x.timeline.map((st) => ({ title: tr(st.label), sub: fmtDayTime(st.at), state: st.done ? 'done' : 'current' }))} /></Card>}

        <Card className="p-4">
          {x.reason && <KV k={tr('Why')} v={<span className="text-right text-[13px]">{tr(x.reason)}</span>} />}
          {x.method && <KV k={x.direction === 'in' ? tr('Refunded to') : tr('Paid with')} v={<span className="text-[13px]">{x.method}</span>} />}
          <KV k={tr('Date')} v={fmtDayTime(x.at)} />
          {x.ref && <KV k={tr('POOL reference')} v={<button onClick={() => { navigator.clipboard?.writeText(x.ref!); toast(tr('Copied')); }} className="inline-flex items-center gap-1 font-mono text-[12px]">{x.ref}<Copy className="h-3.5 w-3.5 text-ink-3" /></button>} />}
          {bankRef && <KV k={tr('Bank reference')} hint={isUpi ? tr('Show this to your bank if it hasn’t arrived') : tr('Card refunds can take 3–5 working days')} v={<span className="font-mono text-[12px]">{bankRef}</span>} />}
        </Card>

        {product && (
          <Card to={order ? `/buyer/order/${order.id}` : `/buyer/pool/${pool!.id}`} className="flex items-center gap-3 p-4">
            <Receipt className="h-5 w-5 text-ink-3" />
            <div className="flex-1"><div className="text-[14px] font-semibold text-ink">{order ? `${tr('Order')} ${order.no}` : `${tr('Pool')} ${pool!.no}`}</div><div className="text-[12.5px] text-ink-3">{product.short}</div></div>
            <ChevronRight className="h-4 w-4 text-ink-3" />
          </Card>
        )}

        <div className="flex items-start gap-2 rounded-[14px] bg-surface-2 p-3 text-[12px] text-ink-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
          <span>{x.direction === 'in' ? tr('Not received after the expected time? Chat with us. We’ll trace it with the payment company and your bank, and share every reference.') : tr('This money is held by the payment company, not by POOL or the seller, until your handover code.')} <SimTag className="ml-1">{tr('Simulated payment')}</SimTag></span>
        </div>
        <LinkButton to="/buyer/help/chat" variant="outline" full>{tr('Chat about this payment')}</LinkButton>
      </div>
    </div>
  );
}
