import { AlertTriangle, ArrowRightLeft, Camera, CheckCircle2, Clock, Download, RefreshCw, Scale, ShieldCheck, Truck, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/cn';
import { inr } from '../lib/money';
import { fmtDay, fmtDayTime, fmtTime, fmtWhen } from '../lib/time';
import { productOf, sellerOf } from '../sim/engine';
import { allRefunds, ledger } from '../sim/selectors';
import { reassignLateOrders, replyTicket, resolveTicket, useNow, useSim } from '../sim/store';
import type { Ticket } from '../sim/types';
import { Button, Card, Chip, Countdown, EmptyState, inputCls, KV, Segmented, Sheet, SimTag, useToast } from '../ui/core';
import { ProductArt } from '../ui/ProductArt';
import { Kpi, PageHead } from './OpsApp';

// ---------------------------------------------------------------- Exceptions & refunds
export function Exceptions() {
  const s = useSim();
  const t = useNow(15000);
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as 'tickets' | 'late' | 'refunds') ?? 'tickets';
  const open = s.tickets.filter((x) => x.status !== 'resolved');
  const late = s.orders.filter((o) => o.status === 'confirmed' && o.promisedBy < t);
  const refunds = allRefunds(s, t);
  return (
    <>
      <PageHead title="Exceptions & refunds" sub="Seller replies within 24 hours; POOL acknowledges within 48 and decides. If a buyer is owed money, POOL refunds first and recovers from the seller." />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Open tickets" value={open.length} sub={`${open.filter((x) => x.sellerDueBy < t).length} past seller deadline`} tone={open.length ? 'warn' : 'save'} />
        <Kpi label="Late orders" value={late.length} sub="past promised date" tone={late.length ? 'danger' : 'save'} />
        <Kpi label="Refunds in flight" value={inr(refunds.filter((r) => r.status === 'processing').reduce((a, r) => a + r.amount, 0))} tone="warn" />
        <Kpi label="Refunded, all time" value={inr(refunds.filter((r) => r.status === 'credited').reduce((a, r) => a + r.amount, 0))} tone="save" />
      </div>
      <Segmented className="mb-4 max-w-[520px]" value={tab} onChange={(v) => setParams({ tab: v })} options={[{ value: 'tickets', label: 'Tickets', count: open.length }, { value: 'late', label: 'Late orders', count: late.length }, { value: 'refunds', label: 'Refunds', count: refunds.length }]} />
      {tab === 'tickets' && (s.tickets.length === 0 ? <EmptyState title="No tickets" /> : <div className="grid gap-4 xl:grid-cols-2">{[...open, ...s.tickets.filter((x) => x.status === 'resolved').slice(0, 4)].map((tk) => <TicketPanel key={tk.id} tk={tk} t={t} />)}</div>)}
      {tab === 'late' && <LateOrders t={t} />}
      {tab === 'refunds' && (
        <div className="overflow-x-auto rounded-[22px] border border-line bg-surface">
          <table className="w-full min-w-[820px] text-[13px]">
            <thead className="bg-surface-2 text-left text-[12px] text-ink-3"><tr><th className="px-4 py-2.5 font-semibold">Buyer</th><th className="px-3 py-2.5 font-semibold">Pool</th><th className="px-3 py-2.5 font-semibold">Reason</th><th className="px-3 py-2.5 text-right font-semibold">Amount</th><th className="px-3 py-2.5 font-semibold">Started</th><th className="px-3 py-2.5 font-semibold">Status</th><th className="px-3 py-2.5 font-semibold">Reference</th></tr></thead>
            <tbody className="divide-y divide-line">
              {refunds.slice(0, 80).map((r) => <tr key={r.id} className="hover:bg-surface-2"><td className="px-4 py-2.5 font-semibold text-ink">{r.who}{r.isMe && <Chip tone="brand" className="ml-1.5">walkthrough</Chip>}</td><td className="px-3 py-2.5 text-ink-2">{productOf(s, r.pool.productId).short}</td><td className="px-3 py-2.5 text-ink-2">{r.reason}</td><td className="num px-3 py-2.5 text-right font-bold">{inr(r.amount, { exact: r.amount % 100 !== 0 })}</td><td className="px-3 py-2.5 text-ink-3">{fmtWhen(r.at, t)}</td><td className="px-3 py-2.5"><Chip tone={r.status === 'credited' ? 'save' : 'warn'} dot>{r.status === 'credited' ? 'Credited' : 'Processing'}</Chip></td><td className="px-3 py-2.5 font-mono text-[11.5px] text-ink-3">{r.ref}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function TicketPanel({ tk, t }: { tk: Ticket; t: number }) {
  const s = useSim();
  const toast = useToast();
  const o = s.orders.find((x) => x.id === tk.orderId)!;
  const product = productOf(s, o.productId);
  const seller = sellerOf(s, tk.sellerId);
  const [decide, setDecide] = useState(false);
  const [kind, setKind] = useState<NonNullable<Ticket['resolution']>['kind']>(tk.wants === 'refund' ? 'refund' : tk.wants);
  const [amt, setAmt] = useState('');
  const [msg, setMsg] = useState('');
  const overdue = tk.status === 'open' && tk.sellerDueBy < t;
  return (
    <Card className={cn('p-4', overdue && 'border-danger/40')}>
      <div className="flex items-start gap-3">
        <ProductArt art={product.art} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className="text-[15px] font-bold text-ink">{tk.no}</span><Chip tone={tk.status === 'resolved' ? 'save' : overdue ? 'danger' : 'warn'} dot>{tk.status === 'resolved' ? 'Resolved' : overdue ? 'Seller missed deadline' : tk.status.replace('_', ' ')}</Chip><Chip>{tk.type.replace(/_/g, ' ')}</Chip></div>
          <div className="mt-0.5 text-[12.5px] text-ink-3">{tk.buyerName} · {product.short} · {o.no} · {seller.name} · wants {tk.wants}</div>
        </div>
      </div>
      {tk.status !== 'resolved' && <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]"><div className="rounded-[10px] bg-surface-2 px-3 py-2"><div className="text-ink-3">Seller reply due</div><div className={cn('font-semibold', overdue ? 'text-danger' : 'text-ink')}>{fmtWhen(tk.sellerDueBy, t)}</div></div><div className="rounded-[10px] bg-surface-2 px-3 py-2"><div className="text-ink-3">POOL decision due</div><div className="font-semibold text-ink"><Countdown to={tk.ackBy} compact className="text-[12px]" /></div></div></div>}
      <div className="mt-3 max-h-[220px] space-y-2 overflow-y-auto">
        {tk.messages.map((m, i) => <div key={i} className={cn('rounded-[12px] px-3 py-2 text-[12.5px]', m.from === 'pool' ? 'bg-sim-soft' : m.from === 'seller' ? 'bg-wave-soft' : 'bg-surface-3')}><span className="font-bold uppercase text-[10.5px] text-ink-3">{m.from} · {fmtTime(m.at)}</span><div className="text-ink">{m.text}</div></div>)}
      </div>
      {tk.photos > 0 && <div className="mt-2 flex gap-2">{Array.from({ length: tk.photos }).map((_, i) => <div key={i} className="grid h-12 w-12 place-items-center rounded-[10px] bg-surface-3 text-ink-3"><Camera className="h-4 w-4" /></div>)}<span className="self-center text-[11.5px] text-ink-3">{tk.photos} buyer photo{tk.photos > 1 ? 's' : ''}</span></div>}
      {tk.resolution ? (
        <div className="mt-3 rounded-[12px] bg-save-soft p-3 text-[12.5px] text-ink-2"><b className="text-ink">Outcome:</b> {tk.resolution.kind.replace('_', ' ')}{tk.resolution.amountPaise ? ` · ${inr(tk.resolution.amountPaise)}` : ''} · by {tk.resolution.by} · {fmtWhen(tk.resolution.at, t)}</div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setDecide(true)}>Decide</Button>
          <Button size="sm" variant="outline" onClick={() => { replyTicket(tk.id, 'pool', 'POOL is reviewing. We have the photos and will decide within 48 hours. Your money stays protected meanwhile.'); toast('Acknowledged to buyer and seller'); }}>Acknowledge</Button>
          <Link to={`/ops/exceptions?tab=late`} className="self-center text-[12.5px] font-semibold text-brand">Late orders →</Link>
        </div>
      )}
      <Sheet open={decide} onClose={() => setDecide(false)} title={`Decide ${tk.no}`} footer={<Button full disabled={kind === 'partial_refund' && !Number(amt)} onClick={() => { const r = resolveTicket(tk.id, kind, kind === 'partial_refund' ? Math.round(Number(amt) * 100) : kind === 'refund' ? o.paidPaise : undefined, msg.trim() || undefined); setDecide(false); r.ok ? toast('Decision sent to buyer and seller') : toast(r.error, 'err'); }}>Send decision</Button>}>
        <div className="space-y-3">
          <Segmented value={kind} onChange={setKind} options={[{ value: 'replacement', label: 'Replace' }, { value: 'repair', label: 'Repair' }, { value: 'partial_refund', label: 'Part refund' }, { value: 'refund', label: 'Refund' }, { value: 'rejected', label: 'Reject' }]} />
          {kind === 'refund' && <KV k="Full refund to the buyer’s original method" v={inr(o.paidPaise)} strong hint="POOL pays first; recovered from the seller’s payout or deposit" />}
          {kind === 'partial_refund' && <input className={inputCls} inputMode="decimal" placeholder="Amount in ₹" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ''))} />}
          <textarea className={cn(inputCls, 'h-24 py-3')} placeholder="Message to buyer and seller (optional)" value={msg} onChange={(e) => setMsg(e.target.value)} />
        </div>
      </Sheet>
    </Card>
  );
}

function LateOrders({ t }: { t: number }) {
  const s = useSim();
  const toast = useToast();
  const late = s.orders.filter((o) => o.status === 'confirmed' && o.promisedBy < t);
  const byPool = new Map<string, typeof late>();
  for (const o of late) byPool.set(o.poolId, [...(byPool.get(o.poolId) ?? []), o]);
  if (!late.length) return <EmptyState icon={<Truck className="h-6 w-6" />} title="No late orders" body="Orders past their promised date appear here." />;
  return (
    <div className="space-y-4">
      {[...byPool.entries()].map(([pid, os]) => {
        const pool = s.pools.find((p) => p.id === pid)!;
        const product = productOf(s, pool.productId);
        const backup = pool.award?.assignments.find((a) => a.memberId === os[0].memberId)?.backupBidId;
        const backupSeller = backup ? sellerOf(s, pool.bids.find((b) => b.id === backup)!.sellerId) : undefined;
        return (
          <Card key={pid} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3"><ProductArt art={product.art} size={44} /><div><div className="text-[16px] font-bold text-ink">{product.short} · {os.length} late</div><div className="text-[12.5px] text-ink-3">{sellerOf(s, os[0].sellerId).name} promised by {fmtDay(Math.min(...os.map((o) => o.promisedBy)))}</div></div></div>
              <Button icon={<ArrowRightLeft className="h-4 w-4" />} onClick={() => { const r = reassignLateOrders(pid); r.ok ? toast(`${r.value} orders moved to the backup seller`) : toast(r.error, 'err'); }}>Move to backup{backupSeller ? `: ${backupSeller.name}` : ''}</Button>
            </div>
            <div className="mt-3 rounded-[12px] bg-surface-2 p-3 text-[12.5px] text-ink-2">Same buyer price. The difference to the backup seller’s bid is charged to the defaulting seller’s deposit, and each buyer gets the ₹200 late credit.</div>
            <div className="mt-3 divide-y divide-line">
              {os.map((o) => <div key={o.id} className="flex items-center justify-between py-2 text-[13px]"><span className="text-ink"><b>{o.buyerName}</b> · {o.no}</span><span className="text-danger">{Math.ceil((t - o.promisedBy) / 86_400_000)} day(s) late</span></div>)}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- Reconciliation
export function Reconciliation() {
  const s = useSim();
  const t = useNow(15000);
  const toast = useToast();
  const L = useMemo(() => ledger(s, t), [s, t]);
  const inRows: Array<[string, number, string]> = [
    ['Bookings collected', L.collectedBookings, 'Refundable advances from buyers'],
    ['Order payments collected', L.collectedOrders, 'Balances paid now, by EMI or at the door'],
    ['Recovered from sellers', L.recoveredFromSellers, 'Returns refunded first, Wave Drop penalty slabs'],
  ];
  const outRows: Array<[string, number, string, string]> = [
    ['Still held: bookings', L.heldBookings, 'At the payment company until close or decision', 'held'],
    ['Still held: order funds', L.heldOrderFunds, 'Released on each buyer’s code', 'held'],
    ['Still held: installation holds', L.heldHolds, 'Released on job number or after 5 days', 'held'],
    ['Still held: Wave Drop holds', L.heldWave, 'Split at wave close', 'held'],
    ['Refunds in transit', L.refundsInTransit, 'Started, not yet credited', 'held'],
    ['Booking refunds credited', L.refundedBookings, 'Left, walked away, timed out, unserved, no deal', 'out'],
    ['Order refunds', L.refundedOrders, 'Cancellations and returns', 'out'],
    ['Wave Drops paid to buyers', L.waveDropsPaid, 'Slab pots from completed waves', 'out'],
    ['Late credits to buyers', L.lateCredits, 'Paid from the seller’s release', 'out'],
    ['Paid to sellers', L.paidToSellers, 'Net of TCS, TDS and holds', 'out'],
    ['POOL margin (net of GST)', L.poolMarginNet, 'Revenue', 'pool'],
    ['GST on POOL’s margin', L.gstOnCommission, 'Payable to government', 'tax'],
    ['TCS payable (GST, 0.5%)', L.tcsPayable, 'Credited to sellers’ GSTINs', 'tax'],
    ['TDS payable (income tax, 0.1%)', L.tdsPayable, 'Credited to sellers’ PANs', 'tax'],
  ];
  const ok = L.difference === 0;
  return (
    <>
      <PageHead eyebrow="Finance" title="Reconciliation" sub="Every rupee that came in, and exactly where it is now. Computed live from bookings and orders, so it can be audited end to end." right={<Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={() => toast('Ledger exported as CSV (simulated)', 'info')}>Export</Button>} />
      <div className={cn('mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[28px] p-6', ok ? 'bg-save-soft' : 'bg-danger-soft')}>
        <div className="flex items-center gap-4">
          <div className={cn('grid h-14 w-14 place-items-center rounded-[22px] text-white', ok ? 'bg-save' : 'bg-danger')}>{ok ? <CheckCircle2 className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}</div>
          <div><div className="text-[13px] font-semibold text-ink-2">Money in − money accounted for</div><div className="num text-[36px] font-bold tracking-[-0.02em] text-ink">{inr(L.difference, { exact: true })}</div></div>
        </div>
        <div className="grid grid-cols-2 gap-6 text-[13px]">
          <div><div className="text-ink-3">Total in</div><div className="num text-[20px] font-bold text-ink">{inr(L.inflow, { exact: true })}</div></div>
          <div><div className="text-ink-3">Held at payment company</div><div className="num text-[20px] font-bold text-ink">{inr(L.heldAtPA, { exact: true })}</div></div>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[15px] font-bold text-ink"><Wallet className="h-5 w-5 text-brand" />Money in</div>
          <div className="mt-3 divide-y divide-line">{inRows.map(([k, v, h]) => <div key={k} className="flex items-start justify-between gap-3 py-2.5"><div><div className="text-[13.5px] font-semibold text-ink">{k}</div><div className="text-[12px] text-ink-3">{h}</div></div><div className="num text-[14px] font-bold text-ink">{inr(v, { exact: true })}</div></div>)}</div>
          <div className="mt-2 flex justify-between border-t-2 border-ink pt-2.5 text-[15px] font-bold"><span>Total</span><span className="num">{inr(L.inflow, { exact: true })}</span></div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-[15px] font-bold text-ink"><Scale className="h-5 w-5 text-brand" />Where it is now</div>
          <div className="mt-3 divide-y divide-line">{outRows.map(([k, v, h, g]) => <div key={k} className="flex items-start justify-between gap-3 py-2.5"><div className="flex items-start gap-2.5"><span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', g === 'held' ? 'bg-warn' : g === 'out' ? 'bg-save' : g === 'pool' ? 'bg-brand' : 'bg-sim')} /><div><div className="text-[13.5px] font-semibold text-ink">{k}</div><div className="text-[12px] text-ink-3">{h}</div></div></div><div className="num text-[14px] font-bold text-ink">{inr(v, { exact: true })}</div></div>)}</div>
          <div className="mt-2 flex justify-between border-t-2 border-ink pt-2.5 text-[15px] font-bold"><span>Total</span><span className="num">{inr(L.outflow, { exact: true })}</span></div>
        </Card>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[[<ShieldCheck key="a" className="h-5 w-5" />, 'Double-entry, idempotent', 'Each money event has one key. A retried webhook can never pay or refund twice.'], [<RefreshCw key="b" className="h-5 w-5" />, 'Matched to the payment company', 'Daily settlement files are matched line by line; any unmatched line opens an exception.'], [<Clock key="c" className="h-5 w-5" />, 'Taxes on schedule', 'TCS and GST on margin filed monthly; TDS deposited by the 7th. Sellers see their credits in their payouts.']].map(([i, h, b]) => <Card key={h as string} className="p-4"><div className="text-brand">{i}</div><div className="mt-2 text-[14.5px] font-bold text-ink">{h}</div><p className="mt-1 text-[12.5px] text-ink-2">{b}</p></Card>)}
      </div>
      <p className="mt-4 text-[12px] text-ink-3"><SimTag>Simulated ledger</SimTag> Computed from the demo’s sample data with the engine’s rules. Last computed {fmtDayTime(t)}.</p>
    </>
  );
}
