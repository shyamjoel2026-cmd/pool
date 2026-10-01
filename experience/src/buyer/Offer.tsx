import { BadgeCheck, CalendarClock, Check, ChevronRight, CreditCard, HandCoins, Info, MapPin, ShieldCheck, Star, Store, ThumbsDown, Truck, Waves } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useT } from '../lib/i18n';
import { inr } from '../lib/money';
import { fmtDay, fmtTime, fmtWhen } from '../lib/time';
import { offerFor, productOf, profileOf, qtyLabel, uomOf } from '../sim/engine';
import { decideOffer, payOrder, useNow, useSim } from '../sim/store';
import type { Order } from '../sim/types';
import { Button, Card, Chip, Countdown, EmptyState, ErrorState, KV, LinkButton, ListSkeleton, Radio, Section, Sheet, SimTag, useToast } from '../ui/core';
import { ProductArt } from '../ui/ProductArt';
import { MoneyRibbon } from '../ui/visuals';
import { AppBar, GstBreakdown, PaymentSheet, useLoadState } from './parts';

function useOffer(memberId: string | undefined) {
  const s = useSim();
  for (const p of s.pools) {
    const m = p.members.find((x) => x.id === memberId);
    if (m) return { s, pool: p, member: m };
  }
  return { s, pool: undefined, member: undefined };
}

export function OfferPage() {
  const { memberId } = useParams();
  const { s, pool, member } = useOffer(memberId);
  const t = useNow(1000);
  const tr = useT();
  const nav = useNavigate();
  const toast = useToast();
  const load = useLoadState('offer' + memberId);
  const [walk, setWalk] = useState(false);
  const [reason, setReason] = useState('');
  const [why, setWhy] = useState(false);
  if (!pool || !member) return <><AppBar back="/buyer/pools" title={tr('Offer')} /><div className="p-4"><EmptyState title={tr('Offer not found')} body={tr('It may be from an earlier demo session.')} action={<LinkButton to="/buyer/pools" size="sm">{tr('My pools')}</LinkButton>} /></div></>;
  const product = productOf(s, pool.productId);
  const uom = uomOf(product.uom);
  const prof = profileOf(s, pool.profileId);

  if (member.status !== 'offered') {
    const order = member.orderId ? s.orders.find((o) => o.id === member.orderId) : undefined;
    return (
      <>
        <AppBar back="/buyer/pools" title={tr('Your offer')} sub={product.short} />
        <div className="p-4">
          {member.status === 'accepted' && order ? (
            <EmptyState icon={<Check className="h-6 w-6" />} title={tr('You accepted this offer')} body={tr('Your order {no} is in progress.', { no: order.no })} action={<LinkButton to={`/buyer/order/${order.id}`} size="sm">{tr('Open order')}</LinkButton>} />
          ) : member.status === 'walked_away' || member.status === 'timed_out' ? (
            <EmptyState icon={<HandCoins className="h-6 w-6" />} title={member.status === 'walked_away' ? tr('You walked away') : tr('This offer expired')} body={tr('Your booking of {amt} was refunded in full to your original payment method.', { amt: inr(member.bookingPaise) })} action={<LinkButton to="/buyer/money" size="sm" variant="outline">{tr('See refund')}</LinkButton>} />
          ) : (
            <EmptyState icon={<CalendarClock className="h-6 w-6" />} title={tr('No offer yet')} body={tr('Your personal offer appears here after the pool closes and the POOL team sets prices.')} action={<LinkButton to={`/buyer/pool/${pool.id}`} size="sm">{tr('Open pool')}</LinkButton>} />
          )}
        </div>
      </>
    );
  }

  const v = offerFor(s, pool, member);
  if (load.state === 'loading') return <><AppBar back="/buyer/pools" title={tr('Your personal offer')} /><div className="p-4"><ListSkeleton rows={3} /></div></>;
  if (load.state === 'error' || !v) return <><AppBar back="/buyer/pools" title={tr('Your personal offer')} /><div className="p-4"><ErrorState onRetry={load.retry} /></div></>;

  const cheaperOutside = v.saving <= 0;
  const pct = v.outsideTotal > 0 ? Math.round((v.saving / v.outsideTotal) * 1000) / 10 : 0;
  const optText = Object.entries(member.options).map(([k, val]) => product.options?.find((o) => o.key === k)?.values.find((x) => x.id === val)?.label ?? val).join(' · ');
  const onTime = Math.round(v.seller.onTimeBps / 100);

  const doWalk = () => {
    const r = decideOffer(member.id, 'walk');
    setWalk(false);
    if (!r.ok) return toast(r.error, 'err');
    toast(tr('Walked away · {amt} refund started', { amt: inr(member.bookingPaise) }));
    nav(`/buyer/pool/${pool.id}`);
  };

  return (
    <div className="pb-36">
      <AppBar back="/buyer/pools" title={tr('Your personal offer')} sub={`${product.short} · ${pool.no}`} />
      <div className="space-y-5 px-4 pt-3">
        {/* Decide-by */}
        <div className="flex items-center justify-between gap-3 rounded-[16px] border border-warn/25 bg-warn-soft px-4 py-3">
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-ink">{tr('Decide by')} {fmtWhen(pool.acceptBy!, t)}</div>
            <div className="text-[12px] text-ink-2">{tr('No reply means walk away with a full refund. Never a silent charge.')}</div>
          </div>
          <Countdown to={pool.acceptBy!} compact className="shrink-0 text-[17px]" />
        </div>

        {/* Price hero */}
        <div className="overflow-hidden rounded-[22px] bg-night text-white shadow-[var(--shadow-pop)]">
          <div className="flex gap-3 p-4 pb-3">
            <ProductArt art={product.art} size={64} rounded={16} />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-white/55">{tr('Guaranteed for you')}</div>
              <div className="mt-0.5 truncate text-[15px] font-semibold">{product.title}</div>
              <div className="text-[12.5px] text-white/60">{qtyLabel(member.qtyBase, uom)}{optText ? ` · ${optText}` : ''}</div>
            </div>
          </div>
          <div className="px-4 pb-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="num text-[38px] font-bold leading-none tracking-[-0.02em]">{inr(v.buyerTotal)}</div>
                <div className="mt-1.5 text-[12.5px] text-white/60">{inr(v.buyerPrice)} {tr('per')} {uom.label} · {tr('all-in, GST and delivery included')}</div>
              </div>
              {!cheaperOutside && <div className="rounded-[12px] bg-[#7ff0e6]/15 px-2.5 py-1.5 text-right"><div className="num text-[16px] font-bold text-[#7ff0e6]">−{inr(v.saving)}</div><div className="text-[10.5px] text-white/60">{pct}% {tr('less')}</div></div>}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-[12px] bg-white/[0.07] p-2.5">
                <div className="text-white/55">{tr('Best outside for you')}</div>
                <div className="num mt-0.5 text-[15px] font-bold">{inr(v.outsideTotal)}</div>
                <div className="truncate text-white/50">{v.outsideSource}{v.outsideCard ? ` · ${tr('with your card')}` : ''}</div>
              </div>
              <div className="rounded-[12px] bg-white/[0.07] p-2.5">
                <div className="text-white/55">{tr('Price can’t go up')}</div>
                <div className="mt-0.5 flex items-center gap-1 text-[15px] font-bold"><ShieldCheck className="h-4 w-4 text-[#7ff0e6]" />{tr('Locked')}</div>
                <div className="text-white/50">{tr('until')} {fmtTime(pool.acceptBy!)}</div>
              </div>
            </div>
          </div>
        </div>

        {cheaperOutside && (
          <Card tone="warn" className="p-4">
            <div className="flex items-center gap-2 text-[15px] font-bold text-ink"><Info className="h-5 w-5 text-warn" />{tr('{src} is cheaper for you', { src: v.outsideSource })}</div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{tr('With {card}, it comes to {out} there, {gap} less than this offer. We’d rather tell you. Walking away is free and your booking comes back in full.', { card: v.outsideCard ?? tr('today’s price'), out: inr(v.outsideTotal), gap: inr(-v.saving) })}</p>
            <p className="mt-1.5 text-[12px] text-ink-3">{tr('What this offer still includes: seller verified by POOL, money held until your code, {days}-day replacement window.', { days: prof.returnWindowDays })}</p>
          </Card>
        )}

        {/* Seller */}
        <Section title={tr('Who delivers')}>
          <Card to={`/buyer/seller/${v.seller.id}`} className="p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-brand-soft text-brand"><Store className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[15px] font-bold text-ink">{v.seller.name}<BadgeCheck className="h-4 w-4 text-brand" /></div>
                <div className="text-[12.5px] text-ink-3">{v.seller.area}, {v.seller.city} · {tr('since')} {v.seller.since}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-3" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-[12px] bg-surface-2 p-2"><div className="num flex items-center justify-center gap-1 text-[15px] font-bold text-ink">{v.seller.rating ? <><Star className="h-3.5 w-3.5 fill-warn text-warn" />{v.seller.rating.toFixed(1)}</> : '—'}</div><div className="text-[11px] text-ink-3">{v.seller.ratingCount} {tr('ratings')}</div></div>
              <div className="rounded-[12px] bg-surface-2 p-2"><div className="num text-[15px] font-bold text-ink">{v.seller.settledOrders}</div><div className="text-[11px] text-ink-3">{tr('completed orders')}</div></div>
              <div className="rounded-[12px] bg-surface-2 p-2"><div className="num text-[15px] font-bold text-ink">{onTime}%</div><div className="text-[11px] text-ink-3">{tr('on time')}</div></div>
            </div>
            <p className="mt-3 text-[12px] text-ink-3">{tr('Ratings come only from buyers who completed a purchase. Chosen by the published rule: lowest seller price that meets every requirement.')}</p>
          </Card>
          {v.backupSeller && <p className="px-1 text-[12.5px] text-ink-3">{tr('Backup seller if they can’t deliver: {name}, at this same price.', { name: v.backupSeller.name })}</p>}
        </Section>

        {/* Delivery & terms */}
        <Section title={tr('Delivery and your protections')}>
          <Card className="divide-y divide-line">
            <div className="flex gap-3 px-4 py-3"><Truck className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" /><div><div className="text-[14px] font-semibold text-ink">{prof.label} {tr('by')} {fmtDay(v.deliverBy)}</div><div className="text-[12.5px] text-ink-3">{tr('Late? You get a {amt} credit, paid by the seller.', { amt: inr(prof.lateCreditPaise) })}</div></div></div>
            <div className="flex gap-3 px-4 py-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" /><div><div className="text-[14px] font-semibold text-ink">{tr('Money held until your code')}</div><div className="text-[12.5px] text-ink-3">{tr('Check the box first. The seller is paid only after you give your one-time code.')}</div></div></div>
            <div className="flex gap-3 px-4 py-3"><CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" /><div><div className="text-[14px] font-semibold text-ink">{tr('{d}-day replacement window', { d: prof.returnWindowDays })}</div><div className="text-[12.5px] text-ink-3">{prof.returnCostPaise > 0 ? tr('Free cancellation until dispatch. After dispatch, a return costs {amt} (shown now, never later).', { amt: inr(prof.returnCostPaise) }) : tr('Free cancellation until it’s ready.')}</div></div></div>
            <div className="flex gap-3 px-4 py-3"><Waves className="mt-0.5 h-5 w-5 shrink-0 text-wave" /><div><div className="text-[14px] font-semibold text-ink">{tr('Wave Drop: about {amt} back', { amt: inr(v.waveEstimate.perBuyer) })}</div><div className="text-[12.5px] text-ink-3">{tr('If the {n} purchases accepted so far all complete. More completions, bigger pot. Paid after the wave closes; never promised beyond real numbers.', { n: v.waveEstimate.counted })}</div></div></div>
          </Card>
        </Section>

        {/* Price breakdown */}
        <Section title={tr('Price breakdown')} action={<button onClick={() => setWhy(true)} className="text-[13px] font-semibold text-brand">{tr('How was this set?')}</button>}>
          <Card className="p-4">
            <GstBreakdown total={v.buyerTotal} gstBps={product.gstBps} interState={v.interState} booking={v.booking} qtyText={qtyLabel(member.qtyBase, uom)} unitPrice={v.buyerPrice} />
          </Card>
          <p className="px-1 text-[12px] text-ink-3">{v.interState ? tr('Seller ships from {st}, so the invoice carries IGST.', { st: v.seller.state }) : tr('Seller is in Telangana, so the invoice carries CGST + SGST.')} {tr('GST invoice in your name, from the seller.')}</p>
        </Section>

        <Section title={tr('Where your money goes')}>
          <Card className="p-4">
            <MoneyRibbon steps={[
              { label: tr('Booking'), sub: tr('paid'), amount: v.booking, state: 'done' },
              { label: tr('Balance'), sub: tr('now or at door'), amount: v.balance, state: 'current' },
              { label: tr('Held'), sub: tr('payment company'), state: 'todo' },
              { label: tr('Your code'), sub: tr('releases it'), state: 'todo' },
            ]} />
          </Card>
        </Section>
      </div>

      {/* Equal-weight decision */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-xl" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" variant="outline" className="border-2 border-ink/80" onClick={() => setWalk(true)} icon={<ThumbsDown className="h-4 w-4" />}>{tr('Walk away')}</Button>
          <Button size="lg" onClick={() => nav(`/buyer/accept/${member.id}`)} icon={<Check className="h-4 w-4" strokeWidth={3} />}>{tr('Accept')}</Button>
        </div>
        <p className="mt-1.5 text-center text-[11.5px] text-ink-3">{tr('Walk away: {amt} back in full. Accept: choose how to pay next.', { amt: inr(v.booking) })}</p>
      </div>

      <Sheet open={walk} onClose={() => setWalk(false)} title={tr('Walk away from this offer?')} footer={<div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setWalk(false)}>{tr('Go back')}</Button><Button variant="dark" onClick={doWalk}>{tr('Walk away')}</Button></div>}>
        <div className="space-y-3">
          <Card tone="save" className="p-3.5 text-[13.5px] text-ink-2">
            <div className="font-semibold text-ink">{tr('{amt} comes back to {m}', { amt: inr(v.booking), m: member.bookingMethod ?? 'UPI' })}</div>
            <div className="mt-0.5">{(member.bookingMethod ?? '').includes('UPI') ? tr('Usually within 30 minutes on UPI.') : tr('3–5 working days on cards.')}</div>
          </Card>
          <div className="text-[13px] font-semibold text-ink-2">{tr('Tell us why (optional, helps us price better)')}</div>
          <div className="flex flex-wrap gap-2">
            {[tr('Price too high'), tr('Found it cheaper'), tr('Don’t need it now'), tr('Delivery date'), tr('Seller')].map((r) => (
              <button key={r} onClick={() => setReason(reason === r ? '' : r)} className={cn('rounded-full border px-3 py-1.5 text-[13px] font-semibold', reason === r ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line text-ink-2')}>{r}</button>
            ))}
          </div>
        </div>
      </Sheet>
      <Sheet open={why} onClose={() => setWhy(false)} title={tr('How your price was set')}>
        <ol className="space-y-3 text-[13.5px] leading-relaxed text-ink-2">
          <li><b className="text-ink">1.</b> {tr('{n} verified sellers bid privately. Nobody saw another’s price.', { n: pool.bids.length })}</li>
          <li><b className="text-ink">2.</b> {tr('At close, eligible bids were ranked by the published rule: lowest seller price, then earliest delivery, then rating.')}</li>
          <li><b className="text-ink">3.</b> {tr('The POOL team set what you pay. The difference between your price and the seller’s is POOL’s fee; it includes 18% GST, which POOL pays.')}</li>
          <li><b className="text-ink">4.</b> {tr('POOL’s fee never decides which seller wins.')}</li>
        </ol>
        <Link to="/buyer/help/ranking" onClick={() => setWhy(false)} className="mt-4 block text-[13.5px] font-semibold text-brand">{tr('Read the full ranking rule')}</Link>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------- Accept: plan, place, pay
export function AcceptFlow() {
  const { memberId } = useParams();
  const { s, pool, member } = useOffer(memberId);
  const t = useNow(1000);
  const tr = useT();
  const nav = useNavigate();
  const toast = useToast();
  const [plan, setPlan] = useState<Order['plan'] | null>(null);
  const [addressId, setAddressId] = useState(s.me.addresses.find((a) => a.isDefault)?.id ?? '');
  const [slotId, setSlotId] = useState<string>('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!pool || !member) return <><AppBar back="/buyer/pools" title={tr('Accept offer')} /><div className="p-4"><EmptyState title={tr('Offer not found')} /></div></>;
  const product = productOf(s, pool.productId);
  const uom = uomOf(product.uom);
  const prof = profileOf(s, pool.profileId);
  const existing = member.orderId ? s.orders.find((o) => o.id === member.orderId) : undefined;
  if (member.status !== 'offered' && !orderId) {
    return <><AppBar back={`/buyer/offer/${member.id}`} title={tr('Accept offer')} /><div className="p-4"><EmptyState title={existing ? tr('Already accepted') : tr('This offer is closed')} action={existing ? <LinkButton to={`/buyer/order/${existing.id}`} size="sm">{tr('Open order')}</LinkButton> : <LinkButton to="/buyer/pools" size="sm">{tr('My pools')}</LinkButton>} /></div></>;
  }
  const v = offerFor(s, pool, member);
  const pendingOrder = orderId ? s.orders.find((o) => o.id === orderId) : undefined;
  if (!v && !pendingOrder) return <><AppBar back="/buyer/pools" title={tr('Accept offer')} /><div className="p-4"><ErrorState /></div></>;
  const total = v?.buyerTotal ?? pendingOrder!.buyerTotal;
  const booking = v?.booking ?? pendingOrder!.bookingCredit;
  const balance = total - booking;
  const isPickup = !!pool.pickup;
  const emiFrom = Math.ceil(balance / 9 / 100) * 100;

  const plans: Array<{ id: Order['plan']; title: string; sub: string; icon: React.ReactNode }> = [
    { id: 'prepay', title: tr('Pay now · {amt}', { amt: inr(balance) }), sub: tr('UPI, card or netbanking. Held by the payment company until your code.'), icon: <CreditCard className="h-5 w-5" /> },
    { id: 'door', title: tr('Pay at your door'), sub: tr('Pay {amt} in the app by UPI or card when it arrives, after checking the box. Never cash.', { amt: inr(balance) }), icon: <HandCoins className="h-5 w-5" /> },
    { id: 'emi', title: tr('Card EMI · from {amt}/month', { amt: inr(emiFrom) }), sub: tr('HDFC credit card, 3 months no-cost, or 6 or 9 months with bank interest.'), icon: <CreditCard className="h-5 w-5" /> },
  ];
  const allowed = plans.filter((p) => pool.checkoutPlans.includes(p.id));
  const chosen = plan ?? (allowed.length === 1 ? allowed[0].id : null);

  const accept = () => {
    setErr('');
    if (!chosen) return setErr(tr('Choose how you want to pay.'));
    if (isPickup && !slotId) return setErr(tr('Pick a pickup slot.'));
    setBusy(true);
    const r = decideOffer(member.id, 'accept', chosen, { addressId, slotId: slotId || undefined });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    const id = r.value!;
    if (chosen === 'door') {
      toast(tr('Accepted · pay at your door'));
      nav(`/buyer/order/${id}`);
      return;
    }
    setOrderId(id);
  };

  return (
    <div className="pb-36">
      <AppBar back={`/buyer/offer/${member.id}`} title={tr('Accept offer')} sub={product.short} />
      <div className="space-y-6 px-4 pt-3">
        <div className="flex items-center gap-3 rounded-[18px] border border-line bg-surface p-3">
          <ProductArt art={product.art} size={52} />
          <div className="min-w-0 flex-1"><div className="truncate text-[14.5px] font-semibold text-ink">{product.short} · {qtyLabel(member.qtyBase, uom)}</div><div className="text-[12px] text-ink-3">{v?.seller.name} · {tr('by')} {fmtDay(v?.deliverBy ?? t)}</div></div>
          <div className="num text-[16px] font-bold text-ink">{inr(total)}</div>
        </div>

        <Section title={`1. ${tr('How do you want to pay?')}`}>
          <div className="space-y-2">
            {allowed.map((p) => (
              <Radio key={p.id} id={`plan-${p.id}`} checked={chosen === p.id} onSelect={() => setPlan(p.id)} title={<span className="flex items-center gap-2">{p.title}{p.id === 'door' && <Chip tone="save">{tr('Popular')}</Chip>}</span>} sub={p.sub} />
            ))}
          </div>
        </Section>

        <Section title={`2. ${isPickup ? tr('Pick a pickup slot') : tr('Deliver to')}`} sub={isPickup ? `${pool.pickup!.place} · ${pool.pickup!.address}` : undefined}>
          {isPickup ? (
            <div className="space-y-2">
              {pool.pickup!.slots.map((sl) => {
                const full = sl.booked >= sl.capacity;
                return <Radio key={sl.id} id={`slot-${sl.id}`} disabled={full} checked={slotId === sl.id} onSelect={() => setSlotId(sl.id)} title={sl.label} sub={full ? tr('Full') : tr('{n} of {c} places left', { n: sl.capacity - sl.booked, c: sl.capacity })} />;
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {s.me.addresses.map((a) => {
                const ok = pool.pincodes.length === 0 || pool.pincodes.includes(a.pincode);
                return <Radio key={a.id} id={`acc-addr-${a.id}`} disabled={!ok} checked={addressId === a.id} onSelect={() => setAddressId(a.id)} title={<span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-ink-3" />{a.label}</span>} sub={`${a.name} · ${a.line1}, ${a.line2}, ${a.pincode}${ok ? '' : ` · ${tr('outside this pool’s area')}`}`} />;
              })}
            </div>
          )}
          <p className="px-1 text-[12px] text-ink-3">{tr('Your name, number and address are shared with {s} only now, for delivery.', { s: v?.seller.name ?? '' })}</p>
        </Section>

        <Section title={`3. ${tr('Summary')}`}>
          <Card className="p-4">
            <KV k={tr('Price, all-in')} v={inr(total)} />
            <KV k={tr('Booking already paid')} v={`−${inr(booking)}`} tone="save" />
            <div className="my-1.5 h-px bg-line" />
            <KV k={chosen === 'door' ? tr('Pay at your door') : tr('Pay now')} v={inr(balance)} strong />
            {prof.returnCostPaise > 0 && <p className="mt-2 text-[12px] text-ink-3">{tr('Cancel free until dispatch. After dispatch, return cost {amt}.', { amt: inr(prof.returnCostPaise) })}</p>}
          </Card>
          {err && <p className="rounded-[12px] bg-danger-soft p-3 text-[13px] font-medium text-danger">{err}</p>}
        </Section>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-xl" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <Button full size="lg" loading={busy} onClick={accept}>{chosen === 'door' ? tr('Accept · pay at the door') : chosen ? tr('Accept & pay {amt}', { amt: inr(balance) }) : tr('Accept offer')}</Button>
        <p className="mt-1.5 text-center text-[11.5px] text-ink-3">{tr('Decide by {t}', { t: fmtWhen(pool.acceptBy ?? t, t) })} · <SimTag>{tr('Simulated payment')}</SimTag></p>
      </div>
      <PaymentSheet
        open={!!orderId && !!pendingOrder && pendingOrder.balanceDue > 0}
        onClose={() => { toast(tr('Accepted. Pay any time before dispatch from your order.'), 'info'); nav(`/buyer/order/${orderId}`); }}
        amount={pendingOrder?.balanceDue ?? balance}
        purpose={`${product.short} · ${pendingOrder?.no ?? ''}`}
        allowEmi={chosen === 'emi'}
        onPay={(m) => payOrder(orderId!, m)}
        successText={tr('Paid. The payment company holds it until you give your handover code. {s} delivers by {d}.', { s: v?.seller.name ?? '', d: fmtDay(v?.deliverBy ?? t) })}
        onSuccess={() => nav(`/buyer/order/${orderId}`)}
      />
    </div>
  );
}
