import { AlertTriangle, Camera, Check, CheckCheck, ChevronRight, Delete, Eye, HandCoins, KeyRound, Languages, Lock, MapPin, MessageSquare, Package, Phone, ScanLine, ShieldCheck, Truck, Wrench, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/cn';
import { inr } from '../lib/money';
import { fmtDay, fmtDayTime, fmtTime, fmtWhen } from '../lib/time';
import { productOf, profileOf, qtyLabel, sellerOf, uomOf } from '../sim/engine';
import { confirmAllForPool, replyTicket, sellerSplit, sellerStep, useNow, useSim, verifyHandoverCode, type VerifyError } from '../sim/store';
import type { Order } from '../sim/types';
import { Button, Card, Chip, EmptyState, ErrorState, Field, inputCls, KV, LinkButton, ListSkeleton, Section, Segmented, Sheet, SimTag, Timeline, useToast, type TimelineItem } from '../ui/core';
import { ProductArt } from '../ui/ProductArt';
import { AppBar, BellButton, useLoadState } from '../buyer/parts';

type Tab = 'payment' | 'confirm' | 'dispatch' | 'door' | 'delivered' | 'done' | 'issues' | 'cancelled';
const has = (o: Order, k: string) => o.steps.some((x) => x.key === k);
function stageOf(o: Order): Tab {
  if (o.status === 'awaiting_payment') return 'payment';
  if (o.status === 'confirmed' && !has(o, 'seller_confirmed')) return 'confirm';
  if (o.status === 'confirmed' && !has(o, 'dispatched') && !has(o, 'ready_for_pickup')) return 'dispatch';
  if (o.status === 'confirmed') return 'door';
  if (o.status === 'handed_over') return 'delivered';
  if (o.status === 'settled') return 'done';
  return 'cancelled';
}

// ---------------------------------------------------------------- Orders
export function SellerOrders() {
  const s = useSim();
  const t = useNow(30000);
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const load = useLoadState('seller-orders');
  const me = s.sellerMeId;
  const mine = s.orders.filter((o) => o.sellerId === me);
  const tickets = s.tickets.filter((x) => x.sellerId === me && x.status !== 'resolved');
  const counts: Record<Tab, number> = { payment: 0, confirm: 0, dispatch: 0, door: 0, delivered: 0, done: 0, issues: tickets.length, cancelled: 0 };
  for (const o of mine) counts[stageOf(o)]++;
  const tab = (params.get('tab') as Tab) || (counts.confirm ? 'confirm' : counts.dispatch ? 'dispatch' : 'door');
  const list = tab === 'issues' ? mine.filter((o) => tickets.some((x) => x.orderId === o.id)) : mine.filter((o) => stageOf(o) === tab);
  const byPool = new Map<string, Order[]>();
  for (const o of list.sort((a, b) => a.promisedBy - b.promisedBy)) byPool.set(o.poolId, [...(byPool.get(o.poolId) ?? []), o]);
  const tabs: Array<{ value: Tab; label: string }> = [
    { value: 'confirm', label: 'Confirm' }, { value: 'dispatch', label: 'Dispatch' }, { value: 'door', label: 'At door' }, { value: 'delivered', label: 'Delivered' }, { value: 'issues', label: 'Issues' }, { value: 'done', label: 'Completed' }, { value: 'payment', label: 'Awaiting pay' }, { value: 'cancelled', label: 'Cancelled' },
  ];
  return (
    <div className="pb-6">
      <AppBar title="Orders" right={<BellButton to="/seller/notifications" />} />
      <div className="space-y-4 px-4 pt-3">
        <Segmented value={tab} onChange={(v) => setParams({ tab: v })} options={tabs.map((x) => ({ ...x, count: counts[x.value] }))} />
        {load.state === 'loading' ? <ListSkeleton rows={3} /> : load.state === 'error' ? <ErrorState onRetry={load.retry} /> : list.length === 0 ? <EmptyState icon={<Package className="h-6 w-6" />} title="Nothing here" body={tab === 'confirm' ? 'New orders appear the moment a buyer accepts your offer.' : 'Orders move here as they progress.'} /> : (
          [...byPool.entries()].map(([pid, os]) => {
            const pool = s.pools.find((p) => p.id === pid)!;
            const product = productOf(s, pool.productId);
            return (
              <Section key={pid} title={<span className="flex items-center gap-2"><ProductArt art={product.art} size={28} rounded={8} />{product.short}</span>} sub={`${pool.no} · ${os.length} ${os.length === 1 ? 'order' : 'orders'}`} action={tab === 'confirm' && os.length > 1 ? <Button size="sm" variant="wave" icon={<CheckCheck className="h-4 w-4" />} onClick={() => { const n = confirmAllForPool(pid); toast(`${n} orders confirmed`); }}>Confirm all</Button> : undefined}>
                <div className="divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-surface">
                  {os.map((o) => <OrderRow key={o.id} o={o} t={t} />)}
                </div>
              </Section>
            );
          })
        )}
      </div>
    </div>
  );
}

function OrderRow({ o, t }: { o: Order; t: number }) {
  const s = useSim();
  const uom = uomOf(productOf(s, o.productId).uom);
  const late = o.status === 'confirmed' && t > o.promisedBy;
  const tk = s.tickets.find((x) => x.orderId === o.id && x.status !== 'resolved');
  return (
    <Link to={`/seller/order/${o.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><span className="truncate text-[14px] font-semibold text-ink">{o.buyerName}</span>{o.isMe && <Chip tone="brand">Walkthrough</Chip>}{late && <Chip tone="danger">Late</Chip>}{tk && <Chip tone="warn">Issue</Chip>}{o.balanceDue > 0 && o.status === 'confirmed' && <Chip tone="warn">Pay at door</Chip>}</div>
        <div className="truncate text-[12px] text-ink-3">{o.no} · {qtyLabel(o.qtyBase, uom)} · {o.slot ? o.slot.label : o.address.split(',').slice(-2).join(',').trim()}</div>
      </div>
      <div className="text-right"><div className="num text-[13.5px] font-bold text-ink">{inr(o.sellerTotal)}</div><div className="text-[11px] text-ink-3">by {fmtDay(o.promisedBy)}</div></div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
    </Link>
  );
}

// ---------------------------------------------------------------- Order detail
export function SellerOrder() {
  const { id } = useParams();
  const s = useSim();
  const t = useNow(15000);
  const toast = useToast();
  const nav = useNavigate();
  const [proofFor, setProofFor] = useState<string | null>(null);
  const [job, setJob] = useState('');
  const [reply, setReply] = useState('');
  const o = s.orders.find((x) => x.id === id && x.sellerId === s.sellerMeId);
  if (!o) return <><AppBar back="/seller/orders" title="Order" /><div className="p-4"><EmptyState title="Order not found" body="It may belong to another seller or an earlier demo." /></div></>;
  const pool = s.pools.find((p) => p.id === o.poolId)!;
  const product = productOf(s, o.productId);
  const uom = uomOf(product.uom);
  const prof = profileOf(s, pool.profileId);
  const sp = sellerSplit(s, o);
  const tickets = s.tickets.filter((x) => x.orderId === o.id);
  const pre = prof.steps.filter((x) => !x.afterHandover);
  const post = prof.steps.filter((x) => x.afterHandover);
  const nextPre = pre.find((x) => !has(o, x.key));
  const optText = Object.entries(o.options).map(([k, v]) => product.options?.find((x) => x.key === k)?.values.find((y) => y.id === v)?.label ?? v).join(' · ');
  const doStep = (key: string, proof?: string) => {
    const r = sellerStep(o.id, key, proof);
    r.ok ? toast(key === 'seller_confirmed' ? 'Order confirmed' : key === 'dispatched' ? 'Dispatched · buyer notified' : key === 'ready_for_pickup' ? 'Marked ready · buyer notified' : 'Installation recorded · hold released') : toast(r.error, 'err');
  };
  const items: TimelineItem[] = [
    { title: 'Buyer accepted your offer', sub: `${fmtDayTime(o.createdAt)} · plan: ${o.plan === 'door' ? 'pay at the door' : o.plan === 'emi' ? 'card EMI' : 'paid in advance'}`, state: 'done' },
    ...pre.map((st): TimelineItem => { const d = o.steps.find((x) => x.key === st.key); return { title: st.label, sub: d ? `${fmtDayTime(d.at)}${d.proof && d.proof !== 'Confirmation' ? ` · ${d.proof}` : ''}` : st.proof, state: d ? 'done' : nextPre?.key === st.key && o.status === 'confirmed' ? 'current' : 'todo' }; }),
    { title: 'Buyer’s code verified', sub: o.handedOverAt ? `${fmtDayTime(o.handedOverAt)} · ${inr(sp.releaseOnHandover)} released` : `Promised by ${fmtDayTime(o.promisedBy)}`, state: o.handedOverAt ? 'done' : !nextPre && o.status === 'confirmed' ? 'current' : o.status.startsWith('cancel') ? 'bad' : 'todo' },
    ...post.map((st): TimelineItem => { const d = o.steps.find((x) => x.key === st.key); return { title: st.label, sub: d ? `${fmtDayTime(d.at)} · ${d.proof}` : o.holdDeferredUntil ? `Buyer postponed to ${fmtDay(o.holdDeferredUntil)}` : st.proof, state: d ? 'done' : o.status === 'handed_over' ? 'current' : 'todo' }; }),
  ];
  return (
    <div className="pb-28">
      <AppBar back="/seller/orders" title={o.no} sub={`${product.short} · ${qtyLabel(o.qtyBase, uom)}`} />
      <div className="space-y-5 px-4 pt-3">
        {/* Buyer (visible only after acceptance) */}
        <Card className="p-4">
          <div className="flex items-center justify-between"><div className="eyebrow text-ink-3">Buyer</div><Chip tone="save" icon={<Eye className="h-3 w-3" />}>Shared after acceptance</Chip></div>
          <div className="mt-2 text-[16px] font-bold text-ink">{o.buyerName}</div>
          <div className="mt-1 flex items-start gap-2 text-[13px] text-ink-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />{o.address}</div>
          {optText && <div className="mt-1 text-[13px] text-ink-2">Option: <b>{optText}</b></div>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" icon={<Phone className="h-4 w-4" />} onClick={() => toast('Calling via masked number (simulated)', 'info')}>Call {o.buyerPhoneMasked.slice(-6)}</Button>
            <Button size="sm" variant="outline" icon={<MapPin className="h-4 w-4" />} onClick={() => toast('Opening maps (simulated)', 'info')}>Directions</Button>
          </div>
        </Card>

        {o.balanceDue > 0 && o.status === 'confirmed' && (
          <Card tone="warn" className="flex gap-3 p-4"><HandCoins className="h-5 w-5 shrink-0 text-warn" /><div className="text-[13px] text-ink-2"><b className="text-ink">Buyer pays {inr(o.balanceDue)} at the door, in the POOL app.</b> UPI or card only. Never accept cash; their code unlocks after they pay.</div></Card>
        )}
        {o.backupFromSellerId && <Card tone="brand" className="p-4 text-[13px] text-ink-2">Moved to you as the backup seller from {sellerOf(s, o.backupFromSellerId).name}, at your bid price. Deliver by {fmtDayTime(o.promisedBy)}.</Card>}

        {/* Next action */}
        {o.status === 'confirmed' && nextPre && (
          <Card tone="wave" className="p-4">
            <div className="text-[15px] font-bold text-ink">{nextPre.key === 'seller_confirmed' ? 'Confirm this order' : nextPre.label}</div>
            <p className="mt-1 text-[13px] text-ink-2">{nextPre.key === 'seller_confirmed' ? `Locks the delivery date (${fmtDay(o.promisedBy)}). The buyer is told right away.` : `Proof needed: ${nextPre.proof.toLowerCase()}. The buyer’s code activates for today.`}</p>
            <Button full variant="wave" className="mt-3" icon={nextPre.key === 'seller_confirmed' ? <Check className="h-4 w-4" /> : <Camera className="h-4 w-4" />} onClick={() => (nextPre.proof.startsWith('Confirmation') ? doStep(nextPre.key) : setProofFor(nextPre.key))}>{nextPre.key === 'seller_confirmed' ? 'Confirm order' : nextPre.key === 'dispatched' ? 'Add dispatch photo' : 'Add photo of packed order'}</Button>
          </Card>
        )}
        {o.status === 'confirmed' && !nextPre && (
          <Card tone="wave" className="p-4">
            <div className="flex items-center gap-2 text-[15px] font-bold text-ink"><KeyRound className="h-5 w-5 text-wave" />Collect the buyer’s code</div>
            <p className="mt-1 text-[13px] text-ink-2">The buyer checks the box in their app, then reads out a {o.code.digits}-digit code. Entering it releases {inr(sp.releaseOnHandover)} to you.</p>
            <LinkButton full variant="wave" className="mt-3" to={`/seller/order/${o.id}/verify`} icon={<KeyRound className="h-4 w-4" />}>Enter code</LinkButton>
          </Card>
        )}
        {o.status === 'handed_over' && post.some((x) => !has(o, x.key)) && (
          <Card tone="brand" className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-[15px] font-bold text-ink"><Wrench className="h-5 w-5 text-brand" />Record the installation</div>
            <p className="text-[13px] text-ink-2">{o.holdDeferredUntil ? `The buyer postponed installation to ${fmtDay(o.holdDeferredUntil)}. ` : ''}Adding the brand’s job number releases the {inr(sp.holds.reduce((a, h) => a + h.amount, 0))} installation hold.</p>
            <Field label="Brand installation job number" htmlFor="job"><input id="job" className={inputCls} placeholder="e.g. VST-INS-482913" value={job} onChange={(e) => setJob(e.target.value.toUpperCase())} /></Field>
            <Button full disabled={job.trim().length < 5} onClick={() => { doStep('installed', job.trim()); setJob(''); }}>Save job number</Button>
            {s.tour.active && <button onClick={() => setJob(`${(product.brand ?? 'BR').slice(0, 3).toUpperCase()}-INS-${Math.floor(100000 + Math.random() * 899999)}`)} className="text-[12.5px] font-semibold text-sim">Fill a sample job number <SimTag className="ml-1">Demo</SimTag></button>}
          </Card>
        )}

        {/* Money for this order */}
        <Section title="Your money for this order">
          <Card className="p-4">
            <KV k="Your price × quantity" v={inr(sp.sellerTotal)} strong />
            <KV k="TCS 0.5% · claim as GST credit" v={`−${inr(sp.tcs, { exact: true })}`} tone="muted" />
            <KV k="TDS 0.1% · shows in Form 26AS" v={`−${inr(sp.tds, { exact: true })}`} tone="muted" />
            {sp.holds.map((h) => <KV key={h.key} k={`${h.label} (${h.bps / 100}%)`} hint={o.holdsReleased.some((x) => x.key === h.key) ? 'released' : 'released on the job number'} v={`−${inr(h.amount)}`} tone={o.holdsReleased.some((x) => x.key === h.key) ? 'save' : 'muted'} />)}
            {sp.waveHold > 0 && <KV k="Wave Drop hold" hint="unused part released when the wave closes" v={`−${inr(sp.waveHold)}`} tone="muted" />}
            {o.lateCreditPaise ? <KV k="Late-delivery credit to buyer" v={`−${inr(o.lateCreditPaise)}`} tone="danger" /> : null}
            <div className="my-1.5 h-px bg-line" />
            <KV k={o.handedOverAt ? 'Released on the code' : 'Released when the code is verified'} v={inr(sp.releaseOnHandover - (o.lateCreditPaise ?? 0), { exact: true })} strong />
            <p className="mt-2 text-[11.5px] text-ink-3">Buyer paid {inr(o.buyerTotal)}; the difference is POOL’s fee, set openly per pool. GST invoice to the buyer is issued from your GSTIN at handover.</p>
          </Card>
        </Section>

        {tickets.map((tk) => (
          <Card key={tk.id} className="p-4">
            <div className="flex items-center justify-between"><div className="text-[14px] font-bold text-ink">{tk.no} · {tk.type.replace(/_/g, ' ')}</div><Chip tone={tk.status === 'resolved' ? 'save' : 'warn'}>{tk.status.replace('_', ' ')}</Chip></div>
            {tk.status === 'open' && <div className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-danger"><AlertTriangle className="h-4 w-4" />Reply by {fmtWhen(tk.sellerDueBy, t)} or POOL decides</div>}
            <div className="mt-3 space-y-2">{tk.messages.map((m, i) => <div key={i} className={cn('max-w-[88%] rounded-[14px] px-3 py-2 text-[13px]', m.from === 'seller' ? 'ml-auto bg-wave text-white' : m.from === 'pool' ? 'bg-sim-soft text-ink' : 'bg-surface-3 text-ink')}><div className="mb-0.5 text-[10.5px] font-bold uppercase opacity-70">{m.from} · {fmtTime(m.at)}</div>{m.text}</div>)}</div>
            {tk.photos > 0 && <div className="mt-2 flex gap-2">{Array.from({ length: tk.photos }).map((_, i) => <div key={i} className="grid h-14 w-14 place-items-center rounded-[10px] bg-surface-3 text-ink-3"><Camera className="h-5 w-5" /></div>)}</div>}
            {tk.status !== 'resolved' && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">{['Replacement dispatched today', 'Technician visit tomorrow 10–1', 'Please share a video of the issue'].map((q) => <button key={q} onClick={() => setReply(q)} className="rounded-full border border-line px-2.5 py-1 text-[12px] text-ink-2">{q}</button>)}</div>
                <div className="flex gap-2"><input className={cn(inputCls, 'h-10 text-[14px]')} placeholder="Reply to the buyer" value={reply} onChange={(e) => setReply(e.target.value)} /><Button size="sm" variant="wave" className="h-10" disabled={!reply.trim()} onClick={() => { replyTicket(tk.id, 'seller', reply.trim()); setReply(''); toast('Reply sent'); }}>Send</Button></div>
              </div>
            )}
          </Card>
        ))}

        <Section title="Progress"><Card className="p-4"><Timeline items={items} /></Card></Section>
        <Button variant="ghost" full icon={<MessageSquare className="h-4 w-4" />} onClick={() => nav('/seller/notifications')}>Messages from POOL</Button>
      </div>

      <ProofSheet open={!!proofFor} onClose={() => setProofFor(null)} label={proofFor === 'dispatched' ? 'Dispatch photo' : 'Photo of the packed order'} onDone={(name) => { doStep(proofFor!, name); setProofFor(null); }} />
    </div>
  );
}

function ProofSheet({ open, onClose, label, onDone }: { open: boolean; onClose: () => void; label: string; onDone: (name: string) => void }) {
  const [shot, setShot] = useState(false);
  useEffect(() => { if (open) setShot(false); }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title={label} footer={<Button full variant="wave" disabled={!shot} onClick={() => onDone(`photo_${Date.now().toString(36)}.jpg`)}>Use photo</Button>}>
      <div className="space-y-3">
        <button onClick={() => setShot(true)} className={cn('relative grid h-56 w-full place-items-center overflow-hidden rounded-[18px]', shot ? 'bg-gradient-to-br from-[#c9d4e8] to-[#8fa2c4]' : 'bg-night')}>
          {shot ? <div className="flex flex-col items-center text-night"><Package className="h-16 w-16" /><span className="mt-2 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold">Geo-tagged · {fmtTime(Date.now())}</span></div> : <div className="flex flex-col items-center text-white/70"><Camera className="h-10 w-10" /><span className="mt-2 text-[13px]">Tap to take photo</span></div>}
        </button>
        <p className="text-[12px] text-ink-3">The photo is stamped with time and place and shown to the buyer and POOL if there’s a dispute.</p>
        <SimTag>Camera simulated</SimTag>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- Verify code (keypad)
const ERR_ICON: Record<VerifyError, React.ReactNode> = { NOT_DISPATCHED: <Truck className="h-5 w-5" />, BALANCE_DUE: <HandCoins className="h-5 w-5" />, ALREADY_USED: <CheckCheck className="h-5 w-5" />, EXPIRED: <X className="h-5 w-5" />, LOCKED: <Lock className="h-5 w-5" />, CHECKLIST_INCOMPLETE: <ShieldCheck className="h-5 w-5" />, WRONG_CODE: <AlertTriangle className="h-5 w-5" /> };

export function Verify() {
  const { id } = useParams();
  const s = useSim();
  const [code, setCode] = useState('');
  const [serial, setSerial] = useState('');
  const [err, setErr] = useState<{ code: VerifyError; error: string } | null>(null);
  const [ok, setOk] = useState<number | null>(null);
  const [peek, setPeek] = useState(false);
  const o = s.orders.find((x) => x.id === id && x.sellerId === s.sellerMeId);
  const pool = o ? s.pools.find((p) => p.id === o.poolId) : undefined;
  const prof = pool ? profileOf(s, pool.profileId) : undefined;
  const sp = useMemo(() => (o ? sellerSplit(s, o) : undefined), [s, o]);
  if (!o || !prof || !sp) return <><AppBar back="/seller/orders" title="Verify code" /><div className="p-4"><EmptyState title="Order not found" /></div></>;
  const product = productOf(s, o.productId);
  const needSerial = prof.checklist.some((c) => c.key === 'serial_matches');
  const digits = o.code.digits;
  const press = (k: string) => { setErr(null); if (k === 'del') setCode(code.slice(0, -1)); else if (code.length < digits) setCode(code + k); };
  const submit = () => {
    const r = verifyHandoverCode(o.id, code, needSerial ? serial : undefined);
    if (r.ok) setOk(r.value.release);
    else { setErr({ code: (r as { code: VerifyError }).code ?? 'WRONG_CODE', error: r.error }); if ((r as { code?: VerifyError }).code === 'WRONG_CODE') setCode(''); }
  };
  if (ok !== null) {
    const holds = sp.holds.reduce((a, h) => a + h.amount, 0);
    return (
      <div className="flex min-h-full flex-col items-center px-6 py-10 text-center">
        <div className="pop grid h-20 w-20 place-items-center rounded-full bg-save text-white shadow-[var(--shadow-pop)]"><svg viewBox="0 0 24 24" className="h-11 w-11"><path className="draw" d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
        <div className="mt-5 text-[22px] font-bold text-ink">Code verified. Handed over.</div>
        <div className="num mt-3 text-[40px] font-bold tracking-[-0.02em] text-save">{inr(ok, { exact: true })}</div>
        <div className="text-[13.5px] text-ink-2">released to your bank, settles in 2 working days</div>
        <Card className="mt-6 w-full max-w-[360px] p-4 text-left">
          <KV k="Your total" v={inr(sp.sellerTotal)} />
          <KV k="TCS + TDS (tax credits)" v={`−${inr(sp.tcs + sp.tds, { exact: true })}`} tone="muted" />
          {holds > 0 && <KV k="Installation hold" hint="next: add the job number" v={inr(holds)} tone="muted" />}
          {sp.waveHold > 0 && <KV k="Wave Drop hold" hint="unused part back at wave close" v={inr(sp.waveHold)} tone="muted" />}
          {o.lateCreditPaise ? <KV k="Late credit to buyer" v={`−${inr(o.lateCreditPaise)}`} tone="danger" /> : null}
          <div className="my-1.5 h-px bg-line" />
          <KV k="GST invoice" v={<span className="font-mono text-[12px]">{s.orders.find((x) => x.id === o.id)?.invoiceNo}</span>} />
        </Card>
        <div className="mt-6 grid w-full max-w-[360px] gap-2">
          <LinkButton full variant="wave" to={`/seller/order/${o.id}`}>Back to order</LinkButton>
          <LinkButton full variant="outline" to="/seller/payouts">See payouts</LinkButton>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-full flex-col">
      <AppBar back={`/seller/order/${o.id}`} title="Enter buyer’s code" sub={`${o.no} · ${o.buyerName}`} />
      <div className="flex flex-1 flex-col px-5 pt-4">
        <div className="flex items-center gap-3 rounded-[16px] border border-line bg-surface p-3"><ProductArt art={product.art} size={44} /><div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold text-ink">{product.short}</div><div className="text-[12px] text-ink-3">Releases {inr(sp.releaseOnHandover, { exact: true })} on success</div></div></div>
        <div className="mt-6 flex justify-center gap-2">{Array.from({ length: digits }).map((_, i) => <span key={i} className={cn('num grid h-14 w-11 place-items-center rounded-[12px] border-2 text-[26px] font-bold', code[i] ? 'border-wave bg-wave-soft text-ink' : 'border-line bg-surface text-ink-3', err?.code === 'WRONG_CODE' && 'border-danger')}>{code[i] ?? ''}</span>)}</div>
        <div className="mt-2 text-center text-[12px] text-ink-3">{o.code.maxAttempts - o.code.attempts} tries left · expires {fmtWhen(o.code.expiresAt, Date.now())}</div>
        {needSerial && (
          <div className="mt-4 flex gap-2">
            <input className={cn(inputCls, 'h-11 font-mono text-[14px]')} placeholder="Serial number on the box" value={serial} onChange={(e) => setSerial(e.target.value.toUpperCase())} />
            <Button variant="outline" className="h-11 shrink-0" icon={<ScanLine className="h-4 w-4" />} onClick={() => setSerial(`${product.model ?? 'SN'}-${Math.floor(10000000 + Math.random() * 89999999)}`)}>Scan</Button>
          </div>
        )}
        {err && <div className="mt-4 flex gap-3 rounded-[14px] bg-danger-soft p-3.5 text-[13px] text-ink"><span className="text-danger">{ERR_ICON[err.code]}</span><span>{err.error}</span></div>}
        <div className="mt-auto grid grid-cols-3 gap-2 pb-3 pt-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'peek', '0', 'del'].map((k) => k === 'peek' ? (
            <button key={k} onClick={() => setPeek(true)} className="grid h-14 place-items-center rounded-[14px] text-[11px] font-semibold text-sim" aria-label="Demo: see buyer's code"><Eye className="h-5 w-5" />demo</button>
          ) : (
            <button key={k} onClick={() => press(k)} className="num grid h-14 place-items-center rounded-[14px] bg-surface text-[22px] font-semibold text-ink shadow-[var(--shadow-card)] active:bg-surface-3" aria-label={k === 'del' ? 'Delete' : k}>{k === 'del' ? <Delete className="h-5 w-5" /> : k}</button>
          ))}
        </div>
        <Button full size="lg" variant="wave" disabled={code.length !== digits || (needSerial && serial.length < 5)} onClick={submit} className="mb-4">Verify and hand over</Button>
      </div>
      <Sheet open={peek} onClose={() => setPeek(false)} title="Buyer’s phone (demo only)">
        <div className="space-y-3 text-[13.5px] text-ink-2">
          <p>In real use only the buyer sees this code, after paying any balance and ticking every check. Here it is so you can try the flow without switching apps.</p>
          <div className="num rounded-[14px] bg-surface-3 py-4 text-center text-[30px] font-bold tracking-[0.3em] text-ink">{o.code.value}</div>
          <Button full variant="outline" onClick={() => { setCode(o.code.value); setPeek(false); }}>Type it in</Button>
          <SimTag>Demo helper</SimTag>
        </div>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------- Delivery staff mode: big, simple, bilingual
export function StaffMode() {
  const s = useSim();
  const t = useNow(30000);
  const [te, setTe] = useState(false);
  const toast = useToast();
  const me = sellerOf(s, s.sellerMeId);
  const rider = me.team.find((x) => x.role === 'Delivery')?.name ?? 'Delivery';
  const today = s.orders.filter((o) => o.sellerId === me.id && o.status === 'confirmed' && (has(o, 'dispatched') || has(o, 'ready_for_pickup')));
  const L = (en: string, tel: string) => (te ? tel : en);
  return (
    <div className="min-h-full bg-night pb-8 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/seller" className="grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="Exit staff mode"><X className="h-5 w-5" /></Link>
        <div className="text-center"><div className="text-[15px] font-bold">{rider}</div><div className="text-[11.5px] text-white/50">{me.name}</div></div>
        <button onClick={() => setTe(!te)} className="flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[13px] font-semibold"><Languages className="h-4 w-4" />{te ? 'EN' : 'తెలుగు'}</button>
      </div>
      <div className="px-4">
        <div className="display text-[28px]">{L(`${today.length} deliveries today`, `ఈరోజు ${today.length} డెలివరీలు`)}</div>
        <p className="mt-1 text-[13px] text-white/55">{L('Ask for the code only after the buyer has checked the box. Never take cash.', 'కస్టమర్ బాక్స్ చూసిన తర్వాతే కోడ్ అడగండి. నగదు తీసుకోవద్దు.')}</p>
        <div className="mt-5 space-y-3">
          {today.length === 0 && <div className="rounded-[20px] bg-white/[0.06] p-6 text-center text-white/60">{L('Nothing to deliver right now.', 'ఇప్పుడు డెలివరీలు లేవు.')}</div>}
          {today.map((o, i) => {
            const p = productOf(s, o.productId);
            return (
              <div key={o.id} className="rounded-[22px] bg-white/[0.06] p-4">
                <div className="flex items-center gap-3"><span className="num grid h-9 w-9 place-items-center rounded-full bg-[#7ff0e6] text-[15px] font-bold text-night">{i + 1}</span><div className="min-w-0 flex-1"><div className="truncate text-[16px] font-bold">{o.buyerName}</div><div className="truncate text-[12.5px] text-white/55">{p.short} · {qtyLabel(o.qtyBase, uomOf(p.uom))}</div></div></div>
                <div className="mt-3 flex items-start gap-2 text-[13.5px] text-white/80"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{o.address}</div>
                {o.balanceDue > 0 && <div className="mt-3 rounded-[12px] bg-[#ffb547]/15 px-3 py-2 text-[13px] font-semibold text-[#ffcf85]">{L(`Buyer pays ${inr(o.balanceDue)} in the app first`, `ముందు కస్టమర్ యాప్‌లో ${inr(o.balanceDue)} కట్టాలి`)}</div>}
                <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
                  <button onClick={() => toast('Calling via masked number (simulated)', 'info')} className="grid h-12 w-12 place-items-center rounded-[14px] bg-white/10" aria-label="Call"><Phone className="h-5 w-5" /></button>
                  <Link to={`/seller/order/${o.id}/verify`} className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#7ff0e6] text-[15px] font-bold text-night"><KeyRound className="h-5 w-5" />{L('Enter code', 'కోడ్ ఎంటర్ చేయండి')}</Link>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-[11.5px] text-white/40">{L('Staff see only today’s deliveries: no prices, no payouts.', 'సిబ్బందికి ఈరోజు డెలివరీలు మాత్రమే కనిపిస్తాయి.')} · {fmtDay(t)}</p>
      </div>
    </div>
  );
}
