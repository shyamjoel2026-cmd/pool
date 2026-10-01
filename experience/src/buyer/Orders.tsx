import { AlertTriangle, BadgeCheck, Camera, Check, ChevronRight, Clock, Download, FileText, KeyRound, MapPin, MessageSquare, Package, PackageCheck, Phone, Receipt, RotateCcw, ShieldCheck, Smartphone, Star, Truck, Users, Wallet, Waves, Wrench, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cn } from '../lib/cn';
import { gstSplit } from '../lib/gst';
import { useT } from '../lib/i18n';
import { inr } from '../lib/money';
import { DAY, fmtAgo, fmtDate, fmtDay, fmtDayTime, fmtTime, fmtWhen } from '../lib/time';
import { currentStep, orderStatusText, productOf, profileOf, qtyLabel, sellerOf, uomOf, waveMeter } from '../sim/engine';
import { cancelOrder, deferInstallation, payOrder, raiseTicket, rateOrder, replyTicket, setChecklist, useNow, useSim } from '../sim/store';
import type { Order, Pool, Ticket } from '../sim/types';
import { Button, Card, Chip, Countdown, EmptyState, ErrorState, inputCls, KV, LinkButton, ListSkeleton, Radio, Section, Segmented, Sheet, SimTag, Timeline, useToast, type TimelineItem } from '../ui/core';
import { ProductArt } from '../ui/ProductArt';
import { MoneyRibbon, WaveMeter } from '../ui/visuals';
import { AppBar, BellButton, PaymentSheet, PoolCard, useLoadState } from './parts';

// ---------------------------------------------------------------- My pools
export function MyPools() {
  const s = useSim();
  const t = useNow(30000);
  const tr = useT();
  const load = useLoadState('mypools');
  const mine = s.pools.filter((p) => p.members.some((m) => m.isMe && m.status !== 'pending' && (m.status !== 'left' || p.state === 'open')));
  const decide = mine.filter((p) => p.members.some((m) => m.isMe && m.status === 'offered'));
  const active = mine.filter((p) => !decide.includes(p) && p.members.some((m) => m.isMe && ['committed', 'accepted'].includes(m.status)) && !['completed', 'no_deal'].includes(p.state));
  const past = mine.filter((p) => !decide.includes(p) && !active.includes(p));
  const [tab, setTab] = useState<'decide' | 'active' | 'past'>(decide.length ? 'decide' : 'active');
  const list = tab === 'decide' ? decide : tab === 'active' ? active : past;
  return (
    <div className="pb-6">
      <AppBar title={tr('My pools')} right={<BellButton to="/buyer/notifications" />} />
      <div className="space-y-4 px-4 pt-3">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'decide', label: tr('Decide'), count: decide.length }, { value: 'active', label: tr('Active'), count: active.length }, { value: 'past', label: tr('Past'), count: past.length }]} />
        {load.state === 'loading' ? <ListSkeleton rows={3} /> : load.state === 'error' ? <ErrorState onRetry={load.retry} /> : list.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title={tab === 'decide' ? tr('Nothing to decide right now') : tab === 'active' ? tr('You’re not in any live pool') : tr('No past pools yet')} body={tab === 'decide' ? tr('When a pool you joined closes and prices are set, your personal offer shows up here.') : tr('Paste a product link or browse pools near you. Joining costs a small refundable booking.')} action={<LinkButton to="/buyer/explore" size="sm">{tr('Explore pools')}</LinkButton>} />
        ) : (
          <div className="space-y-3">
            {tab === 'decide' && list.map((p) => <DecideCard key={p.id} p={p} t={t} />)}
            {tab !== 'decide' && list.map((p) => <PoolCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function DecideCard({ p, t }: { p: Pool; t: number }) {
  const s = useSim();
  const tr = useT();
  const product = productOf(s, p.productId);
  const m = p.members.find((x) => x.isMe && x.status === 'offered')!;
  const a = p.award?.assignments.find((x) => x.memberId === m.id);
  const price = a ? p.prices[a.bidId] : undefined;
  return (
    <Link to={`/buyer/offer/${m.id}`} className="block overflow-hidden rounded-[22px] border border-warn/30 bg-surface shadow-[var(--shadow-card)]">
      <div className="flex gap-3 p-3.5">
        <ProductArt art={product.art} size={60} />
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-bold text-ink">{product.short}</div>
          <div className="text-[12.5px] text-ink-3">{qtyLabel(m.qtyBase, uomOf(product.uom))} · {p.areaLabel}</div>
          {price && <div className="num mt-1 text-[17px] font-bold text-ink">{inr(price.buyerPricePaise)}<span className="text-[12px] font-medium text-ink-3"> /{uomOf(product.uom).label}</span></div>}
        </div>
      </div>
      <div className="flex items-center justify-between bg-warn-soft px-3.5 py-2.5 text-[12.5px]">
        <span className="text-ink-2">{tr('Decide by')} {fmtWhen(p.acceptBy!, t)} · <Countdown to={p.acceptBy!} compact className="text-[12.5px]" /></span>
        <span className="font-bold text-ink">{tr('Review')} →</span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------- Orders list
export function Orders() {
  const s = useSim();
  const t = useNow(30000);
  const tr = useT();
  const load = useLoadState('orders');
  const mine = s.orders.filter((o) => o.isMe);
  const active = mine.filter((o) => ['awaiting_payment', 'confirmed', 'handed_over'].includes(o.status));
  const done = mine.filter((o) => !active.includes(o));
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const list = (tab === 'active' ? active : done).sort((a, b) => b.createdAt - a.createdAt);
  return (
    <div className="pb-6">
      <AppBar title={tr('Orders')} right={<BellButton to="/buyer/notifications" />} />
      <div className="space-y-4 px-4 pt-3">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'active', label: tr('In progress'), count: active.length }, { value: 'done', label: tr('Completed & refunded'), count: done.length }]} />
        {load.state === 'loading' ? <ListSkeleton rows={3} /> : load.state === 'error' ? <ErrorState onRetry={load.retry} /> : list.length === 0 ? (
          <EmptyState icon={<Package className="h-6 w-6" />} title={tab === 'active' ? tr('No orders in progress') : tr('Nothing here yet')} body={tr('Orders appear once you accept a personal offer.')} action={<LinkButton to="/buyer/pools" size="sm" variant="outline">{tr('My pools')}</LinkButton>} />
        ) : (
          <div className="space-y-3">{list.map((o) => <OrderCard key={o.id} o={o} t={t} />)}</div>
        )}
        <Link to="/buyer/locker" className="flex items-center gap-3 rounded-[22px] border border-line bg-surface p-4">
          <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-wave-soft text-wave"><ShieldCheck className="h-5 w-5" /></div>
          <div className="flex-1"><div className="text-[14.5px] font-semibold text-ink">{tr('Warranty Locker')}</div><div className="text-[12.5px] text-ink-3">{tr('Invoices, serials and warranty dates for everything you bought')}</div></div>
          <ChevronRight className="h-4 w-4 text-ink-3" />
        </Link>
      </div>
    </div>
  );
}

function OrderCard({ o, t }: { o: Order; t: number }) {
  const s = useSim();
  const tr = useT();
  const product = productOf(s, o.productId);
  const pool = s.pools.find((p) => p.id === o.poolId)!;
  const step = currentStep(o, profileOf(s, pool.profileId));
  const tone = o.status === 'awaiting_payment' || (o.status === 'confirmed' && o.balanceDue > 0 && o.steps.some((x) => x.key === 'dispatched')) ? 'warn' : o.status.startsWith('cancel') || o.status === 'returned' ? 'neutral' : o.status === 'settled' ? 'save' : 'brand';
  return (
    <Link to={`/buyer/order/${o.id}`} className="block rounded-[22px] border border-line bg-surface p-3.5 shadow-[var(--shadow-card)] transition hover:border-line-2">
      <div className="flex gap-3">
        <ProductArt art={product.art} size={60} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><Chip tone={tone} dot>{step.label}</Chip><span className="text-[11.5px] text-ink-3">{o.no}</span></div>
          <div className="mt-1 truncate text-[14.5px] font-semibold text-ink">{product.short}</div>
          <div className="text-[12.5px] text-ink-3">{qtyLabel(o.qtyBase, uomOf(product.uom))} · <span className="num font-semibold text-ink-2">{inr(o.buyerTotal)}</span></div>
          {o.status === 'confirmed' && <div className="mt-1 text-[12px] text-ink-3">{o.slot ? `${tr('Pickup')} · ${o.slot.label}` : `${tr('Arrives by')} ${fmtWhen(o.promisedBy, t)}`}</div>}
          {o.waveRefundPaise ? <div className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-wave"><Waves className="h-3.5 w-3.5" />{tr('Wave Drop')} {inr(o.waveRefundPaise, { exact: true })} {tr('back')}</div> : null}
          {o.refundPaise && (o.status.startsWith('cancel') || o.status === 'returned') ? <div className="mt-1 text-[12px] font-semibold text-save">{tr('Refunded')} {inr(o.refundPaise)}</div> : null}
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------- Order detail: proof timeline, pay at door, checklist → code, holds, wave
export function OrderPage() {
  const { id } = useParams();
  const s = useSim();
  const t = useNow(1000);
  const tr = useT();
  const toast = useToast();
  const load = useLoadState('order' + id);
  const [pay, setPay] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [defer, setDefer] = useState(false);
  const [rate, setRate] = useState(false);
  const [wallet, setWallet] = useState(false);
  const [contact, setContact] = useState(false);
  const o = s.orders.find((x) => x.id === id && x.isMe);
  if (!o) return <><AppBar back="/buyer/orders" title={tr('Order')} /><div className="p-4"><EmptyState title={tr('Order not found')} body={tr('It may be from an earlier demo session.')} action={<LinkButton to="/buyer/orders" size="sm">{tr('All orders')}</LinkButton>} /></div></>;
  const pool = s.pools.find((p) => p.id === o.poolId)!;
  const product = productOf(s, o.productId);
  const uom = uomOf(product.uom);
  const prof = profileOf(s, pool.profileId);
  const seller = sellerOf(s, o.sellerId);
  const step = currentStep(o, prof);
  const done = (k: string) => o.steps.find((x) => x.key === k);
  const preSteps = prof.steps.filter((x) => !x.afterHandover);
  const postSteps = prof.steps.filter((x) => x.afterHandover);
  const allPreDone = preSteps.every((x) => done(x.key));
  const isPickup = prof.modes.includes('store_pickup');
  const isService = prof.modes.includes('service_visit');
  const checklistDone = prof.checklist.every((c) => o.checklist[c.key]);
  const canShowCode = o.status === 'confirmed' && allPreDone && o.balanceDue === 0 && checklistDone && !o.code.usedAt;
  const returnEnds = o.handedOverAt ? o.handedOverAt + prof.returnWindowDays * DAY : undefined;
  const tickets = s.tickets.filter((x) => o.tickets.includes(x.id));
  const costApplies = prof.steps.some((x) => x.returnCostAppliesAfter && done(x.key));
  const cancelCharge = costApplies ? Math.min(prof.returnCostPaise, o.paidPaise) : 0;
  const g = gstSplit(o.buyerTotal, product.gstBps, seller.stateCode !== '36');
  const optText = Object.entries(o.options).map(([k, v]) => product.options?.find((x) => x.key === k)?.values.find((y) => y.id === v)?.label ?? v).join(' · ');
  const late = o.status === 'confirmed' && t > o.promisedBy;

  const items: TimelineItem[] = [
    { title: tr('Offer accepted'), sub: `${fmtDayTime(o.createdAt)} · ${tr('booking {amt} credited', { amt: inr(o.bookingCredit) })}`, state: 'done' },
    { title: o.plan === 'door' ? tr('Pay at the door') : tr('Payment'), sub: o.paidAt ? `${inr(o.paidPaise - o.bookingCredit)} · ${o.payMethod} · ${fmtDayTime(o.paidAt)}` : o.plan === 'door' ? tr('Pay {amt} in the app when it arrives', { amt: inr(o.balanceDue) }) : tr('Waiting for your payment'), state: o.balanceDue === 0 ? 'done' : o.status === 'awaiting_payment' || allPreDone ? 'current' : 'todo' },
    ...preSteps.map((st): TimelineItem => {
      const d = done(st.key);
      return { title: st.key === 'seller_confirmed' ? (isService ? tr('Visit confirmed') : tr('Seller confirmed')) : st.label, sub: d ? `${fmtDayTime(d.at)} · ${d.by}` : st.proof, state: d ? 'done' : o.status === 'confirmed' && preSteps.find((x) => !done(x.key))?.key === st.key ? 'current' : 'todo', proof: d?.proof && d.proof !== 'Confirmation' ? <ProofChip text={d.proof} /> : undefined };
    }),
    { title: isPickup ? tr('Picked up with your code') : isService ? tr('Work done, code given') : tr('Delivered: box checked, code given'), sub: o.handedOverAt ? `${fmtDayTime(o.handedOverAt)}${o.serial ? ` · ${tr('serial')} ${o.serial}` : ''}` : `${tr('Promised by')} ${fmtDayTime(o.promisedBy)}`, state: o.handedOverAt ? 'done' : allPreDone && o.status === 'confirmed' ? 'current' : o.status.startsWith('cancel') ? 'bad' : 'todo' },
    ...postSteps.map((st): TimelineItem => {
      const d = done(st.key);
      return { title: st.label, sub: d ? `${fmtDayTime(d.at)} · ${d.proof}` : o.holdDeferredUntil ? tr('Postponed until {d}', { d: fmtDay(o.holdDeferredUntil) }) : st.proof, state: d ? 'done' : o.status === 'handed_over' ? 'current' : 'todo' };
    }),
    { title: tr('{d}-day replacement window', { d: prof.returnWindowDays }), sub: returnEnds ? (t < returnEnds ? tr('Open until {d}', { d: fmtDayTime(returnEnds) }) : tr('Closed {d}', { d: fmtDay(returnEnds) })) : tr('Starts at handover'), state: o.status === 'settled' ? 'done' : o.status === 'handed_over' ? 'current' : 'todo' },
    { title: tr('Wave Drop'), sub: pool.wave ? tr('{amt} back on {d}', { amt: inr(o.waveRefundPaise ?? 0, { exact: true }), d: fmtDay(pool.wave.closedAt) }) : tr('Paid when every order in this pool is final'), state: pool.wave ? 'done' : 'todo' },
  ];
  if (o.status.startsWith('cancel') || o.status === 'returned') {
    items.splice(items.length - 3, 3, { title: orderStatusText[o.status], sub: `${fmtDayTime((o.cancelledAt ?? o.returnedAt)!)} · ${tr('refund')} ${inr(o.refundPaise ?? 0)} ${tr('to')} ${o.payMethod ?? tr('your original method')}`, state: 'bad' });
  }

  const ribbon = [
    { label: tr('Paid'), sub: o.balanceDue ? tr('booking only') : tr('in full'), amount: o.paidPaise, state: 'done' as const },
    { label: tr('Held'), sub: tr('payment company'), state: (o.status === 'confirmed' || o.status === 'awaiting_payment' ? 'current' : 'done') as 'current' | 'done' },
    { label: tr('Your code'), sub: o.code.usedAt ? fmtDay(o.code.usedAt) : tr('releases seller'), state: (o.code.usedAt ? 'done' : 'todo') as 'done' | 'todo' },
    { label: tr('Wave Drop'), sub: pool.wave ? tr('paid') : tr('after wave'), amount: o.waveRefundPaise || undefined, state: (pool.wave ? 'done' : 'todo') as 'done' | 'todo' },
  ];

  return (
    <div className="pb-10">
      <AppBar back="/buyer/orders" title={product.short} sub={`${o.no} · ${seller.name}`} right={<Link to={`/buyer/order/${o.id}/invoice`} aria-label={tr('Invoice')} className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-surface-3"><Receipt className="h-5 w-5" /></Link>} />
      {load.state === 'loading' ? <div className="p-4"><ListSkeleton rows={3} /></div> : load.state === 'error' ? <div className="p-4"><ErrorState onRetry={load.retry} /></div> : (
        <div className="space-y-5 px-4 pt-3">
          <div className="flex gap-3">
            <ProductArt art={product.art} size={72} rounded={18} />
            <div className="min-w-0 flex-1">
              <Chip tone={o.status === 'settled' ? 'save' : o.status.startsWith('cancel') || o.status === 'returned' ? 'neutral' : late ? 'danger' : 'brand'} dot>{late ? tr('Running late') : step.label}</Chip>
              <div className="mt-1 text-[15.5px] font-bold leading-snug text-ink">{product.title}</div>
              <div className="text-[12.5px] text-ink-3">{qtyLabel(o.qtyBase, uom)}{optText ? ` · ${optText}` : ''} · <span className="num">{inr(o.buyerTotal)}</span></div>
            </div>
          </div>

          {/* Pay to confirm */}
          {o.status === 'awaiting_payment' && (
            <Card tone="warn" className="p-4">
              <div className="text-[15px] font-bold text-ink">{tr('Pay {amt} to confirm', { amt: inr(o.balanceDue) })}</div>
              <p className="mt-1 text-[13px] text-ink-2">{tr('Your price is locked. The seller starts once you pay. The money is held, not paid out, until your code.')}</p>
              <Button full className="mt-3" onClick={() => setPay(true)}>{tr('Pay now')}</Button>
            </Card>
          )}

          {/* Late */}
          {late && (
            <Card tone="warn" className="flex gap-3 p-4">
              <Clock className="h-5 w-5 shrink-0 text-warn" />
              <div className="text-[13px] text-ink-2"><b className="text-ink">{tr('Promised by {d}.', { d: fmtDayTime(o.promisedBy) })}</b> {tr('You’ll get a {amt} credit, paid by the seller. If they can’t deliver, POOL moves your order to the backup seller at the same price.', { amt: inr(prof.lateCreditPaise) })}</div>
            </Card>
          )}
          {o.backupFromSellerId && <Card tone="brand" className="p-4 text-[13px] text-ink-2"><b className="text-ink">{tr('Moved to {s}', { s: seller.name })}</b> · {tr('{old} couldn’t deliver on time. Same price for you; the difference is charged to them. New date: {d}.', { old: sellerOf(s, o.backupFromSellerId).name, d: fmtDay(o.promisedBy) })}</Card>}

          {/* Live tracking */}
          {o.status === 'confirmed' && o.tracking && (
            <LiveTracking o={o} isPickup={isPickup} onContact={() => setContact(true)} />
          )}
          {o.status === 'confirmed' && isPickup && done('ready_for_pickup') && pool.pickup && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[14.5px] font-bold text-ink"><MapPin className="h-4.5 w-4.5 text-brand" />{pool.pickup.place}</div>
              <div className="mt-0.5 text-[12.5px] text-ink-3">{pool.pickup.address}</div>
              <div className="mt-2 text-[13px] text-ink-2">{tr('Your slot')}: <b className="text-ink">{o.slot?.label}</b></div>
            </Card>
          )}

          {/* Handover: pay at door → checklist → code */}
          {o.status === 'confirmed' && allPreDone && (
            <Section title={isPickup ? tr('At the counter') : isService ? tr('When the work is done') : tr('When it arrives')} sub={tr('Three steps. The seller is paid only after the last one.')}>
              <Card className="space-y-4 p-4">
                {/* Step 1: balance */}
                <div className="flex gap-3">
                  <StepDot n={1} done={o.balanceDue === 0} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-semibold text-ink">{o.balanceDue > 0 ? tr('Pay {amt} in the app', { amt: inr(o.balanceDue) }) : tr('Paid in full')}</div>
                    <div className="text-[12.5px] text-ink-3">{o.balanceDue > 0 ? tr('UPI or card, right here. Never hand over cash.') : `${o.payMethod ?? ''}`}</div>
                    {o.balanceDue > 0 && <Button size="sm" className="mt-2" icon={<Smartphone className="h-4 w-4" />} onClick={() => setPay(true)}>{tr('Pay {amt}', { amt: inr(o.balanceDue) })}</Button>}
                  </div>
                </div>
                {/* Step 2: checklist */}
                <div className="flex gap-3">
                  <StepDot n={2} done={checklistDone} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="text-[14.5px] font-semibold text-ink">{isService ? tr('Check the work') : tr('Open the box and check')}</div>
                    {prof.checklist.map((c) => (
                      <label key={c.key} className={cn('flex cursor-pointer items-center gap-3 rounded-[12px] border px-3 py-2.5 text-[13.5px] transition', o.checklist[c.key] ? 'border-save/40 bg-save-soft text-ink' : 'border-line text-ink-2')}>
                        <input type="checkbox" className="h-5 w-5 accent-[var(--save)]" checked={!!o.checklist[c.key]} onChange={(e) => setChecklist(o.id, c.key, e.target.checked)} />
                        <span className="flex-1">{tr(c.label)}{c.key === 'serial_matches' && product.model ? <span className="block text-[11.5px] text-ink-3">{tr('Model')} {product.model}</span> : null}</span>
                      </label>
                    ))}
                    <p className="text-[12px] text-ink-3">{tr('Something wrong? Don’t give the code. Refuse the delivery and report it below; your money stays held.')}</p>
                  </div>
                </div>
                {/* Step 3: code */}
                <div className="flex gap-3">
                  <StepDot n={3} done={!!o.code.usedAt} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-semibold text-ink">{tr('Give your {n}-digit code', { n: o.code.digits })}</div>
                    {canShowCode ? (
                      <HandoverPass o={o} sellerName={seller.name} onWallet={() => setWallet(true)} />
                    ) : (
                      <div className="mt-2 flex items-center gap-3 rounded-[14px] border border-dashed border-line-2 bg-surface-2 p-3.5 text-[12.5px] text-ink-3">
                        <KeyRound className="h-5 w-5 shrink-0" />
                        {o.balanceDue > 0 ? tr('Unlocks after you pay.') : tr('Unlocks after you tick every check.')}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Section>
          )}
          {o.status === 'confirmed' && !allPreDone && (
            <Card className="flex gap-3 p-4">
              <KeyRound className="h-5 w-5 shrink-0 text-ink-3" />
              <div className="text-[13px] text-ink-2">{tr('Your one-time {n}-digit code appears here on the day it’s {what}. POOL will never call or message you for it.', { n: o.code.digits, what: isPickup ? tr('ready for pickup') : isService ? tr('the visit') : tr('out for delivery') })}</div>
            </Card>
          )}

          {/* After handover: installation + holds */}
          {o.status === 'handed_over' && postSteps.length > 0 && !postSteps.every((x) => done(x.key)) && (
            <Card tone="brand" className="p-4">
              <div className="flex items-center gap-2 text-[14.5px] font-bold text-ink"><Wrench className="h-5 w-5 text-brand" />{tr('Installation')}</div>
              <p className="mt-1 text-[13px] text-ink-2">{o.holdDeferredUntil ? tr('Postponed until {d}. 10% of the seller’s payment stays held until then.', { d: fmtDay(o.holdDeferredUntil) }) : tr('The brand team will call to fix a time. 10% of the seller’s payment stays held until the job number is recorded.')}</p>
              {!o.holdDeferredUntil && <Button size="sm" variant="outline" className="mt-3" onClick={() => setDefer(true)}>{tr('Flat not ready? Postpone')}</Button>}
            </Card>
          )}
          {o.status === 'handed_over' && returnEnds && t < returnEnds && (
            <Card className="flex items-center gap-3 p-4">
              <RotateCcw className="h-5 w-5 shrink-0 text-ink-3" />
              <div className="flex-1 text-[13px] text-ink-2">{tr('Replacement window open for')} <Countdown to={returnEnds} compact className="text-[13px]" /></div>
              <LinkButton size="sm" variant="outline" to={`/buyer/order/${o.id}/issue`}>{tr('Report')}</LinkButton>
            </Card>
          )}

          {/* Wave Drop */}
          {(o.status === 'handed_over' || o.status === 'settled' || o.status === 'confirmed') && <OrderWave o={o} pool={pool} />}

          {/* Rating */}
          {(o.status === 'settled' || o.status === 'handed_over') && (
            o.rating ? (
              <Card className="p-4">
                <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn('h-4 w-4', n <= o.rating!.stars ? 'fill-warn text-warn' : 'text-line-2')} />)}<span className="ml-2 text-[12px] text-ink-3">{tr('Your rating')} · {fmtDay(o.rating.at)}</span></div>
                {o.rating.text && <p className="mt-1.5 text-[13.5px] text-ink-2">“{o.rating.text}”</p>}
              </Card>
            ) : (
              <Card className="flex items-center gap-3 p-4">
                <Star className="h-5 w-5 text-warn" />
                <div className="flex-1 text-[13.5px] text-ink-2">{tr('Rate {s}. Only completed buyers can.', { s: seller.name })}</div>
                <Button size="sm" onClick={() => setRate(true)}>{tr('Rate')}</Button>
              </Card>
            )
          )}

          {/* Tickets */}
          {tickets.length > 0 && <Section title={tr('Issues')}>{tickets.map((tk) => <TicketCard key={tk.id} tk={tk} />)}</Section>}

          <Section title={tr('Progress')}>
            <Card className="p-4"><Timeline items={items} /></Card>
          </Section>

          <Section title={tr('Where your money is')}>
            <Card className="space-y-4 p-4">
              <MoneyRibbon steps={ribbon} />
              <div className="divide-y divide-line">
                <div className="pb-2">
                  <KV k={tr('Price, all-in')} hint={`${inr(o.buyerPricePaise)} × ${qtyLabel(o.qtyBase, uom)}`} v={inr(o.buyerTotal)} strong />
                </div>
                <div className="py-2">
                  <KV k={tr('Taxable value')} v={inr(g.taxable, { exact: true })} />
                  {g.igst ? <KV k={`IGST ${product.gstBps / 100}%`} v={inr(g.igst, { exact: true })} /> : product.gstBps ? <><KV k={`CGST ${product.gstBps / 200}%`} v={inr(g.cgst, { exact: true })} /><KV k={`SGST ${product.gstBps / 200}%`} v={inr(g.sgst, { exact: true })} /></> : <KV k="GST" v="₹0.00" hint={tr('Nil-rated')} />}
                </div>
                <div className="pt-2">
                  <KV k={tr('Booking credited')} v={inr(o.bookingCredit)} />
                  <KV k={tr('Paid')} v={inr(o.paidPaise)} />
                  {o.balanceDue > 0 && <KV k={o.plan === 'door' ? tr('Due at the door') : tr('Due now')} v={inr(o.balanceDue)} tone="danger" />}
                  {o.lateCreditPaise ? <KV k={tr('Late-delivery credit')} v={`+${inr(o.lateCreditPaise)}`} tone="save" /> : null}
                  {o.waveRefundPaise ? <KV k={tr('Wave Drop')} v={`+${inr(o.waveRefundPaise, { exact: true })}`} tone="wave" /> : null}
                  {o.refundPaise ? <KV k={tr('Refunded')} v={`+${inr(o.refundPaise)}`} tone="save" /> : null}
                  {(o.waveRefundPaise || o.lateCreditPaise) && !o.refundPaise ? <KV k={tr('Your final cost')} v={inr(o.buyerTotal - (o.waveRefundPaise ?? 0) - (o.lateCreditPaise ?? 0), { exact: true })} strong /> : null}
                </div>
              </div>
            </Card>
          </Section>

          <Section title={tr('Details')}>
            <Card className="divide-y divide-line">
              <Row2 icon={<MapPin className="h-4.5 w-4.5" />} k={o.slot ? tr('Pickup') : tr('Deliver to')} v={o.address} />
              <Row2 icon={<BadgeCheck className="h-4.5 w-4.5" />} k={tr('Seller')} v={<Link to={`/buyer/seller/${seller.id}`} className="font-semibold text-brand">{seller.name}</Link>} />
              {o.invoiceNo && <Row2 icon={<FileText className="h-4.5 w-4.5" />} k={tr('GST invoice')} v={<Link to={`/buyer/order/${o.id}/invoice`} className="font-semibold text-brand">{o.invoiceNo}</Link>} />}
              {o.serial && <Row2 icon={<PackageCheck className="h-4.5 w-4.5" />} k={tr('Serial')} v={<span className="font-mono">{o.serial}</span>} />}
              {o.installJob && <Row2 icon={<Wrench className="h-4.5 w-4.5" />} k={tr('Installation job')} v={<span className="font-mono">{o.installJob}</span>} />}
              <Row2 icon={<Users className="h-4.5 w-4.5" />} k={tr('Pool')} v={<Link to={`/buyer/pool/${pool.id}`} className="font-semibold text-brand">{pool.no}</Link>} />
            </Card>
          </Section>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            {(o.status === 'confirmed' || o.status === 'awaiting_payment') && <Button variant="outline" icon={<X className="h-4 w-4" />} onClick={() => setCancel(true)}>{tr('Cancel order')}</Button>}
            {['confirmed', 'handed_over', 'settled'].includes(o.status) && <LinkButton variant="outline" to={`/buyer/order/${o.id}/issue`} icon={<AlertTriangle className="h-4 w-4" />}>{tr('Report a problem')}</LinkButton>}
            <LinkButton variant="ghost" to="/buyer/help/chat" icon={<MessageSquare className="h-4 w-4" />}>{tr('Chat with POOL')}</LinkButton>
            {o.invoiceNo && <LinkButton variant="ghost" to={`/buyer/order/${o.id}/invoice`} icon={<Download className="h-4 w-4" />}>{tr('Invoice')}</LinkButton>}
          </div>
        </div>
      )}

      <PaymentSheet open={pay} onClose={() => setPay(false)} amount={o.balanceDue} purpose={`${product.short} · ${o.no}${o.plan === 'door' ? ' · at the door' : ''}`} allowEmi={o.plan === 'emi'} onPay={(m) => payOrder(o.id, m)} successText={o.plan === 'door' ? tr('Paid. Now check the box; your code unlocks when every check is ticked.') : tr('Paid. The payment company holds it until you give your handover code.')} onSuccess={() => { setPay(false); toast(tr('Payment confirmed')); }} />

      <Sheet open={cancel} onClose={() => setCancel(false)} title={tr('Cancel this order?')} footer={<div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setCancel(false)}>{tr('Keep order')}</Button><Button variant="danger" onClick={() => { const r = cancelOrder(o.id); setCancel(false); r.ok ? toast(tr('Cancelled · {amt} refund started', { amt: inr(r.value) })) : toast(r.error, 'err'); }}>{tr('Cancel order')}</Button></div>}>
        <div className="space-y-3 text-[13.5px] text-ink-2">
          <KV k={tr('You paid')} v={inr(o.paidPaise)} />
          {cancelCharge > 0 && <KV k={tr('Return cost (it’s already dispatched)')} v={`−${inr(cancelCharge)}`} tone="danger" hint={tr('This was shown on your offer before you accepted.')} />}
          <KV k={tr('Refund to {m}', { m: o.payMethod ?? 'UPI' })} v={inr(o.paidPaise - cancelCharge)} strong />
          <p className="text-[12.5px] text-ink-3">{tr('Cancelling takes this order out of the Wave Drop.')}</p>
        </div>
      </Sheet>

      <Sheet open={defer} onClose={() => setDefer(false)} title={tr('Postpone installation')}>
        <p className="text-[13.5px] text-ink-2">{tr('Moving into a new flat? Keep the unit boxed and install later. The 10% installation hold waits with you, up to 45 days after delivery.')}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[7, 15, 30].map((d) => <Button key={d} variant="outline" onClick={() => { const r = deferInstallation(o.id, (o.handedOverAt ?? t) + d * DAY); setDefer(false); r.ok ? toast(tr('Installation postponed to {d}', { d: fmtDay((o.handedOverAt ?? t) + d * DAY) })) : toast(r.error, 'err'); }}>{d} {tr('days')}</Button>)}
        </div>
      </Sheet>

      <RateSheet open={rate} onClose={() => setRate(false)} orderId={o.id} sellerName={seller.name} />

      <Sheet open={wallet} onClose={() => setWallet(false)} title={tr('Added to your wallet')}>
        <div className="space-y-3 text-[13.5px] text-ink-2">
          <p>{tr('Your handover pass is on your lock screen for delivery day. The code shows only after you unlock your phone, so a glance can’t leak it.')}</p>
          <SimTag>{tr('Wallet pass simulated')}</SimTag>
        </div>
      </Sheet>

      <Sheet open={contact} onClose={() => setContact(false)} title={tr('Contact the delivery person')}>
        <div className="space-y-3">
          <Button full variant="outline" icon={<Phone className="h-4 w-4" />} onClick={() => { setContact(false); toast(tr('Calling through a masked number (simulated)'), 'info'); }}>{tr('Call via masked number')}</Button>
          <p className="text-[12.5px] text-ink-3">{tr('Neither of you sees the other’s real number. Calls are recorded for 7 days to settle disputes.')}</p>
        </div>
      </Sheet>
    </div>
  );
}

function Row2({ icon, k, v }: { icon: React.ReactNode; k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-4 py-3">
      <span className="mt-0.5 text-ink-3">{icon}</span>
      <div className="min-w-0 flex-1"><div className="text-[12px] text-ink-3">{k}</div><div className="text-[13.5px] text-ink">{v}</div></div>
    </div>
  );
}

function StepDot({ n, done }: { n: number; done: boolean }) {
  return <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold', done ? 'bg-save text-white' : 'bg-surface-3 text-ink-2')}>{done ? <Check className="h-4 w-4" strokeWidth={3} /> : n}</span>;
}

function ProofChip({ text }: { text: string }) {
  const photo = /\.(jpg|jpeg|png)$/i.test(text) || text.toLowerCase().includes('photo');
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-line bg-surface-2 px-2 py-1 text-[11.5px] font-medium text-ink-2">
      {photo ? <Camera className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
      {photo ? 'Photo proof' : text}
    </span>
  );
}

/** Lock-screen style live tracking: rider, ETA, events. */
function LiveTracking({ o, isPickup, onContact }: { o: Order; isPickup: boolean; onContact: () => void }) {
  const tr = useT();
  const t = useNow(15000);
  const tk = o.tracking!;
  const ev = [...tk.events].reverse();
  return (
    <div className="overflow-hidden rounded-[28px] bg-night text-white shadow-[var(--shadow-pop)]">
      <div className="flex items-center justify-between px-4 pt-3.5">
        <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-white/55"><span className="h-2 w-2 animate-pulse rounded-full bg-aqua" />{tr('Live')}</div>
        <SimTag className="border-white/25 bg-white/10 text-white">{tr('Tracking simulated')}</SimTag>
      </div>
      <div className="px-4 pb-3 pt-2">
        <div className="text-[22px] font-bold leading-tight">{isPickup ? tr('Ready at the counter') : `${tr('Arriving')} ${tk.etaText}`}</div>
        <div className="mt-0.5 text-[12.5px] text-white/60">{tk.partner} · {tk.awb}</div>
        <div className="relative mt-4 h-2 rounded-full bg-white/10">
          <div className="absolute inset-y-0 left-0 w-[68%] rounded-full bg-gradient-to-r from-aqua to-[#8aa4ff]" />
          <Truck className="absolute -top-2.5 h-6 w-6 text-white" style={{ left: 'calc(68% - 12px)' }} />
        </div>
        <div className="mt-2 flex justify-between text-[10.5px] text-white/45"><span>{tr('Packed')}</span><span>{tr('On the way')}</span><span>{tr('At your door')}</span></div>
      </div>
      <div className="space-y-2 border-t border-white/10 px-4 py-3">
        {ev.slice(0, 3).map((e, i) => <div key={i} className="flex justify-between gap-3 text-[12.5px]"><span className={i === 0 ? 'text-white' : 'text-white/55'}>{e.text}</span><span className="shrink-0 text-white/45">{fmtAgo(e.at, t)}</span></div>)}
      </div>
      {tk.rider && (
        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[13px] font-bold">{tk.rider.split(' ').map((x) => x[0]).join('').slice(0, 2)}</div>
          <div className="flex-1 text-[13px]"><div className="font-semibold">{tk.rider}</div><div className="text-[11.5px] text-white/55">{tr('Will ask for your code only after you’ve checked the box')}</div></div>
          <button onClick={onContact} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label={tr('Call')}><Phone className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}

/** The code as a wallet-style pass: big digits, single use, expiry, attempts. */
function HandoverPass({ o, sellerName, onWallet }: { o: Order; sellerName: string; onWallet: () => void }) {
  const tr = useT();
  const t = useNow(1000);
  const [shown, setShown] = useState(false);
  const digits = o.code.value.split('');
  return (
    <div className="mt-2 overflow-hidden rounded-[22px] border border-brand/25 bg-gradient-to-br from-brand-soft to-wave-soft">
      <div className="flex items-center justify-between px-4 pt-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink">
        <span>{tr('Handover pass')} · {o.no}</span>
        <span>{tr('Single use')}</span>
      </div>
      <button onClick={() => setShown(!shown)} className="flex w-full justify-center gap-1.5 px-4 py-4" aria-label={shown ? tr('Hide code') : tr('Show code')}>
        {digits.map((d, i) => (
          <span key={i} className="num grid h-14 w-11 place-items-center rounded-[12px] bg-surface text-[28px] font-bold text-ink shadow-sm">{shown ? d : '•'}</span>
        ))}
      </button>
      <div className="px-4 pb-1 text-center text-[12px] text-ink-2">{shown ? tr('Say it to {s}’s delivery person, or let them read it.', { s: sellerName }) : tr('Tap to reveal')}</div>
      <div className="mt-2 flex items-center justify-between border-t border-dashed border-brand/25 px-4 py-2.5 text-[11.5px] text-ink-3">
        <span>{tr('Expires')} {fmtWhen(o.code.expiresAt, t)}</span>
        <span>{o.code.maxAttempts - o.code.attempts} {tr('tries left')}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        <Button size="sm" variant="dark" icon={<Wallet className="h-4 w-4" />} onClick={onWallet}>{tr('Add to wallet')}</Button>
        <Button size="sm" variant="outline" onClick={() => setShown(!shown)}>{shown ? tr('Hide') : tr('Show')}</Button>
      </div>
      <div className="flex items-center gap-1.5 bg-surface/70 px-4 py-2 text-[11.5px] font-medium text-ink-2"><ShieldCheck className="h-3.5 w-3.5 text-save" />{tr('POOL will never ask for this code by call, SMS or WhatsApp.')}</div>
    </div>
  );
}

function OrderWave({ o, pool }: { o: Order; pool: Pool }) {
  const s = useSim();
  const tr = useT();
  if (pool.wave) {
    const share = pool.wave.perOrder[o.id];
    if (share === undefined) return null;
    return <WaveMeter level={1} title={tr('Wave Drop · paid to you')} value={inr(share, { exact: true })} caption={tr('{n} completed purchases filled a {pot} pot, split equally. Sent to your original payment method.', { n: pool.wave.settledUnits, pot: inr(pool.wave.potPaise) })} />;
  }
  const wm = waveMeter(s, pool, o.bidId);
  if (!wm || !wm.bid.slabs.length) return null;
  return (
    <WaveMeter level={Math.min(1, wm.liveUnits / Math.max(10, (wm.nextSlab?.fromUnit ?? wm.liveUnits) + 4))} title={tr('Wave Drop · building')} value={`≈ ${inr(wm.perBuyerIfAllSettle)}`} caption={tr('{n} live orders with this seller. If all complete, each buyer gets about this back. Cancellations and returns don’t count.', { n: wm.liveUnits })} />
  );
}

function TicketCard({ tk }: { tk: Ticket }) {
  const tr = useT();
  const t = useNow(30000);
  const [msg, setMsg] = useState('');
  const toast = useToast();
  const st = { open: tr('Waiting for seller'), seller_replied: tr('Seller replied'), pool_reviewing: tr('POOL is reviewing'), resolved: tr('Resolved') }[tk.status];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[14px] font-bold text-ink">{tk.no} · {tk.type.replace(/_/g, ' ')}</div>
        <Chip tone={tk.status === 'resolved' ? 'save' : 'warn'} dot>{st}</Chip>
      </div>
      {tk.status === 'open' && <div className="mt-1 text-[12px] text-ink-3">{tr('Seller must reply by')} {fmtWhen(tk.sellerDueBy, t)} · {tr('POOL steps in after that')}</div>}
      <div className="mt-3 space-y-2">
        {tk.messages.map((m, i) => (
          <div key={i} className={cn('max-w-[88%] rounded-[14px] px-3 py-2 text-[13px]', m.from === 'buyer' ? 'ml-auto bg-brand text-on-brand' : m.from === 'pool' ? 'bg-sim-soft text-ink' : 'bg-surface-3 text-ink')}>
            <div className="mb-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] opacity-70">{m.from === 'buyer' ? tr('You') : m.from === 'pool' ? 'POOL' : tr('Seller')} · {fmtTime(m.at)}</div>
            {m.text}
          </div>
        ))}
      </div>
      {tk.resolution && <div className="mt-3 rounded-[12px] bg-save-soft p-2.5 text-[12.5px] text-ink-2"><b className="text-ink">{tr('Outcome')}:</b> {tk.resolution.kind.replace('_', ' ')}{tk.resolution.amountPaise ? ` · ${inr(tk.resolution.amountPaise)}` : ''}</div>}
      {tk.status !== 'resolved' && (
        <div className="mt-3 flex gap-2">
          <input className={cn(inputCls, 'h-10 text-[14px]')} placeholder={tr('Add a message')} value={msg} onChange={(e) => setMsg(e.target.value)} />
          <Button size="sm" className="h-10" disabled={!msg.trim()} onClick={() => { replyTicket(tk.id, 'buyer', msg.trim()); setMsg(''); toast(tr('Sent')); }}>{tr('Send')}</Button>
        </div>
      )}
    </Card>
  );
}

function RateSheet({ open, onClose, orderId, sellerName }: { open: boolean; onClose: () => void; orderId: string; sellerName: string }) {
  const tr = useT();
  const toast = useToast();
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState(0);
  return (
    <Sheet open={open} onClose={onClose} title={tr('Rate {s}', { s: sellerName })} footer={<Button full disabled={!stars} onClick={() => { const r = rateOrder(orderId, stars, text, photos); onClose(); r.ok ? toast(tr('Thanks. Your rating is public and verified.')) : toast(r.error, 'err'); }}>{tr('Post rating')}</Button>}>
      <div className="space-y-4">
        <div className="flex justify-center gap-2">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setStars(n)} aria-label={`${n} stars`}><Star className={cn('h-9 w-9 transition', n <= stars ? 'fill-warn text-warn' : 'text-line-2')} /></button>)}</div>
        <textarea className={cn(inputCls, 'h-24 py-3')} placeholder={tr('Delivery, installation, packaging… (optional)')} value={text} onChange={(e) => setText(e.target.value)} />
        <Button variant="outline" size="sm" icon={<Camera className="h-4 w-4" />} onClick={() => setPhotos(photos + 1)}>{photos ? tr('{n} photos added', { n: photos }) : tr('Add photos')}</Button>
        <p className="text-[12px] text-ink-3">{tr('Ratings are tied to completed orders, so they can’t be bought or faked.')}</p>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------- Report a problem
const ISSUE_TYPES: Array<{ id: Ticket['type']; label: string; sub: string }> = [
  { id: 'damaged', label: 'Damaged or not working', sub: 'Dents, cracks, dead on arrival' },
  { id: 'wrong_item', label: 'Wrong item or model', sub: 'Different model, colour or size' },
  { id: 'missing_parts', label: 'Missing parts', sub: 'Remote, stand, accessories' },
  { id: 'not_as_described', label: 'Not as described', sub: 'Specs don’t match the offer' },
  { id: 'installation', label: 'Installation problem', sub: 'Not installed or done badly' },
  { id: 'late', label: 'Late delivery', sub: 'Past the promised date' },
  { id: 'other', label: 'Something else', sub: '' },
];

export function IssueFlow() {
  const { id } = useParams();
  const s = useSim();
  const tr = useT();
  const nav = useNavigate();
  const toast = useToast();
  const [type, setType] = useState<Ticket['type'] | null>(null);
  const [wants, setWants] = useState<Ticket['wants']>('replacement');
  const [desc, setDesc] = useState('');
  const [photos, setPhotos] = useState(0);
  const [err, setErr] = useState('');
  const o = s.orders.find((x) => x.id === id && x.isMe);
  if (!o) return <><AppBar back="/buyer/orders" title={tr('Report a problem')} /><div className="p-4"><EmptyState title={tr('Order not found')} /></div></>;
  const product = productOf(s, o.productId);
  const seller = sellerOf(s, o.sellerId);
  const needsPhoto = type === 'damaged' || type === 'wrong_item' || type === 'missing_parts';
  const submit = () => {
    setErr('');
    if (!type) return setErr(tr('Choose what went wrong.'));
    if (desc.trim().length < 10) return setErr(tr('Describe the problem in a sentence or two.'));
    if (needsPhoto && photos === 0) return setErr(tr('Add at least one photo. It settles most cases in hours, not days.'));
    const r = raiseTicket(o.id, { type, description: desc.trim(), wants, photos });
    if (!r.ok) return setErr(r.error);
    toast(tr('Issue reported. {s} must reply within 24 hours.', { s: seller.name }));
    nav(`/buyer/order/${o.id}`);
  };
  return (
    <div className="pb-28">
      <AppBar back={`/buyer/order/${o.id}`} title={tr('Report a problem')} sub={`${product.short} · ${o.no}`} />
      <div className="space-y-6 px-4 pt-3">
        <Card tone="save" className="flex gap-3 p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-save" />
          <p className="text-[13px] text-ink-2">{o.code.usedAt ? tr('The seller must reply within 24 hours. If they don’t, or you disagree, POOL decides within 48 hours. If you’re owed money, POOL refunds you first and recovers it from the seller.') : tr('You haven’t given your code, so your money is still held. The seller isn’t paid while this is open.')}</p>
        </Card>
        <Section title={`1. ${tr('What went wrong?')}`}>
          <div className="space-y-2">{ISSUE_TYPES.map((it) => <Radio key={it.id} id={`it-${it.id}`} checked={type === it.id} onSelect={() => setType(it.id)} title={tr(it.label)} sub={it.sub ? tr(it.sub) : undefined} />)}</div>
        </Section>
        <Section title={`2. ${tr('Tell us more')}`}>
          <textarea className={cn(inputCls, 'h-28 py-3')} placeholder={tr('What you see, when it started…')} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<Camera className="h-4 w-4" />} onClick={() => setPhotos(photos + 1)}>{tr('Add photo or video')}</Button>
            {photos > 0 && <span className="text-[13px] font-semibold text-save">{tr('{n} added', { n: photos })}</span>}
            <SimTag>{tr('Camera simulated')}</SimTag>
          </div>
        </Section>
        <Section title={`3. ${tr('What would fix it?')}`}>
          <div className="grid grid-cols-3 gap-2">
            {(['replacement', 'repair', 'refund'] as const).map((w) => <button key={w} onClick={() => setWants(w)} className={cn('rounded-[12px] border px-2 py-2.5 text-[13.5px] font-semibold capitalize', wants === w ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-ink-2')}>{tr(w.charAt(0).toUpperCase() + w.slice(1))}</button>)}
          </div>
          <p className="text-[12px] text-ink-3">{tr('Refunds go back to {m}. POOL never keeps your money as a wallet balance.', { m: o.payMethod ?? tr('your original payment method') })}</p>
        </Section>
        {err && <p className="rounded-[12px] bg-danger-soft p-3 text-[13px] font-medium text-danger">{err}</p>}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 liquid-glass rounded-t-[28px] px-4 pb-3 pt-3.5" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <Button full size="lg" onClick={submit}>{tr('Submit')}</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- GST invoice preview
export function InvoicePage() {
  const { id } = useParams();
  const s = useSim();
  const tr = useT();
  const toast = useToast();
  const o = s.orders.find((x) => x.id === id && x.isMe);
  if (!o) return <><AppBar back="/buyer/orders" title={tr('Invoice')} /><div className="p-4"><EmptyState title={tr('Order not found')} /></div></>;
  const product = productOf(s, o.productId);
  const seller = sellerOf(s, o.sellerId);
  const uom = uomOf(product.uom);
  const inter = seller.stateCode !== '36';
  const g = gstSplit(o.buyerTotal, product.gstBps, inter);
  const issued = !!o.invoiceNo;
  return (
    <div className="pb-10">
      <AppBar back={`/buyer/order/${o.id}`} title={tr('Tax invoice')} sub={o.invoiceNo ?? tr('Issued at handover')} right={issued ? <button aria-label={tr('Download PDF')} onClick={() => toast(tr('PDF saved to Downloads (simulated)'), 'info')} className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-surface-3"><Download className="h-5 w-5" /></button> : undefined} />
      <div className="space-y-4 px-4 pt-3">
        {!issued && <Card tone="brand" className="p-4 text-[13px] text-ink-2">{tr('The seller issues the GST invoice in your name when you give your handover code. This is a preview.')}</Card>}
        <div className="rounded-[22px] border border-line bg-white p-4 text-[12px] leading-relaxed text-[#1b1f2b] shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-3 border-b border-[#e4e7ef] pb-3">
            <div>
              <div className="text-[15px] font-bold">{seller.name}</div>
              <div>{seller.area}, {seller.city}, {seller.state}</div>
              <div className="font-mono">GSTIN {seller.gstin}</div>
            </div>
            <div className="text-right">
              <div className="text-[13px] font-bold">{tr('TAX INVOICE')}</div>
              <div className="font-mono">{o.invoiceNo ?? 'INV/…/26-27/—'}</div>
              <div>{fmtDate(o.handedOverAt ?? o.createdAt)}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 border-b border-[#e4e7ef] py-3">
            <div><div className="font-semibold text-[#5a6072]">{tr('Bill to')}</div><div>{s.me.name}</div><div>{o.address}</div></div>
            <div><div className="font-semibold text-[#5a6072]">{tr('Place of supply')}</div><div>Telangana (36)</div><div className="mt-1 font-semibold text-[#5a6072]">{tr('Order')}</div><div className="font-mono">{o.no}</div></div>
          </div>
          <table className="mt-3 w-full">
            <thead><tr className="text-left text-[#5a6072]"><th className="pb-1 font-semibold">{tr('Item')}</th><th className="pb-1 font-semibold">HSN</th><th className="pb-1 pl-2 text-right font-semibold">{tr('Qty')}</th><th className="pb-1 pl-3 text-right font-semibold">{tr('Taxable')}</th></tr></thead>
            <tbody><tr className="align-top"><td className="py-1 pr-2">{product.title}{o.serial ? <div className="font-mono text-[11px] text-[#5a6072]">S/N {o.serial}</div> : null}</td><td className="py-1 font-mono">{product.hsn}</td><td className="whitespace-nowrap py-1 pl-2 text-right">{qtyLabel(o.qtyBase, uom)}</td><td className="num whitespace-nowrap py-1 pl-3 text-right">{inr(g.taxable, { exact: true })}</td></tr></tbody>
          </table>
          <div className="mt-3 space-y-1 border-t border-[#e4e7ef] pt-2">
            {inter ? <Line k={`IGST @ ${product.gstBps / 100}%`} v={inr(g.igst, { exact: true })} /> : product.gstBps ? <><Line k={`CGST @ ${product.gstBps / 200}%`} v={inr(g.cgst, { exact: true })} /><Line k={`SGST @ ${product.gstBps / 200}%`} v={inr(g.sgst, { exact: true })} /></> : <Line k="GST" v={tr('Nil-rated')} />}
            <div className="flex justify-between border-t border-[#e4e7ef] pt-1.5 text-[14px] font-bold"><span>{tr('Total')}</span><span className="num">{inr(o.buyerTotal, { exact: true })}</span></div>
          </div>
          <div className="mt-3 border-t border-[#e4e7ef] pt-2 text-[11px] text-[#5a6072]">{tr('Sold by {s} through POOL (electronic commerce operator). TCS under section 52 of the CGST Act is collected by the operator. E-invoice IRN and QR appear on the final invoice.', { s: seller.name })}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" icon={<Download className="h-4 w-4" />} disabled={!issued} onClick={() => toast(tr('PDF saved (simulated)'), 'info')}>{tr('Download PDF')}</Button>
          <LinkButton variant="outline" to="/buyer/locker" icon={<ShieldCheck className="h-4 w-4" />}>{tr('Warranty Locker')}</LinkButton>
        </div>
        <p className="text-center text-[11.5px] text-ink-3"><SimTag>{tr('Sample invoice')}</SimTag></p>
      </div>
    </div>
  );
}
const Line = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between"><span>{k}</span><span className="num">{v}</span></div>;

