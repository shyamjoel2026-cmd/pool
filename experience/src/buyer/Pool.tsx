import { CalendarDays, Check, ChevronDown, Clock, Copy, Info, Lock, LogOut, MapPin, MessageCircle, PackageCheck, Share2, ShieldCheck, Store, Truck, Users, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cn } from '../lib/cn';
import { INDIA } from '../lib/gst';
import { useT } from '../lib/i18n';
import { inr } from '../lib/money';
import { atIST, DAY, fmtDay, fmtDayTime, fmtWhen, HOUR } from '../lib/time';
import { committedCount, committedUnits, lowest30, outsideBest, potFor, productOf, profileOf, qtyLabel, uomOf, unservedText, waveMeter } from '../sim/engine';
import { discardPending, joinPool, leavePool, payBooking, startPool, useNow, useSim } from '../sim/store';
import type { Pool } from '../sim/types';
import { Button, Card, Chip, Countdown, EmptyState, ErrorState, Field, inputCls, KV, LinkButton, ListSkeleton, Radio, Section, Sheet, SimTag, Stepper, Timeline, useToast } from '../ui/core';
import { ProductArt } from '../ui/ProductArt';
import { SealedVault, WaveMeter } from '../ui/visuals';
import { AppBar, PaymentSheet, poolStatus, useLoadState } from './parts';

export function PoolPage() {
  const { id } = useParams();
  const s = useSim();
  const t = useNow(1000);
  const tr = useT();
  const nav = useNavigate();
  const toast = useToast();
  const load = useLoadState('pool' + id);
  const [share, setShare] = useState(false);
  const [leave, setLeave] = useState(false);
  const pool = s.pools.find((p) => p.id === id);
  if (!pool) return <><AppBar back="/buyer" title="Pool" /><div className="p-4"><EmptyState title="This pool doesn't exist" body="It may have been from an earlier demo session." action={<LinkButton to="/buyer" size="sm">Go home</LinkButton>} /></div></>;
  const product = productOf(s, pool.productId);
  const uom = uomOf(product.uom);
  const prof = profileOf(s, pool.profileId);
  const mine = pool.members.find((m) => m.isMe && m.status !== 'left') ;
  const committed = committedCount(pool);
  const units = committedUnits(pool, uom);
  const best = outsideBest(product, s.me.cards);
  const deliverBy = pool.closesAt + pool.requirements.deliverWithinDays * DAY;
  const st = poolStatus(pool, t);
  const myOrder = mine?.orderId ? s.orders.find((o) => o.id === mine.orderId) : undefined;
  const isOpen = pool.state === 'open' && t < pool.closesAt;

  const timeline = [
    { title: tr('Join with a refundable booking'), sub: `${inr(pool.bookingPaise)} · ${tr('only paid bookings count as demand')}`, state: (mine && mine.status !== 'pending' ? 'done' : isOpen ? 'current' : 'done') as 'done' | 'current' | 'todo' },
    { title: `${tr('Pool closes')} · ${fmtDayTime(pool.closesAt)}`, sub: `${tr('Chosen by')} ${pool.startedBy.name}. ${tr('Can only move later if every buyer agrees.')}`, state: (isOpen ? 'todo' : 'done') as 'done' | 'current' | 'todo' },
    { title: tr('Sellers’ sealed bids open; POOL sets your price'), sub: `${tr('By')} ${fmtDayTime(pool.pricingDeadline ?? pool.closesAt + INDIA.pricingWindowHours * HOUR)}`, state: (['closed', 'pricing'].includes(pool.state) ? 'current' : ['offers', 'fulfilment', 'completed'].includes(pool.state) ? 'done' : 'todo') as 'done' | 'current' | 'todo' },
    { title: tr('Your personal offer: accept or walk away'), sub: tr('{h} hours to decide. No reply = full refund.', { h: INDIA.acceptWindowHours }), state: (pool.state === 'offers' ? 'current' : ['fulfilment', 'completed'].includes(pool.state) ? 'done' : 'todo') as 'done' | 'current' | 'todo' },
    { title: `${prof.label} · ${tr('by')} ${fmtDay(deliverBy)}`, sub: tr('Money held by the payment company until you give your code.'), state: (pool.state === 'fulfilment' ? 'current' : pool.state === 'completed' ? 'done' : 'todo') as 'done' | 'current' | 'todo' },
    { title: tr('Wave Drop'), sub: tr('Completed purchases fill a shared refund pot, split equally.'), state: (pool.state === 'completed' ? 'done' : 'todo') as 'done' | 'current' | 'todo' },
  ];
  if (pool.state === 'no_deal') timeline.splice(2, 4, { title: tr('No deal · every booking refunded'), sub: pool.noDealReason ?? '', state: 'done' });

  const shareText = `I'm pooling the ${product.short} in ${pool.areaLabel} on POOL. ${committed} households so far, closes ${fmtWhen(pool.closesAt, t)}. Booking ${inr(pool.bookingPaise)}, fully refundable: pool.in/p/${pool.no.toLowerCase()}`;

  return (
    <div className={cn(isOpen && (!mine || mine.status === 'pending') ? 'pb-28' : 'pb-8')}>
      <AppBar back="/buyer" title={product.short} sub={pool.no} right={<button onClick={() => setShare(true)} className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-surface-3" aria-label="Share pool"><Share2 className="h-5 w-5" /></button>} />
      {load.state === 'loading' ? (
        <div className="p-4"><ListSkeleton rows={3} /></div>
      ) : load.state === 'error' ? (
        <div className="p-4"><ErrorState onRetry={load.retry} /></div>
      ) : (
        <div className="space-y-6 px-4 pt-3">
          <div className="flex gap-4">
            <Link to={`/buyer/product/${product.id}`}><ProductArt art={product.art} size={96} rounded={20} /></Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip tone={st.tone} dot>{st.text}</Chip>
                {pool.track === 'community' && <Chip tone="wave">Community</Chip>}
                {pool.recurring && <Chip>{pool.recurring.split(' · ')[0]}</Chip>}
              </div>
              <div className="mt-1.5 text-[17px] font-bold leading-snug text-ink">{product.title}</div>
              <div className="mt-1 flex items-center gap-1 text-[12.5px] text-ink-3"><MapPin className="h-3.5 w-3.5" />{pool.areaLabel}</div>
            </div>
          </div>

          {/* Live numbers */}
          {isOpen && (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[16px] border border-line bg-surface p-3">
                <div className="num text-[22px] font-bold text-ink">{committed}</div>
                <div className="text-[11.5px] leading-tight text-ink-3">{tr('households paid a booking')}</div>
              </div>
              <div className="rounded-[16px] border border-line bg-surface p-3">
                <div className="num text-[22px] font-bold text-ink">{Number.isInteger(units) ? units : units.toFixed(1)}</div>
                <div className="text-[11.5px] leading-tight text-ink-3">{uom.plural} {tr('committed')}</div>
              </div>
              <div className="rounded-[16px] border border-warn/25 bg-warn-soft p-3">
                <Countdown to={pool.closesAt} compact className="text-[18px]" />
                <div className="text-[11.5px] leading-tight text-ink-3">{tr('until close')}</div>
              </div>
            </div>
          )}

          {/* Member status */}
          {mine && mine.status === 'committed' && isOpen && (
            <Card tone="save" className="p-4">
              <div className="flex items-center gap-2 text-[15px] font-bold text-ink"><Check className="h-5 w-5 text-save" strokeWidth={3} /> {tr("You're in this pool")}</div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 text-[13px]">
                <KV k={tr('Quantity')} v={qtyLabel(mine.qtyBase, uom)} />
                <KV k={tr('Booking paid')} v={inr(mine.bookingPaise)} />
                {Object.entries(mine.options).map(([k, v]) => <KV key={k} k={product.options?.find((o) => o.key === k)?.label ?? k} v={product.options?.find((o) => o.key === k)?.values.find((x) => x.id === v)?.label ?? v} />)}
                {mine.needBy && <KV k={tr('Need by')} v={fmtDay(mine.needBy)} />}
              </div>
              <p className="mt-2 text-[12.5px] text-ink-2">{tr('Nothing more to pay until you accept your personal offer. Leave any time before close for a full refund.')}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" icon={<Share2 className="h-4 w-4" />} onClick={() => setShare(true)}>{tr('Invite neighbours')}</Button>
                <Button size="sm" variant="ghost" icon={<LogOut className="h-4 w-4" />} onClick={() => setLeave(true)}>{tr('Leave pool')}</Button>
              </div>
            </Card>
          )}
          {mine && (pool.state === 'closed' || pool.state === 'pricing') && mine.status === 'committed' && (
            <Card tone="brand" className="p-4">
              <div className="flex items-center gap-2 text-[15px] font-bold text-ink"><Clock className="h-5 w-5 text-brand" /> {tr('Sellers have bid. POOL is setting your price.')}</div>
              <p className="mt-1.5 text-[13px] text-ink-2">{tr('{n} sealed bids were opened at close and ranked by the published rule. Your personal offer arrives by {time}. If prices aren’t ready by then, your booking is refunded in full.', { n: pool.bids.length, time: fmtWhen(pool.pricingDeadline!, t) })}</p>
            </Card>
          )}
          {mine?.status === 'offered' && (
            <Card tone="warn" className="p-4">
              <div className="text-[15px] font-bold text-ink">{tr('Your personal offer is ready')}</div>
              <p className="mt-1 text-[13px] text-ink-2">{tr('Decide by')} {fmtWhen(pool.acceptBy!, t)} · <Countdown to={pool.acceptBy!} compact /> {tr('left')}</p>
              <LinkButton to={`/buyer/offer/${mine.id}`} className="mt-3" full>{tr('Review offer')}</LinkButton>
            </Card>
          )}
          {myOrder && (
            <Card to={`/buyer/order/${myOrder.id}`} className="flex items-center gap-3 p-4">
              <PackageCheck className="h-6 w-6 text-brand" />
              <div className="flex-1"><div className="text-[14.5px] font-bold text-ink">{tr('Your order')} {myOrder.no}</div><div className="text-[12.5px] text-ink-3">{tr('Track delivery, code and refunds')}</div></div>
            </Card>
          )}
          {mine && ['walked_away', 'timed_out', 'unserved', 'no_deal', 'left'].includes(mine.status) && (
            <Card className="p-4">
              <div className="text-[15px] font-bold text-ink">{mine.status === 'no_deal' ? tr('No deal in this pool') : mine.status === 'unserved' ? tr('No offer for your place in the pool') : mine.status === 'walked_away' ? tr('You walked away') : mine.status === 'left' ? tr('You left this pool') : tr('Your offer expired')}</div>
              <p className="mt-1 text-[13px] text-ink-2">{mine.status === 'no_deal' ? pool.noDealReason : mine.status === 'unserved' ? unservedText[pool.award?.unserved.find((u) => u.memberId === mine.id)?.reason ?? 'NO_CAPACITY'] : ''} {tr('Your booking of {amt} was refunded in full.', { amt: inr(mine.bookingPaise) })}</p>
              <LinkButton to="/buyer/money" variant="outline" size="sm" className="mt-3">{tr('See refund')}</LinkButton>
            </Card>
          )}

          {/* Sealed bids */}
          {isOpen && <SealedVault count={pool.bids.length} closesText={fmtWhen(pool.closesAt, t)} />}

          {/* Wave Drop for delivering/completed pools */}
          {(pool.state === 'fulfilment' || pool.state === 'completed') && <PoolWave pool={pool} />}

          <Section title={tr('How this pool works')}>
            <Card className="p-4"><Timeline items={timeline} /></Card>
          </Section>

          <Section title={tr('What every seller must offer')} sub={tr('Bids that miss these are not eligible, however cheap.')}>
            <Card className="divide-y divide-line">
              <div className="flex items-center gap-3 px-4 py-3"><Truck className="h-4.5 w-4.5 text-ink-3" /><span className="text-[13.5px] text-ink">{prof.label} {tr('by')} {fmtDay(deliverBy)}</span></div>
              {pool.requirements.terms.map((r) => (
                <div key={r.key} className="flex items-center gap-3 px-4 py-3"><ShieldCheck className="h-4.5 w-4.5 text-ink-3" /><span className="text-[13.5px] text-ink">{r.label}{typeof r.value === 'number' ? `: ${r.value}+` : ''}</span></div>
              ))}
              <div className="flex items-center gap-3 px-4 py-3"><PackageCheck className="h-4.5 w-4.5 text-ink-3" /><span className="text-[13.5px] text-ink">{tr('GST invoice in your name, from a verified seller')}</span></div>
              {prof.holds.length > 0 && <div className="flex items-center gap-3 px-4 py-3"><Wrench className="h-4.5 w-4.5 text-ink-3" /><span className="text-[13.5px] text-ink">{tr('Installation by a brand-authorised team')}</span></div>}
              {pool.pickup && <div className="flex items-center gap-3 px-4 py-3"><Store className="h-4.5 w-4.5 text-ink-3" /><span className="text-[13.5px] text-ink">{pool.pickup.place} · {tr('area-wise slots, 4-digit code')}</span></div>}
            </Card>
          </Section>

          <Section title={tr('Best price outside today')}>
            <Link to={`/buyer/product/${product.id}`} className="flex items-center justify-between rounded-[18px] border border-line bg-surface p-4">
              <div>
                <div className="num text-[20px] font-bold text-ink">{inr(best.price)}<span className="text-[13px] font-medium text-ink-3"> /{uom.label}</span></div>
                <div className="text-[12.5px] text-ink-3">{best.quote.source}{best.cardLabel ? ` · ${best.cardLabel}` : ''} · {tr('30-day low')} {inr(lowest30(product))}</div>
              </div>
              <span className="text-[13px] font-semibold text-brand">{tr('Compare all')}</span>
            </Link>
            <p className="px-1 text-[12px] text-ink-3">{tr('Your POOL offer will be shown next to this. If outside is cheaper for you, we’ll say so.')}</p>
          </Section>

          <Faq />
        </div>
      )}

      {isOpen && (!mine || mine.status === 'pending') && load.state === 'ready' && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-xl" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-ink">{tr('Booking')} {inr(pool.bookingPaise)} · {tr('fully refundable')}</div>
              <div className="text-[12px] text-ink-3">{tr('Pay the rest only if you accept your offer')}</div>
            </div>
            <Button size="lg" onClick={() => nav(`/buyer/join/${pool.id}`)}>{tr('Join pool')}</Button>
          </div>
        </div>
      )}

      <Sheet open={share} onClose={() => setShare(false)} title={tr('Invite your neighbours')}>
        <div className="space-y-3">
          <p className="text-[13.5px] text-ink-2">{tr('More real buyers make the pool more attractive to sellers, and every completed purchase grows the Wave Drop for everyone. No referral cash, no spam.')}</p>
          <div className="rounded-[16px] border border-line bg-[#e7ffdb] p-3 text-[13px] text-[#0b2913] dark:bg-[#123d22] dark:text-[#d7ffd8]">
            <div className="mb-1 flex items-center gap-1.5 text-[11.5px] font-bold text-[#25a244]"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp preview</div>
            {shareText}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" icon={<Copy className="h-4 w-4" />} onClick={() => { navigator.clipboard?.writeText(shareText).then(() => toast('Message copied'), () => toast('Select the text above to copy it', 'info')); }}>{tr('Copy message')}</Button>
            <Button icon={<MessageCircle className="h-4 w-4" />} onClick={() => { setShare(false); toast('Shared to WhatsApp (simulated)'); }}>WhatsApp</Button>
          </div>
          <SimTag>Sharing simulated</SimTag>
        </div>
      </Sheet>
      <Sheet open={leave} onClose={() => setLeave(false)} title={tr('Leave this pool?')} footer={<div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setLeave(false)}>{tr('Stay in')}</Button><Button variant="danger" onClick={() => { const r = leavePool(mine!.id); setLeave(false); r.ok ? toast(`Left the pool · ${inr(mine!.bookingPaise)} refund started`) : toast(r.error, 'err'); }}>{tr('Leave & refund')}</Button></div>}>
        <p className="text-[14px] text-ink-2">{tr('You get your {amt} booking back in full, to the same UPI or card. You can rejoin while the pool is open.', { amt: mine ? inr(mine.bookingPaise) : '' })}</p>
      </Sheet>
    </div>
  );
}

function PoolWave({ pool }: { pool: Pool }) {
  const s = useSim();
  const tr = useT();
  const mine = pool.members.find((m) => m.isMe);
  const myOrder = mine?.orderId ? s.orders.find((o) => o.id === mine.orderId) : undefined;
  if (pool.wave) {
    const myShare = myOrder ? pool.wave.perOrder[myOrder.id] : undefined;
    return (
      <WaveMeter level={1} title={tr('Wave Drop · paid')} value={myShare !== undefined ? inr(myShare, { exact: true }) : inr(pool.wave.potPaise)} caption={myShare !== undefined ? tr('Your share of {pot}, from {n} completed purchases. Paid back to your original payment method.', { pot: inr(pool.wave.potPaise), n: pool.wave.settledUnits }) : tr('Pot paid to {n} completed purchases.', { n: pool.wave.settledUnits })} />
    );
  }
  const bidId = myOrder?.bidId ?? pool.award?.assignments[0]?.bidId;
  const wm = bidId ? waveMeter(s, pool, bidId) : undefined;
  if (!wm || !wm.bid.slabs.length) return null;
  const maxPot = potFor(wm.bid.slabs, Math.max(wm.liveUnits, (wm.nextSlab?.fromUnit ?? wm.liveUnits) + 5));
  return (
    <WaveMeter level={maxPot ? wm.potLive / maxPot : 0} title={tr('Wave Drop · if everyone completes')} value={`${inr(wm.perBuyerIfAllSettle)} ${tr('each')}`} caption={tr('{n} accepted orders would fill a {pot} pot. Only completed purchases count; paid when the wave closes.', { n: wm.liveUnits, pot: inr(wm.potLive) }) + (wm.nextSlab ? ' ' + tr('From order {k}, each adds {amt}.', { k: wm.nextSlab.fromUnit, amt: inr(wm.nextSlab.perUnitPaise) }) : '')} />
  );
}

function Faq() {
  const tr = useT();
  const [open, setOpen] = useState<number | null>(null);
  const qs: Array<[string, string]> = [
    [tr('What if I don’t like the price?'), tr('Walk away. Your booking comes back in full. Accept and Walk away are equal choices, and no reply also means a full refund.')],
    [tr('When do I pay the rest?'), tr('Only after you accept your personal offer: pay in full, by card EMI, or at your door by UPI or card after checking the box. Never cash.')],
    [tr('Who holds my money?'), tr('A licensed payment company. It releases the seller’s share only after you give your handover code.')],
    [tr('What if no seller bids, or none meets the rules?'), tr('Then it’s “no deal” and every booking is refunded automatically.')],
    [tr('Can the closing time change?'), tr('Only later, and only if every buyer in the pool agrees. Never earlier. Every change is logged.')],
    [tr('Who sees my name and number?'), tr('Nobody until you accept an offer. Then only the winning seller, for delivery.')],
    [tr('What is the Wave Drop?'), tr('Each completed purchase drops a small amount, set by the seller, into a shared pot. When the wave closes, the pot is split equally among buyers who completed. Real numbers only.')],
  ];
  return (
    <Section title={tr('Questions buyers ask')}>
      <div className="divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-surface">
        {qs.map(([q, a], i) => (
          <div key={i}>
            <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[14px] font-semibold text-ink" aria-expanded={open === i}>
              {q}
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-3 transition', open === i && 'rotate-180')} />
            </button>
            {open === i && <p className="px-4 pb-4 text-[13.5px] leading-relaxed text-ink-2">{a}</p>}
          </div>
        ))}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- Join
export function JoinFlow() {
  const { poolId } = useParams();
  const s = useSim();
  const t = useNow(1000);
  const tr = useT();
  const nav = useNavigate();
  const toast = useToast();
  const pool = s.pools.find((p) => p.id === poolId);
  const product = pool ? productOf(s, pool.productId) : undefined;
  const uom = product ? uomOf(product.uom) : undefined;
  const pending = pool?.members.find((m) => m.isMe && m.status === 'pending');
  const [qty, setQty] = useState(pending?.qtyBase ?? pool?.qtyRule.minBase ?? 1);
  const [opts, setOpts] = useState<Record<string, string>>(pending?.options ?? Object.fromEntries((product?.options ?? []).map((o) => [o.key, o.values[0].id])));
  const [addressId, setAddressId] = useState(s.me.addresses.find((a) => a.isDefault)!.id);
  const [needMode, setNeedMode] = useState<'none' | 'week' | 'date'>('none');
  const [needDate, setNeedDate] = useState('');
  const [memberId, setMemberId] = useState<string | null>(pending?.id ?? null);
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState('');
  if (!pool || !product || !uom) return <><AppBar back="/buyer" title="Join" /><div className="p-4"><EmptyState title="Pool not found" /></div></>;
  if (pool.state !== 'open' || t >= pool.closesAt) return <><AppBar back={`/buyer/pool/${pool.id}`} title={tr('Join pool')} /><div className="p-4"><EmptyState icon={<Lock className="h-6 w-6" />} title={tr('This pool has closed')} body={tr('Start a new pool for this product, or watch it to hear when the next one opens.')} action={<LinkButton to={`/buyer/product/${product.id}`} size="sm">{tr('See product')}</LinkButton>} /></div></>;
  const already = pool.members.find((m) => m.isMe && m.status === 'committed');
  if (already) return <><AppBar back={`/buyer/pool/${pool.id}`} title={tr('Join pool')} /><div className="p-4"><EmptyState icon={<Check className="h-6 w-6" />} title={tr("You're already in this pool")} action={<LinkButton to={`/buyer/pool/${pool.id}`} size="sm">{tr('Open pool')}</LinkButton>} /></div></>;
  const isPickup = !!pool.pickup;
  const needBy = needMode === 'week' ? t + 7 * DAY : needMode === 'date' && needDate ? new Date(needDate + 'T20:00:00+05:30').getTime() : undefined;
  const deliverBy = pool.closesAt + pool.requirements.deliverWithinDays * DAY;
  const proceed = () => {
    setErr('');
    const r = joinPool(pool.id, { qtyBase: qty, options: opts, needBy, addressId });
    if (!r.ok) return setErr(r.error);
    setMemberId(r.value);
    setPaying(true);
  };
  return (
    <div className="pb-32">
      <AppBar back={`/buyer/pool/${pool.id}`} title={tr('Join pool')} sub={product.short} />
      <div className="space-y-6 px-4 pt-3">
        <div className="flex items-center gap-3 rounded-[18px] border border-line bg-surface p-3">
          <ProductArt art={product.art} size={56} />
          <div className="min-w-0"><div className="truncate text-[14.5px] font-semibold text-ink">{product.title}</div><div className="text-[12px] text-ink-3">{pool.areaLabel} · {tr('closes')} {fmtWhen(pool.closesAt, t)}</div></div>
        </div>

        <Section title={`1. ${tr('How much?')}`} sub={pool.qtyRule.maxPerHouseholdBase ? tr('Up to {n} per household in this pool.', { n: qtyLabel(pool.qtyRule.maxPerHouseholdBase, uom) }) : pool.qtyRule.maxPerBuyerBase ? tr('Up to {n} per buyer.', { n: qtyLabel(pool.qtyRule.maxPerBuyerBase, uom) }) : undefined}>
          <div className="flex items-center justify-between rounded-[18px] border border-line bg-surface p-3">
            <span className="text-[14px] font-semibold text-ink">{tr('Quantity')}</span>
            <Stepper value={qty} onChange={setQty} min={pool.qtyRule.minBase} max={pool.qtyRule.maxPerBuyerBase ?? pool.qtyRule.maxPerHouseholdBase} step={pool.qtyRule.stepBase} format={(v) => qtyLabel(v, uom)} />
          </div>
          {product.options?.map((o) => (
            <div key={o.key} className="space-y-2">
              <div className="text-[13px] font-semibold text-ink-2">{o.label}</div>
              <div className="flex gap-2">
                {o.values.map((v) => (
                  <button key={v.id} onClick={() => setOpts({ ...opts, [o.key]: v.id })} className={cn('flex-1 rounded-[12px] border px-3 py-2.5 text-[14px] font-semibold', opts[o.key] === v.id ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-ink-2')}>{v.label}</button>
                ))}
              </div>
            </div>
          ))}
        </Section>

        <Section title={`2. ${isPickup ? tr('Where you’ll pick up') : tr('Where to deliver')}`}>
          {isPickup ? (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-ink"><Store className="h-4.5 w-4.5 text-brand" /> {pool.pickup!.place}</div>
              <p className="mt-1 text-[12.5px] text-ink-3">{pool.pickup!.address}</p>
              <p className="mt-2 text-[12.5px] text-ink-2">{tr('You pick a time slot after the price is set. Each slot has a limit so nobody queues.')}</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {s.me.addresses.map((a) => (
                <Radio key={a.id} id={`addr-${a.id}`} checked={addressId === a.id} onSelect={() => setAddressId(a.id)} title={a.label} sub={`${a.line1}, ${a.line2}, ${a.pincode}`} right={pool.pincodes.length === 0 || pool.pincodes.includes(a.pincode) ? <Chip tone="save">Serviceable</Chip> : <Chip tone="warn">Outside area</Chip>} />
              ))}
              <Link to="/buyer/account/addresses/new" className="block text-[13px] font-semibold text-brand">+ {tr('Add a new address')}</Link>
            </div>
          )}
        </Section>

        <Section title={`3. ${tr('When do you need it?')}`} sub={tr('Pool sellers commit to deliver by {d}. If you need it sooner, we only match you with sellers who can.', { d: fmtDay(deliverBy) })}>
          <div className="grid grid-cols-3 gap-2">
            {([['none', tr('No rush')], ['week', tr('Within a week')], ['date', tr('Pick a date')]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setNeedMode(k)} className={cn('rounded-[12px] border px-2 py-2.5 text-[13px] font-semibold', needMode === k ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-ink-2')}>{l}</button>
            ))}
          </div>
          {needMode === 'date' && <Field label={tr('Need by')} htmlFor="needby"><input id="needby" type="date" className={inputCls} value={needDate} min={new Date(t + DAY).toISOString().slice(0, 10)} onChange={(e) => setNeedDate(e.target.value)} /></Field>}
        </Section>

        <Section title={`4. ${tr('What you pay now')}`}>
          <Card className="p-4">
            <KV k={tr('Refundable booking')} v={inr(pool.bookingPaise)} strong />
            <div className="mt-2 space-y-1.5 text-[12.5px] text-ink-2">
              <div className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-save" />{tr('Counts you as a real buyer, so sellers bid seriously')}</div>
              <div className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-save" />{tr('Fully refunded if you leave before close, walk away, or there’s no deal')}</div>
              <div className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-save" />{tr('Credited against your price if you accept')}</div>
            </div>
          </Card>
          {err && <p className="rounded-[12px] bg-danger-soft p-3 text-[13px] font-medium text-danger">{err}</p>}
        </Section>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-xl" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <Button full size="lg" onClick={proceed}>{tr('Pay {amt} booking', { amt: inr(pool.bookingPaise) })}</Button>
        <p className="mt-1.5 text-center text-[11.5px] text-ink-3">{tr('Next: you get a personal offer after {t}. Nothing else is charged now.', { t: fmtWhen(pool.closesAt, t) })}</p>
      </div>
      <PaymentSheet
        open={paying}
        onClose={() => { setPaying(false); if (memberId) discardPending(memberId); }}
        amount={pool.bookingPaise}
        purpose={`Refundable booking · ${product.short} · ${pool.no}`}
        onPay={(m) => payBooking(memberId!, m)}
        successText={tr("You're in. {n} households have now paid a booking. We'll message you when the pool closes and your offer is ready.", { n: committedCount(pool) + 1 })}
        onSuccess={() => { setPaying(false); toast(tr("You're in the pool")); nav(`/buyer/pool/${pool.id}`); }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- Start
export function StartFlow() {
  const { productId } = useParams();
  const s = useSim();
  const t = useNow(60000);
  const tr = useT();
  const nav = useNavigate();
  const toast = useToast();
  const product = s.products.find((p) => p.id === productId);
  const addr = s.me.addresses.find((a) => a.isDefault)!;
  const [area, setArea] = useState<'west' | 'local'>('west');
  const [close, setClose] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [within, setWithin] = useState(5);
  const [qty, setQty] = useState(product?.uom === 'kg' ? 1000 : 1);
  const [paying, setPaying] = useState<{ memberId: string; poolId: string } | null>(null);
  const [err, setErr] = useState('');
  const choices = useMemo(() => [
    { id: 'tomorrow', label: tr('Tomorrow, 8 PM'), at: atIST(t, 1, 20) },
    { id: '3d', label: `${fmtDay(atIST(t, 3, 20))}, 8 PM`, at: atIST(t, 3, 20) },
    { id: '7d', label: `${fmtDay(atIST(t, 7, 20))}, 8 PM`, at: atIST(t, 7, 20) },
    { id: 'custom', label: tr('Pick a date and time'), at: custom ? new Date(custom + ':00+05:30').getTime() : 0 },
  ], [t, custom, tr]);
  if (!product) return <><AppBar back="/buyer" title="Start a pool" /><div className="p-4"><EmptyState title="Product not found" /></div></>;
  const uom = uomOf(product.uom);
  const areaLabel = area === 'west' ? 'Hyderabad West' : addr.line2.split(',').pop()!.trim();
  const pins = area === 'west' ? ['500032', '500084', '500081', '500089', '500019', '500075', '500033'] : [addr.pincode];
  const closesAt = choices.find((c) => c.id === close)?.at ?? 0;
  const booking = { electronics: 2000, appliances: 2000, laptops: 2000, groceries: 200, meat: 100, books: 100, building: 1000, services: 300, home: 500 }[product.category] * 100;
  const go = () => {
    setErr('');
    if (!close) return setErr(tr('Choose when your pool closes. There is no default: you decide.'));
    const r = startPool({ productId: product.id, closesAt, areaLabel, pincodes: pins, deliverWithinDays: within, qtyBase: qty, options: Object.fromEntries((product.options ?? []).map((o) => [o.key, o.values[0].id])), addressId: addr.id });
    if (!r.ok) return setErr(r.error);
    setPaying(r.value);
  };
  return (
    <div className="pb-32">
      <AppBar back={`/buyer/product/${product.id}`} title={tr('Start a pool')} sub={product.short} />
      <div className="space-y-6 px-4 pt-3">
        <Card tone="brand" className="flex gap-3 p-4">
          <Users className="h-5 w-5 shrink-0 text-brand" />
          <p className="text-[13px] leading-relaxed text-ink-2">{tr('You’re starting a pool. Neighbours who want the same product can join, verified sellers in your area are invited to bid privately, and the closing time you choose is the one everyone sees.')}</p>
        </Card>
        <Section title={`1. ${tr('Who can join')}`}>
          <Radio id="area-west" checked={area === 'west'} onSelect={() => setArea('west')} title="Hyderabad West" sub="Gachibowli, Kondapur, Madhapur, Manikonda, Lingampally, Kokapet, Jubilee Hills" />
          <Radio id="area-local" checked={area === 'local'} onSelect={() => setArea('local')} title={`${tr('Only')} ${areaLabel === 'Hyderabad West' ? addr.line2.split(',').pop()!.trim() : areaLabel} (${addr.pincode})`} sub={tr('Smaller pool, easier delivery batching')} />
        </Section>
        <Section title={`2. ${tr('When it closes')}`} sub={tr('You choose. At least 1 hour so sellers can bid, at most 30 days. Longer pools gather more neighbours.')}>
          <div className="space-y-2">
            {choices.map((c) => (
              <Radio key={c.id} id={`close-${c.id}`} checked={close === c.id} onSelect={() => setClose(c.id)} title={c.label} sub={c.id !== 'custom' ? tr('{left} from now', { left: `${Math.round((c.at - t) / HOUR)} h` }) : undefined} />
            ))}
          </div>
          {close === 'custom' && <Field label={tr('Close at (IST)')} htmlFor="close-at"><input id="close-at" type="datetime-local" className={inputCls} value={custom} onChange={(e) => setCustom(e.target.value)} /></Field>}
        </Section>
        <Section title={`3. ${tr('Delivery within')}`} sub={tr('Days after close that sellers must deliver by.')}>
          <div className="grid grid-cols-3 gap-2">
            {[3, 5, 7].map((d) => <button key={d} onClick={() => setWithin(d)} className={cn('rounded-[12px] border px-3 py-2.5 text-[14px] font-semibold', within === d ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-ink-2')}>{d} {tr('days')}</button>)}
          </div>
        </Section>
        <Section title={`4. ${tr('Your quantity')}`}>
          <div className="flex items-center justify-between rounded-[18px] border border-line bg-surface p-3">
            <span className="text-[14px] font-semibold text-ink">{tr('Quantity')}</span>
            <Stepper value={qty} onChange={setQty} min={product.uom === 'kg' ? 500 : 1} max={product.uom === 'kg' ? 3000 : 2} step={product.uom === 'kg' ? 250 : 1} format={(v) => qtyLabel(v, uom)} />
          </div>
        </Section>
        <Card className="p-4">
          <KV k={tr('Refundable booking now')} v={inr(booking)} strong />
          <p className="mt-1 text-[12.5px] text-ink-3">{tr('Same rules as any pool: refunded if you leave before close, walk away, or there’s no deal.')}</p>
        </Card>
        {err && <p className="rounded-[12px] bg-danger-soft p-3 text-[13px] font-medium text-danger">{err}</p>}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-xl" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <Button full size="lg" onClick={go}>{tr('Start pool · pay {amt}', { amt: inr(booking) })}</Button>
      </div>
      <PaymentSheet
        open={!!paying}
        onClose={() => { if (paying) discardPending(paying.memberId); setPaying(null); }}
        amount={booking}
        purpose={`Refundable booking · new pool · ${product.short}`}
        onPay={(m) => payBooking(paying!.memberId, m)}
        successText={tr('Your pool is live. Sellers in your area are invited now. Share it so neighbours can join.')}
        onSuccess={() => { const id = paying!.poolId; setPaying(null); toast(tr('Pool started')); nav(`/buyer/pool/${id}`); }}
      />
      <div className="hidden"><Info /><CalendarDays /></div>
    </div>
  );
}
