import { ArrowRight, BadgeCheck, Bell, Building2, CalendarDays, Camera, Check, CheckCheck, ChevronRight, FileText, Heart, Mic, MoreVertical, Package, Phone, Play, Plus, ScanLine, Search, Send, Share2, ShieldCheck, Sparkles, Star, Store, Trash2, Truck, Video, Wrench, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useT } from '../lib/i18n';
import { inr } from '../lib/money';
import { DAY, fmtDate, fmtDay, fmtTime, fmtWhen, HOUR } from '../lib/time';
import { committedCount, lowest30, myMember, outsideBest, productOf, qtyLabel, uomOf, waveMeter } from '../sim/engine';
import { myMoneySummary } from '../sim/selectors';
import { addLockerItem, clearChat, discardPending, getState, joinPool, now, payBooking, pushChat, toggleWatch, useNow, useSim } from '../sim/store';
import type { ChatMsg, Lang, State } from '../sim/types';
import { Avatar, Button, Card, Chip, Countdown, EmptyState, inputCls, KV, LinkButton, Progress, Section, Segmented, Sheet, SimTag, useToast } from '../ui/core';
import { ProductArt } from '../ui/ProductArt';
import { Sparkline } from '../ui/visuals';
import { AppBar, PaymentSheet, PoolCard } from './parts';

// =====================================================================================
// Community: Lakeview Heights move-in desk
// =====================================================================================
export function Community() {
  const s = useSim();
  const t = useNow(30000);
  const tr = useT();
  const toast = useToast();
  const c = s.communities.find((x) => x.id === s.me.communityId) ?? s.communities[0];
  const [voted, setVoted] = useState<string[]>([]);
  const pools = c.poolIds.map((id) => s.pools.find((p) => p.id === id)!).filter(Boolean);
  const mine = pools.filter((p) => p.members.some((m) => m.isMe && m.status === 'committed'));
  const bookings = mine.reduce((a, p) => a + (p.members.find((m) => m.isMe && m.status === 'committed')?.bookingPaise ?? 0), 0);
  const outsideTotal = mine.reduce((a, p) => {
    const prod = productOf(s, p.productId);
    const m = p.members.find((x) => x.isMe && x.status === 'committed')!;
    return a + Math.round((outsideBest(prod, s.me.cards).price * m.qtyBase) / uomOf(prod.uom).baseScale);
  }, 0);
  const maxNeed = Math.max(...c.needs.map((n) => n.households));
  const days = Math.max(0, Math.ceil((c.handoverAt - t) / DAY));
  const pooled = new Set(pools.map((p) => productOf(s, p.productId).short.split(' ').slice(-2).join(' ').toLowerCase()));
  return (
    <div className="pb-10">
      <AppBar back="/buyer" title={c.name} sub={`${c.builder} · ${tr('move-in desk')}`} />
      <div className="space-y-6 px-4 pt-3">
        <div className="relative overflow-hidden rounded-[24px] bg-night p-5 text-white">
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-aqua/10" />
          <div className="absolute -bottom-16 right-10 h-40 w-40 rounded-full bg-[#8aa4ff]/10" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-white/55"><Building2 className="h-4 w-4" />{c.builder} × POOL</div>
            <div className="mt-2 text-[26px] font-bold leading-tight">{tr('Handover in {d} days', { d: days })}</div>
            <div className="mt-1 text-[13px] text-white/60">{fmtDate(c.handoverAt)} · {c.area}</div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-[14px] bg-white/[0.07] p-2.5"><div className="num text-[19px] font-bold">{c.homes}</div><div className="text-[11px] text-white/55">{tr('homes')}</div></div>
              <div className="rounded-[14px] bg-white/[0.07] p-2.5"><div className="num text-[19px] font-bold">{c.registered}</div><div className="text-[11px] text-white/55">{tr('on POOL')}</div></div>
              <div className="rounded-[14px] bg-white/[0.07] p-2.5"><div className="num text-[19px] font-bold">{pools.length}</div><div className="text-[11px] text-white/55">{tr('open pools')}</div></div>
            </div>
          </div>
        </div>

        <Section title={tr('Your move-in basket')} sub={tr('Delivered and installed in handover week. Nothing more to pay until your offers come.')}>
          <Card className="p-4">
            {mine.length === 0 ? <p className="text-[13.5px] text-ink-2">{tr('You haven’t joined any move-in pool yet.')}</p> : (
              <div className="space-y-2">
                {mine.map((p) => {
                  const prod = productOf(s, p.productId);
                  const m = p.members.find((x) => x.isMe && x.status === 'committed')!;
                  return <Link key={p.id} to={`/buyer/pool/${p.id}`} className="flex items-center gap-3"><ProductArt art={prod.art} size={40} rounded={12} /><div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold text-ink">{prod.short}</div><div className="text-[12px] text-ink-3">{qtyLabel(m.qtyBase, uomOf(prod.uom))} · {tr('closes')} {fmtWhen(p.closesAt, t)}</div></div><Chip tone="save">{tr('In')}</Chip></Link>;
                })}
                <div className="my-2 h-px bg-line" />
                <KV k={tr('Refundable bookings paid')} v={inr(bookings)} />
                <KV k={tr('Same items outside today')} v={inr(outsideTotal)} hint={tr('Your POOL prices arrive after each pool closes')} />
              </div>
            )}
          </Card>
        </Section>

        <Section title={tr('Pools for this building')}>
          <div className="space-y-3">{pools.map((p) => <PoolCard key={p.id} p={p} />)}</div>
        </Section>

        <Section title={tr('What neighbours need')} sub={tr('From {n} registered households. A pool opens when enough of you ask.', { n: c.registered })}>
          <Card className="space-y-3 p-4">
            {c.needs.map((n) => {
              const has = [...pooled].some((x) => n.category.toLowerCase().includes(x.split(' ').pop() ?? '#'));
              const isVoted = voted.includes(n.category);
              return (
                <div key={n.category}>
                  <div className="flex items-center justify-between text-[13px]"><span className="font-semibold text-ink">{n.category}</span><span className="num text-ink-3">{n.households + (isVoted ? 1 : 0)} {tr('homes')}</span></div>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress className="flex-1" value={(n.households + (isVoted ? 1 : 0)) / maxNeed} tone={has ? 'save' : 'wave'} />
                    {!has && <button onClick={() => { setVoted(isVoted ? voted.filter((v) => v !== n.category) : [...voted, n.category]); if (!isVoted) toast(tr('Interest noted. We’ll tell you when this pool opens.')); }} className={cn('rounded-full border px-2.5 py-1 text-[11.5px] font-semibold', isVoted ? 'border-wave bg-wave-soft text-wave-ink' : 'border-line text-ink-2')}>{isVoted ? tr('Added') : tr('Me too')}</button>}
                  </div>
                </div>
              );
            })}
          </Card>
        </Section>

        <Section title={tr('Handover week plan')}>
          <Card className="divide-y divide-line">
            <PlanRow icon={<CalendarDays className="h-5 w-5" />} t={tr('Until {d}', { d: fmtDay(pools[0]?.closesAt ?? t) })} b={tr('Join pools. Bookings are refundable until the pool closes.')} />
            <PlanRow icon={<Sparkles className="h-5 w-5" />} t={tr('Offers')} b={tr('Personal prices for each item. Accept the ones you want; walk away from the rest.')} />
            <PlanRow icon={<Truck className="h-5 w-5" />} t={tr('Handover days')} b={tr('Deliveries batched by tower with lift slots agreed with the association. Tower B: day 2, 10 AM – 1 PM.')} />
            <PlanRow icon={<Wrench className="h-5 w-5" />} t={tr('Installation')} b={tr('Brand teams install in the same week. Interiors not ready? Postpone up to 45 days, and the seller’s installation hold waits too.')} />
          </Card>
        </Section>
        <Card tone="sim" className="p-3.5 text-[12px] text-ink-2">{tr('Builder name, building and needs are sample data for the demo.')}</Card>
      </div>
    </div>
  );
}
const PlanRow = ({ icon, t, b }: { icon: React.ReactNode; t: string; b: string }) => <div className="flex gap-3 px-4 py-3"><span className="mt-0.5 text-ink-3">{icon}</span><div><div className="text-[14px] font-semibold text-ink">{t}</div><div className="text-[12.5px] text-ink-3">{b}</div></div></div>;

// =====================================================================================
// Warranty Locker: everything you own, with invoices, serials and dates
// =====================================================================================
const CARE: Record<string, { every: string; what: string }> = {
  washer: { every: 'Monthly', what: 'Run a drum-clean cycle and wipe the door seal' },
  waterpurifier: { every: 'Every 6 months', what: 'Filter check by the brand service team' },
  ac: { every: 'Before summer', what: 'Service and filter clean' },
  chimney: { every: 'Every 3 months', what: 'Wash the baffle filters' },
  geyser: { every: 'Yearly', what: 'Descale and check the anode rod' },
  fridge: { every: 'Every 6 months', what: 'Clean the condenser coils' },
  tv: { every: '—', what: 'No routine service needed' },
};
const monthsOf = (w: string) => {
  const m = w.match(/(\d+)\s*(?:yr|year)/i);
  return m ? Number(m[1]) * 12 : 0;
};

export function Locker() {
  const s = useSim();
  const t = useNow(60000);
  const tr = useT();
  const toast = useToast();
  const [scan, setScan] = useState<'closed' | 'scanning' | 'review'>('closed');
  const owned = s.orders.filter((o) => o.isMe && o.handedOverAt && !['returned', 'cancelled_by_buyer', 'cancelled_by_seller'].includes(o.status));
  const coming = s.orders.filter((o) => o.isMe && ['confirmed', 'awaiting_payment'].includes(o.status));
  const extra = s.locker ?? [];
  return (
    <div className="pb-10">
      <AppBar back="/buyer/account" title={tr('Warranty Locker')} right={<button onClick={() => setScan('scanning')} aria-label={tr('Add a purchase')} className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-surface-3"><Plus className="h-5 w-5" /></button>} />
      <div className="space-y-6 px-4 pt-3">
        <div className="rounded-[28px] border border-wave/25 bg-gradient-to-br from-wave-soft to-surface p-4">
          <ShieldCheck className="h-7 w-7 text-wave" />
          <div className="mt-2 text-[17px] font-bold text-ink">{tr('Your home, on record')}</div>
          <p className="mt-1 text-[13px] text-ink-2">{tr('Invoices, serial numbers, installation job numbers and warranty dates, kept automatically for POOL purchases. Add things you bought elsewhere by scanning the invoice.')}</p>
        </div>
        {owned.length + extra.length === 0 && <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title={tr('Nothing here yet')} body={tr('Delivered purchases appear here with their invoice and warranty.')} />}
        {owned.length > 0 && (
          <Section title={tr('Bought on POOL')}>
            <div className="space-y-3">
              {owned.map((o) => {
                const prod = productOf(s, o.productId);
                const months = monthsOf(prod.warranty);
                const ends = o.handedOverAt! + months * 30.44 * DAY;
                const care = CARE[prod.art];
                const left = Math.max(0, ends - t);
                return (
                  <Card key={o.id} className="p-4">
                    <div className="flex gap-3">
                      <ProductArt art={prod.art} size={56} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14.5px] font-bold text-ink">{prod.short}</div>
                        <div className="text-[12.5px] text-ink-3">{tr('Delivered')} {fmtDate(o.handedOverAt!)}</div>
                        {months > 0 && <div className="mt-1.5"><Progress value={left / (months * 30.44 * DAY)} tone="wave" /><div className="mt-1 text-[11.5px] text-ink-3">{tr('Warranty until {d}', { d: fmtDate(ends) })} · {prod.warranty}</div></div>}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                      {o.serial && <div className="rounded-[10px] bg-surface-2 p-2"><div className="text-ink-3">{tr('Serial')}</div><div className="truncate font-mono text-ink">{o.serial}</div></div>}
                      {o.invoiceNo && <Link to={`/buyer/order/${o.id}/invoice`} className="rounded-[10px] bg-surface-2 p-2"><div className="text-ink-3">{tr('GST invoice')}</div><div className="truncate font-mono text-brand">{o.invoiceNo}</div></Link>}
                      {o.installJob && <div className="rounded-[10px] bg-surface-2 p-2"><div className="text-ink-3">{tr('Installation job')}</div><div className="truncate font-mono text-ink">{o.installJob}</div></div>}
                    </div>
                    {care && care.every !== '—' && <div className="mt-3 flex items-center gap-2 rounded-[12px] border border-line px-3 py-2 text-[12.5px] text-ink-2"><Bell className="h-4 w-4 shrink-0 text-wave" /><span className="flex-1"><b className="text-ink">{tr(care.every)}:</b> {tr(care.what)}</span></div>}
                    <div className="mt-3 flex gap-2">
                      <LinkButton size="sm" variant="outline" to={`/buyer/order/${o.id}`}>{tr('Order')}</LinkButton>
                      <Button size="sm" variant="ghost" icon={<Wrench className="h-4 w-4" />} onClick={() => toast(tr('Service request sent to the brand (simulated)'), 'info')}>{tr('Book service')}</Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Section>
        )}
        {extra.length > 0 && (
          <Section title={tr('Added by you')}>
            <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
              {extra.map((x) => <div key={x.id} className="flex items-center gap-3 px-4 py-3"><FileText className="h-5 w-5 text-ink-3" /><div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold text-ink">{x.title}</div><div className="text-[12px] text-ink-3">{x.boughtFrom} · {fmtDate(x.boughtAt)} · {tr('warranty until {d}', { d: fmtDate(x.boughtAt + x.warrantyMonths * 30.44 * DAY) })}</div></div></div>)}
            </div>
          </Section>
        )}
        {coming.length > 0 && (
          <Section title={tr('On the way')}>
            <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
              {coming.map((o) => { const p = productOf(s, o.productId); return <Link key={o.id} to={`/buyer/order/${o.id}`} className="flex items-center gap-3 px-4 py-3"><ProductArt art={p.art} size={40} rounded={12} /><div className="flex-1"><div className="text-[14px] font-semibold text-ink">{p.short}</div><div className="text-[12px] text-ink-3">{tr('Added automatically at handover')}</div></div><ChevronRight className="h-4 w-4 text-ink-3" /></Link>; })}
            </div>
          </Section>
        )}
        <Button variant="outline" full icon={<ScanLine className="h-4 w-4" />} onClick={() => setScan('scanning')}>{tr('Scan an invoice from another store')}</Button>
      </div>
      <Sheet open={scan !== 'closed'} onClose={() => setScan('closed')} title={scan === 'scanning' ? tr('Scan invoice') : tr('Check what we read')} footer={scan === 'review' ? <Button full onClick={() => { addLockerItem({ title: 'AeroLite 1200 mm BLDC ceiling fan', boughtFrom: 'Sri Sai Electricals, Miyapur', boughtAt: t - 200 * DAY, warrantyMonths: 36, serial: 'AL12-88213409' }); setScan('closed'); toast(tr('Added to your locker')); }}>{tr('Save to locker')}</Button> : undefined}>
        {scan === 'scanning' ? (
          <div className="space-y-3">
            <div className="relative grid h-56 place-items-center overflow-hidden rounded-[22px] bg-night">
              <div className="h-40 w-32 rotate-[-3deg] rounded-[6px] bg-white/90 p-2 text-[6px] leading-tight text-[#333]"><div className="font-bold">TAX INVOICE</div><div>Sri Sai Electricals</div><div className="mt-2">AeroLite 1200mm BLDC</div><div>S/N AL12-88213409</div><div className="mt-2">Total ₹3,450</div></div>
              <div className="absolute inset-x-6 top-1/2 h-0.5 animate-pulse bg-aqua" />
            </div>
            <Button full icon={<Camera className="h-4 w-4" />} onClick={() => setScan('review')}>{tr('Capture')}</Button>
            <SimTag>{tr('Camera and reading simulated')}</SimTag>
          </div>
        ) : (
          <div className="space-y-2 text-[13.5px]">
            <KV k={tr('Item')} v="AeroLite 1200 mm BLDC fan" />
            <KV k={tr('Store')} v="Sri Sai Electricals" />
            <KV k={tr('Date')} v={fmtDate(t - 200 * DAY)} />
            <KV k={tr('Serial')} v={<span className="font-mono text-[12px]">AL12-88213409</span>} />
            <KV k={tr('Warranty')} v={tr('3 years (from the brand’s card)')} />
            <p className="pt-1 text-[12px] text-ink-3">{tr('Read from your photo. Fix anything that’s wrong before saving.')}</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}

// =====================================================================================
// Watching: products you follow, with honest price history
// =====================================================================================
export function Watching() {
  const s = useSim();
  const tr = useT();
  const toast = useToast();
  const items = s.watch.map((w) => ({ w, p: productOf(s, w.productId) }));
  return (
    <div className="pb-10">
      <AppBar back="/buyer" title={tr('Watching')} />
      <div className="space-y-3 px-4 pt-3">
        {items.length === 0 ? <EmptyState icon={<Heart className="h-6 w-6" />} title={tr('Not watching anything')} body={tr('Tap the heart on a product to hear when a pool opens near you or the price drops.')} action={<LinkButton to="/buyer/explore" size="sm">{tr('Explore')}</LinkButton>} /> : items.map(({ w, p }) => {
          const best = outsideBest(p, s.me.cards);
          const low = lowest30(p);
          const pool = s.pools.find((x) => x.productId === p.id && x.state === 'open');
          const uom = uomOf(p.uom);
          const toTarget = w.targetPaise ? Math.max(0, best.price - w.targetPaise) : 0;
          return (
            <Card key={p.id} className="p-4">
              <div className="flex gap-3">
                <Link to={`/buyer/product/${p.id}`}><ProductArt art={p.art} size={60} /></Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><Link to={`/buyer/product/${p.id}`} className="text-[14.5px] font-bold leading-snug text-ink">{p.short}</Link><button aria-label={tr('Stop watching')} onClick={() => { toggleWatch(p.id); toast(tr('Removed from watching')); }} className="text-ink-3"><Trash2 className="h-4 w-4" /></button></div>
                  <div className="num mt-0.5 text-[16px] font-bold text-ink">{inr(best.price)}<span className="text-[12px] font-medium text-ink-3"> /{uom.label} · {best.quote.source}</span></div>
                  <div className="text-[12px] text-ink-3">{tr('30-day low')} {inr(low)}</div>
                </div>
              </div>
              <Sparkline values={p.priceHistory} className="mt-2" height={36} />
              <div className="mt-2 flex items-center justify-between gap-2 rounded-[12px] bg-surface-2 px-3 py-2 text-[12.5px]">
                {w.alert === 'price' && w.targetPaise ? <span className="text-ink-2"><Bell className="mr-1 inline h-3.5 w-3.5" />{tr('Alert at {amt}', { amt: inr(w.targetPaise) })} · {toTarget ? tr('{amt} to go', { amt: inr(toTarget) }) : tr('reached!')}</span> : <span className="text-ink-2"><Bell className="mr-1 inline h-3.5 w-3.5" />{tr('Alert when a pool opens nearby')}</span>}
              </div>
              {pool && <Link to={`/buyer/pool/${pool.id}`} className="mt-2 flex items-center justify-between rounded-[12px] border border-brand/25 bg-brand-soft px-3 py-2.5 text-[13px]"><span className="font-semibold text-brand-ink">{tr('Open pool: {n} households', { n: committedCount(pool) })}</span><span className="text-ink-2">{tr('closes in')} <Countdown to={pool.closesAt} compact className="text-[13px]" /></span></Link>}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================================================
// Ask POOL: an assistant that reads your real pools and prepares actions you confirm
// =====================================================================================
const VOICE_SAMPLES: Record<Lang, { transcript: string; english: string }> = {
  te: { transcript: 'ఫ్రిజ్ పూల్‌లో ఒకటి బుక్ చేయి', english: 'Book one in the fridge pool' },
  hi: { transcript: 'फ्रिज वाले पूल में एक बुक कर दो', english: 'Book one in the fridge pool' },
  en: { transcript: 'Book one in the fridge pool', english: 'Book one in the fridge pool' },
};

function think(s: State, q: string): Omit<ChatMsg, 'id' | 'at'> {
  const l = q.toLowerCase();
  const t = now();
  const findProduct = () => s.products.find((p) => [p.short, p.title, p.art, p.category, p.brand ?? ''].some((x) => x && l.includes(x.toLowerCase().split(' ')[0])) || (l.includes('tv') && p.art === 'tv') || (l.includes('fridge') && p.art === 'fridge') || (l.includes('laptop') && p.art === 'laptop'));
  if ((l.includes('join') || l.includes('book')) && !l.includes('order')) {
    const prod = findProduct();
    const pool = prod ? s.pools.find((p) => p.productId === prod.id && p.state === 'open') : undefined;
    if (!prod || !pool) return { from: 'pool', text: prod ? `There’s no open pool for the ${prod.short} right now. I can start one for you; you choose when it closes.` : 'Which product? Try “join the fridge pool”.', tools: ['Searched open pools near Gachibowli'] };
    const mine = myMember(pool);
    if (mine && mine.status === 'committed') return { from: 'pool', text: `You’re already in the ${prod.short} pool with ${qtyLabel(mine.qtyBase, uomOf(prod.uom))}.`, card: { kind: 'pool', id: pool.id }, tools: ['Read your pools'] };
    return { from: 'pool', text: `Found it: ${prod.short}, ${pool.areaLabel}. ${committedCount(pool)} households, closes ${fmtWhen(pool.closesAt, t)}. I’ve prepared 1 unit with a ${inr(pool.bookingPaise)} refundable booking to your home address. Nothing happens until you confirm.`, card: { kind: 'pool', id: pool.id }, action: { kind: 'join', poolId: pool.id, qtyBase: pool.qtyRule.minBase, options: Object.fromEntries((prod.options ?? []).map((o) => [o.key, o.values[0].id])) }, tools: ['Searched open pools near Gachibowli', 'Checked your household limit', 'Read your default address'] };
  }
  if (l.includes('track') || l.includes('order') || l.includes('mixer') || l.includes('deliver')) {
    const o = s.orders.filter((x) => x.isMe && ['confirmed', 'awaiting_payment', 'handed_over'].includes(x.status)).sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!o) return { from: 'pool', text: 'You have no orders in progress.', tools: ['Read your orders'] };
    const prod = productOf(s, o.productId);
    const out = o.steps.some((x) => x.key === 'dispatched');
    return { from: 'pool', text: out ? `${prod.short} is out for delivery, arriving ${o.tracking?.etaText ?? 'today'}. ${o.balanceDue > 0 ? `You chose to pay at the door: ${inr(o.balanceDue)} by UPI or card in the app. ` : ''}Check the box first; your code unlocks after that.` : `${prod.short}: promised by ${fmtWhen(o.promisedBy, t)}.`, card: { kind: 'order', id: o.id }, tools: ['Read your orders', 'Read live tracking'] };
  }
  if (l.includes('wave')) {
    const sum = myMoneySummary(s, t);
    const building = s.orders.filter((o) => o.isMe && ['confirmed', 'handed_over'].includes(o.status)).map((o) => ({ o, w: waveMeter(s, s.pools.find((p) => p.id === o.poolId)!, o.bidId) })).filter((x) => x.w && x.w.bid.slabs.length);
    return { from: 'pool', text: `You’ve received ${inr(sum.waveReceived, { exact: true })} in Wave Drops so far.${building.length ? ` ${building.length} more ${building.length === 1 ? 'pot is' : 'pots are'} building: about ${inr(building[0].w!.perBuyerIfAllSettle)} for your ${productOf(s, building[0].o.productId).short} if everyone completes.` : ''}`, tools: ['Read your Wave Drops', 'Read live pots'] };
  }
  if (l.includes('refund') || l.includes('money back')) {
    const sum = myMoneySummary(s, t);
    return { from: 'pool', text: sum.refundsInProgress ? `${inr(sum.refundsInProgress)} in refunds is on its way to your original payment method. UPI refunds usually land within 30 minutes.` : 'No refunds in progress. All past refunds are credited.', tools: ['Read your money'] };
  }
  if (l.includes('cheap') || l.includes('amazon') || l.includes('flipkart') || l.includes('compare') || l.includes('price')) {
    const prod = findProduct() ?? s.products[0];
    const best = outsideBest(prod, s.me.cards);
    const pool = s.pools.find((p) => p.productId === prod.id && p.state === 'open');
    return { from: 'pool', text: `${prod.short}: best outside for you is ${inr(best.price)} at ${best.quote.source}${best.cardLabel ? ` with your ${best.cardLabel.split(' ·')[0]}` : ''}. The 30-day low was ${inr(lowest30(prod))}. ${pool ? `A pool closes ${fmtWhen(pool.closesAt, t)}; your POOL price is set after that and shown right next to this. If outside is cheaper for you then, I’ll say so.` : 'No pool is open yet.'}`, card: pool ? { kind: 'pool', id: pool.id } : { kind: 'product', id: prod.id }, tools: ['Checked 3 outside prices', 'Applied your HDFC and SBI card offers', 'Read 30-day price history'] };
  }
  const prod = findProduct();
  if (prod) {
    const pool = s.pools.find((p) => p.productId === prod.id && p.state === 'open');
    return { from: 'pool', text: pool ? `There’s a pool for the ${prod.short} in ${pool.areaLabel}: ${committedCount(pool)} households, closes ${fmtWhen(pool.closesAt, t)}.` : `Here’s the ${prod.short}. No pool is open; you can start one.`, card: pool ? { kind: 'pool', id: pool.id } : { kind: 'product', id: prod.id }, tools: ['Searched products and pools'] };
  }
  return { from: 'pool', text: 'I can find pools, compare prices with your cards, join a pool for you to confirm, track orders, and explain refunds or the Wave Drop.', tools: [] };
}

export function Assistant() {
  const s = useSim();
  const tr = useT();
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [voice, setVoice] = useState(params.get('voice') === '1');
  const [paying, setPaying] = useState<{ memberId: string; poolId: string; amount: number } | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const msgs = s.chats.assistant;
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [msgs.length, typing]);
  const ask = (q: string, v?: ChatMsg['voice']) => {
    if (!q.trim()) return;
    pushChat('assistant', { from: 'me', text: q, voice: v });
    setText('');
    setTyping(true);
    setTimeout(() => {
      pushChat('assistant', think(getState(), q)); // latest state at reply time
      setTyping(false);
    }, 1100);
  };
  const confirmJoin = (a: NonNullable<ChatMsg['action']>) => {
    const r = joinPool(a.poolId, { qtyBase: a.qtyBase, options: a.options, channel: 'assistant' });
    if (!r.ok) return toast(r.error, 'err');
    const pool = s.pools.find((p) => p.id === a.poolId)!;
    setPaying({ memberId: r.value, poolId: a.poolId, amount: pool.bookingPaise });
  };
  const suggestions = [tr('Is the 55″ TV cheaper on Amazon for me?'), tr('Track my mixer'), tr('Join the fridge pool'), tr('How much Wave Drop do I have?')];
  return (
    <div className="flex min-h-full flex-col">
      <AppBar back="/buyer" title={tr('Ask POOL')} sub={tr('Reads your pools and orders · acts only when you confirm')} right={msgs.length ? <button onClick={() => clearChat('assistant')} className="px-3 text-[13px] font-semibold text-ink-3">{tr('Clear')}</button> : undefined} />
      <div className="flex-1 space-y-3 px-4 py-4">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-[28px] bg-gradient-to-br from-brand to-wave text-white shadow-[var(--shadow-pop)]"><Sparkles className="h-8 w-8" /></div>
            <div className="mt-3 text-[18px] font-bold text-ink">{tr('What do you want to buy?')}</div>
            <p className="mt-1 max-w-[290px] text-[13px] text-ink-3">{tr('Ask in English, Telugu or Hindi. I can compare prices with your own cards and prepare a join, but you always confirm and pay yourself.')}</p>
            <div className="mt-4 w-full space-y-2">{suggestions.map((q) => <button key={q} onClick={() => ask(q)} className="flex w-full items-center justify-between rounded-[14px] border border-line bg-surface px-3.5 py-3 text-left text-[13.5px] font-semibold text-ink">{q}<ArrowRight className="h-4 w-4 text-ink-3" /></button>)}</div>
          </div>
        )}
        {msgs.map((m) => <AssistantMsg key={m.id} m={m} onConfirm={confirmJoin} onOpen={(href) => nav(href)} />)}
        {typing && <div className="flex items-center gap-2 text-[12.5px] text-ink-3"><span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${i * 120}ms` }} />)}</span>{tr('Looking at your pools…')}</div>}
        <div ref={end} />
      </div>
      <div className="sticky bottom-0 border-t border-line bg-surface px-3 py-2.5" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        {msgs.length > 0 && <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">{suggestions.map((q) => <button key={q} onClick={() => ask(q)} className="whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold text-ink-2">{q}</button>)}</div>}
        <div className="flex gap-2">
          <Button variant="secondary" className="h-11 w-11 shrink-0 px-0" aria-label={tr('Speak')} onClick={() => setVoice(true)}><Mic className="h-5 w-5" /></Button>
          <input className={cn(inputCls, 'h-11')} placeholder={tr('Ask anything about buying')} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask(text)} />
          <Button className="h-11 w-11 shrink-0 px-0" aria-label={tr('Send')} onClick={() => ask(text)}><Send className="h-4.5 w-4.5" /></Button>
        </div>
        <div className="mt-1.5 text-center"><SimTag>{tr('Assistant simulated with rules, using your demo data')}</SimTag></div>
      </div>
      <VoiceSheet open={voice} onClose={() => setVoice(false)} onDone={(lang, secs) => { setVoice(false); const v = VOICE_SAMPLES[lang]; ask(v.english, { seconds: secs, transcript: v.transcript, lang }); }} />
      <PaymentSheet
        open={!!paying}
        onClose={() => { if (paying) discardPending(paying.memberId); setPaying(null); }}
        amount={paying?.amount ?? 0}
        purpose={tr('Refundable booking · prepared by Ask POOL')}
        onPay={(m) => payBooking(paying!.memberId, m)}
        successText={tr('You’re in. I’ll tell you when your personal offer is ready.')}
        onSuccess={() => { const p = paying!; setPaying(null); pushChat('assistant', { from: 'pool', text: tr('Done. You’re in the pool and your booking is confirmed. I’ll message you when your personal price is ready.'), card: { kind: 'pool', id: p.poolId }, tools: ['Booking confirmed by the payment company'] }); }}
      />
    </div>
  );
}

function AssistantMsg({ m, onConfirm, onOpen }: { m: ChatMsg; onConfirm: (a: NonNullable<ChatMsg['action']>) => void; onOpen: (href: string) => void }) {
  const s = useSim();
  const tr = useT();
  const [open, setOpen] = useState(false);
  if (m.from === 'me') {
    return (
      <div className="flex flex-col items-end">
        <div className="max-w-[85%] rounded-[16px] rounded-br-[6px] bg-brand px-3.5 py-2.5 text-[14px] text-on-brand">
          {m.voice ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2"><Play className="h-4 w-4" /><span className="flex h-4 items-end gap-[2px]">{Array.from({ length: 18 }).map((_, i) => <span key={i} className="w-[2px] rounded-full bg-white/80" style={{ height: `${30 + ((i * 37) % 70)}%` }} />)}</span><span className="text-[11.5px] opacity-80">0:0{m.voice.seconds}</span></div>
              <div className="text-[14px]">{m.voice.transcript}</div>
              {m.voice.lang !== 'en' && <div className="text-[11.5px] opacity-75">“{m.text}”</div>}
            </div>
          ) : m.text}
        </div>
      </div>
    );
  }
  const pool = m.card?.kind === 'pool' ? s.pools.find((p) => p.id === m.card!.id) : undefined;
  const order = m.card?.kind === 'order' ? s.orders.find((o) => o.id === m.card!.id) : undefined;
  const product = m.card?.kind === 'product' ? s.products.find((p) => p.id === m.card!.id) : undefined;
  const joined = m.action && pool ? pool.members.some((x) => x.isMe && x.status === 'committed') : false;
  return (
    <div className="flex gap-2">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-wave text-white"><Sparkles className="h-3.5 w-3.5" /></div>
      <div className="min-w-0 max-w-[88%] space-y-2">
        {m.tools && m.tools.length > 0 && (
          <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-3"><Search className="h-3.5 w-3.5" />{tr('{n} steps', { n: m.tools.length })} <ChevronRight className={cn('h-3 w-3 transition', open && 'rotate-90')} /></button>
        )}
        {open && <ul className="space-y-1 border-l-2 border-line pl-3 text-[12px] text-ink-3">{m.tools!.map((x) => <li key={x} className="flex items-center gap-1.5"><Check className="h-3 w-3 text-save" />{tr(x)}</li>)}</ul>}
        <div className="rounded-[16px] rounded-tl-[6px] bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-ink shadow-sm ring-1 ring-line">{tr(m.text)}</div>
        {pool && <PoolCard p={pool} compact />}
        {order && <button onClick={() => onOpen(`/buyer/order/${order.id}`)} className="flex w-full items-center gap-3 rounded-[16px] border border-line bg-surface p-3 text-left"><ProductArt art={productOf(s, order.productId).art} size={44} /><div className="flex-1"><div className="text-[14px] font-semibold text-ink">{productOf(s, order.productId).short}</div><div className="text-[12px] text-ink-3">{order.no}</div></div><ChevronRight className="h-4 w-4 text-ink-3" /></button>}
        {product && <button onClick={() => onOpen(`/buyer/product/${product.id}`)} className="flex w-full items-center gap-3 rounded-[16px] border border-line bg-surface p-3 text-left"><ProductArt art={product.art} size={44} /><div className="flex-1 text-[14px] font-semibold text-ink">{product.short}</div><ChevronRight className="h-4 w-4 text-ink-3" /></button>}
        {m.action && pool && (
          <div className="rounded-[16px] border-2 border-dashed border-brand/40 bg-brand-soft/50 p-3">
            <div className="text-[11.5px] font-bold uppercase tracking-[0.05em] text-brand-ink">{tr('Prepared for you')}</div>
            <div className="mt-1 text-[13.5px] text-ink">{tr('Join with {q} · booking {amt} (refundable)', { q: qtyLabel(m.action.qtyBase, uomOf(productOf(s, pool.productId).uom)), amt: inr(pool.bookingPaise) })}</div>
            {joined ? <div className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-save"><Check className="h-4 w-4" />{tr('Done')}</div> : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={() => onOpen(`/buyer/join/${pool.id}`)}>{tr('Change details')}</Button>
                <Button size="sm" onClick={() => onConfirm(m.action!)}>{tr('Confirm & pay')}</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function VoiceSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (lang: Lang, secs: number) => void }) {
  const s = useSim();
  const tr = useT();
  const [lang, setLang] = useState<Lang>(s.prefs.voiceLang ?? s.prefs.lang);
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!open) return;
    setSecs(0);
    const i = setInterval(() => setSecs((x) => Math.min(9, x + 1)), 1000);
    return () => clearInterval(i);
  }, [open]);
  const sample = VOICE_SAMPLES[lang];
  return (
    <Sheet open={open} onClose={onClose} title={tr('Listening…')}>
      <div className="flex flex-col items-center pb-2">
        <Segmented value={lang} onChange={setLang} options={[{ value: 'te', label: 'తెలుగు' }, { value: 'hi', label: 'हिन्दी' }, { value: 'en', label: 'English' }]} className="w-full" />
        <div className="relative my-6 grid h-28 w-28 place-items-center">
          <span className="pulse-ring absolute inset-0 rounded-full border-4 border-brand/40" />
          <span className="pulse-ring absolute inset-3 rounded-full border-4 border-wave/40" style={{ animationDelay: '300ms' }} />
          <button onClick={() => onDone(lang, Math.max(2, secs))} className="relative grid h-20 w-20 place-items-center rounded-full bg-brand text-white shadow-[var(--shadow-pop)]" aria-label={tr('Stop and send')}><Mic className="h-9 w-9" /></button>
        </div>
        <div className="flex h-8 items-end gap-1">{Array.from({ length: 24 }).map((_, i) => <span key={i} className="w-1 animate-pulse rounded-full bg-brand/60" style={{ height: `${20 + ((i * 53 + secs * 17) % 80)}%`, animationDelay: `${i * 40}ms` }} />)}</div>
        <div className="mt-4 min-h-[44px] text-center text-[16px] font-semibold text-ink">{secs > 1 ? sample.transcript : <span className="text-ink-3">{tr('Say what you want to buy…')}</span>}</div>
        <p className="mt-1 text-[12px] text-ink-3">{tr('Tap the mic to send')} · <SimTag>{tr('Voice simulated')}</SimTag></p>
      </div>
    </Sheet>
  );
}

// =====================================================================================
// WhatsApp: a neighbour without the app joins the Sunday mutton pool by Telugu voice note
// =====================================================================================
const WA_NAME = 'Saraswati K.';
export function WhatsAppDemo() {
  const s = useSim();
  const tr = useT();
  const nav = useNavigate();
  const t = useNow(30000);
  const pool = s.pools.find((p) => p.id === 'pool-mutton');
  const joined = pool?.members.find((m) => m.name === WA_NAME && m.channel === 'whatsapp' && m.status === 'committed');
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(joined ? 4 : 0);
  const [gloss, setGloss] = useState(true);
  const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [step]);
  const open = !!pool && pool.state === 'open' && t < pool.closesAt;
  const sendVoice = () => {
    setStep(1);
    setTimeout(() => setStep(2), 1400);
  };
  const pay = () => {
    setErr('');
    setStep(3);
    setTimeout(() => {
      const j = joinPool('pool-mutton', { qtyBase: 2000, options: { cut: 'curry' }, channel: 'whatsapp', asName: WA_NAME });
      if (!j.ok) { setErr(j.error); setStep(2); return; }
      const r = payBooking(j.value, 'UPI · saraswati.k@oksbi');
      if (!r.ok) { discardPending(j.value); setErr(r.error); setStep(2); return; }
      setStep(4);
    }, 1800);
  };
  const count = pool ? committedCount(pool) : 0;
  return (
    <div className="flex min-h-full flex-col bg-[#efeae2] dark:bg-[#0b141a]">
      <div className="sticky top-0 z-30 flex items-center gap-2 bg-[#008069] px-2 py-2 text-white dark:bg-[#1f2c34]">
        <button aria-label={tr('Back')} onClick={() => nav('/buyer/help')} className="grid h-9 w-9 place-items-center rounded-full"><ChevronRight className="h-5 w-5 rotate-180" /></button>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-[13px] font-black text-[#2b4bf2]">P</div>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-1 text-[15px] font-semibold">POOL <BadgeCheck className="h-4 w-4 fill-[#25d366] text-white" /></div><div className="text-[11.5px] text-white/75">{tr('Business account')}</div></div>
        <Video className="h-5 w-5 opacity-80" /><Phone className="ml-3 h-5 w-5 opacity-80" /><MoreVertical className="ml-2 h-5 w-5 opacity-80" />
      </div>
      <div className="mx-auto my-2 rounded-[8px] bg-[#fff3c4] px-3 py-1.5 text-center text-[11.5px] text-[#54656f] dark:bg-[#1f2c34] dark:text-[#8696a0]">{tr('{n}’s phone, with no apps installed. Everything works in WhatsApp.', { n: WA_NAME })} <SimTag className="ml-1">{tr('Simulated')}</SimTag></div>
      <div className="flex-1 space-y-2 px-3 py-2">
        <Bubble side="in" time={fmtTime(t - 26 * HOUR)}>
          <div className="text-[13.5px]">నమస్కారం! ఈ వారం ఆదివారం మటన్ పూల్ తెరిచి ఉంది. వాయిస్ నోట్‌లో ఎంత కావాలో చెప్పండి.</div>
          {gloss && <Gloss>Namaskaram! This week’s Sunday mutton pool is open. Tell us how much you need in a voice note.</Gloss>}
        </Bubble>
        {step >= 1 && (
          <Bubble side="out" time={fmtTime(t)}>
            <div className="flex items-center gap-2 py-1"><Avatar name={WA_NAME} size={30} tone="wave" /><Play className="h-5 w-5 text-[#54656f]" /><span className="flex h-5 flex-1 items-end gap-[2px]">{Array.from({ length: 26 }).map((_, i) => <span key={i} className="w-[2px] rounded-full bg-[#8fb3a6]" style={{ height: `${25 + ((i * 41) % 75)}%` }} />)}</span><span className="text-[11px] text-[#667781]">0:04</span></div>
          </Bubble>
        )}
        {step >= 2 && (
          <Bubble side="in" time={fmtTime(t)}>
            <div className="mb-1.5 rounded-[6px] border-l-4 border-[#06cf9c] bg-[#f0f2f5] px-2 py-1 text-[12px] text-[#54656f] dark:bg-[#1d282f] dark:text-[#8696a0]">🎤 “రెండు కిలోల మటన్, కర్రీ కట్, ఆదివారం కావాలి”</div>
            <div className="text-[13.5px]">సరే! ఆదివారం మటన్ పూల్: 2 కిలోలు, కర్రీ కట్. బుకింగ్ ₹100 (పూర్తిగా వాపసు వస్తుంది). ధర శుక్రవారం రాత్రి 8 తర్వాత పంపిస్తాం.</div>
            {gloss && <Gloss>Got it: Sunday mutton pool, 2 kg curry cut. Booking ₹100, fully refundable. We’ll send your price after 8 PM Friday.</Gloss>}
            {open ? (
              step === 2 && (
                <div className="mt-2 grid grid-cols-1 gap-1 border-t border-[#e9edef] pt-1.5 dark:border-[#2a3942]">
                  <button onClick={pay} className="py-1.5 text-center text-[14px] font-semibold text-[#008069] dark:text-[#00a884]">₹100 UPI తో కట్టండి</button>
                  <button onClick={() => setStep(0)} className="py-1.5 text-center text-[14px] font-semibold text-[#008069] dark:text-[#00a884]">మార్చండి</button>
                </div>
              )
            ) : <div className="mt-2 text-[12.5px] text-[#d14b4b]">{tr('This week’s pool has closed. The next one opens on Saturday.')}</div>}
          </Bubble>
        )}
        {step === 3 && <Bubble side="in" time={fmtTime(t)}><div className="flex items-center gap-2 text-[13.5px]"><span className="spin h-4 w-4 rounded-full border-2 border-[#008069] border-t-transparent" />UPI request sent to saraswati.k@oksbi…</div></Bubble>}
        {step === 4 && (
          <>
            <Bubble side="in" time={fmtTime(joined?.bookingPaidAt ?? t)}>
              <div className="text-[13.5px]">✅ మీరు పూల్‌లో ఉన్నారు! ₹100 అందింది.</div>
              {gloss && <Gloss>You’re in! ₹100 received.</Gloss>}
              <div className="mt-1.5 rounded-[8px] bg-[#f0f2f5] p-2 text-[12px] text-[#3b4a54] dark:bg-[#1d282f] dark:text-[#d1d7db]">{tr('Sunday mutton · Kondapur · 2 kg curry cut')}<br />{tr('{n} households in this week’s pool', { n: count })}<br />{tr('Reply STOP before Friday 8 PM to leave with a full refund')}</div>
            </Bubble>
            <div className="mx-auto max-w-[300px] rounded-[10px] bg-surface/90 p-3 text-center text-[12px] text-ink-2 shadow-sm">{tr('This booking now counts in the same pool as app users: one household, real money, refundable. Sellers see one more committed buyer.')} <Link to="/buyer/pool/pool-mutton" className="font-semibold text-brand">{tr('See the pool')}</Link></div>
          </>
        )}
        {err && <div className="mx-auto max-w-[300px] rounded-[10px] bg-danger-soft p-3 text-center text-[12.5px] text-danger">{err}</div>}
        <div ref={end} />
      </div>
      <div className="sticky bottom-0 flex items-center gap-2 bg-[#efeae2] px-2 py-2 dark:bg-[#0b141a]" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        <div className="flex h-11 flex-1 items-center rounded-full bg-white px-4 text-[14px] text-[#8696a0] dark:bg-[#1f2c34]">{step === 0 ? tr('Hold the mic to record') : tr('Message')}</div>
        <button onClick={step === 0 ? sendVoice : undefined} disabled={step !== 0} aria-label={tr('Send voice note')} className={cn('grid h-11 w-11 place-items-center rounded-full bg-[#00a884] text-white', step === 0 && 'pulse-ring')}><Mic className="h-5 w-5" /></button>
      </div>
      <div className="flex items-center justify-center gap-2 bg-surface px-3 py-2 text-[12px] text-ink-2">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={gloss} onChange={(e) => setGloss(e.target.checked)} className="accent-[var(--brand)]" />{tr('Show English')}</label>
      </div>
    </div>
  );
}
const Bubble = ({ side, time, children }: { side: 'in' | 'out'; time: string; children: React.ReactNode }) => (
  <div className={cn('flex', side === 'out' ? 'justify-end' : 'justify-start')}>
    <div className={cn('max-w-[85%] rounded-[10px] px-2.5 pb-1 pt-1.5 text-[#111b21] shadow-sm dark:text-[#e9edef]', side === 'out' ? 'rounded-tr-[2px] bg-[#d9fdd3] dark:bg-[#005c4b]' : 'rounded-tl-[2px] bg-white dark:bg-[#1f2c34]')}>
      {children}
      <div className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-[#667781] dark:text-[#8696a0]">{time}{side === 'out' && <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />}</div>
    </div>
  </div>
);
const Gloss = ({ children }: { children: React.ReactNode }) => <div className="mt-1 border-t border-dashed border-[#d1d7db] pt-1 text-[11.5px] italic text-[#667781] dark:border-[#2a3942] dark:text-[#8696a0]">{children}</div>;

// =====================================================================================
// Public seller scorecard
// =====================================================================================
export function SellerProfile() {
  const { id } = useParams();
  const s = useSim();
  const tr = useT();
  const seller = s.sellers.find((x) => x.id === id);
  const reviews = useMemo(() => s.orders.filter((o) => o.sellerId === id && o.rating).sort((a, b) => b.rating!.at - a.rating!.at), [s.orders, id]);
  if (!seller) return <><AppBar back={-1 as unknown as true} title={tr('Seller')} /><div className="p-4"><EmptyState title={tr('Seller not found')} /></div></>;
  const won = s.pools.filter((p) => p.award?.assignments.some((a) => a.sellerId === seller.id));
  const pct = (bps: number) => `${Math.round(bps / 100)}%`;
  const dist = [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => r.rating!.stars === n).length);
  const kind = { dealer: tr('Authorised dealer'), chain: tr('Retail chain'), brand_desk: tr('Brand sales desk'), shop: tr('Local shop'), service: tr('Service provider'), distributor: tr('Distributor') }[seller.kind];
  return (
    <div className="pb-10">
      <AppBar back={true} title={seller.name} sub={kind} />
      <div className="space-y-5 px-4 pt-3">
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 place-items-center rounded-[20px] bg-brand-soft text-brand"><Store className="h-8 w-8" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[18px] font-bold text-ink">{seller.name}{seller.verified && <BadgeCheck className="h-5 w-5 text-brand" />}</div>
            <div className="text-[13px] text-ink-3">{seller.area}, {seller.city} · {tr('on POOL since')} {seller.since}</div>
            <div className="mt-1 flex gap-1.5">{seller.verified ? <Chip tone="save">{tr('KYB verified')}</Chip> : <Chip tone="warn">{tr('Not verified')}</Chip>}{seller.settledOrders === 0 && <Chip tone="warn">{tr('New seller')}</Chip>}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Score big={seller.rating ? seller.rating.toFixed(1) : '—'} l={tr('{n} verified ratings', { n: seller.ratingCount })} icon={<Star className="h-4 w-4 fill-warn text-warn" />} />
          <Score big={String(seller.settledOrders)} l={tr('completed orders')} />
          <Score big={pct(seller.onTimeBps)} l={tr('delivered on time')} />
          <Score big={pct(seller.issuesResolvedBps)} l={tr('issues resolved')} />
          <Score big={pct(seller.cancelBps)} l={tr('orders cancelled by seller')} />
          <Score big={String(won.length)} l={tr('pools won on POOL')} />
        </div>
        <Card className="p-4 text-[12.5px] text-ink-2">{tr('Every number here comes from completed POOL orders. Ratings can only be left by buyers who received the product.')}</Card>
        <Section title={tr('Terms')}>
          <Card className="divide-y divide-line">
            <div className="px-4 py-3"><div className="text-[12px] text-ink-3">{tr('Returns')}</div><div className="text-[13.5px] text-ink">{seller.returnTerms}</div></div>
            <div className="px-4 py-3"><div className="text-[12px] text-ink-3">{tr('Hours')}</div><div className="text-[13.5px] text-ink">{seller.hours}</div></div>
            <div className="px-4 py-3"><div className="text-[12px] text-ink-3">GSTIN</div><div className="font-mono text-[13px] text-ink">{seller.gstin} · {seller.state}</div></div>
            <div className="px-4 py-3"><div className="text-[12px] text-ink-3">{tr('Security deposit with POOL')}</div><div className="text-[13.5px] text-ink">{inr(seller.depositPaise)} · {tr('used to make buyers whole if the seller defaults')}</div></div>
          </Card>
        </Section>
        {reviews.length > 0 && (
          <Section title={tr('Recent ratings')}>
            <Card className="p-4">
              {dist.map((n, i) => <div key={i} className="flex items-center gap-2 text-[12px]"><span className="w-3 text-ink-3">{5 - i}</span><Progress className="flex-1" value={reviews.length ? n / reviews.length : 0} tone="warn" height={5} /><span className="num w-6 text-right text-ink-3">{n}</span></div>)}
            </Card>
            {reviews.slice(0, 5).map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-center justify-between"><div className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn('h-3.5 w-3.5', n <= o.rating!.stars ? 'fill-warn text-warn' : 'text-line-2')} />)}</div><span className="text-[11.5px] text-ink-3">{o.buyerName} · {fmtDate(o.rating!.at)}</span></div>
                {o.rating!.text && <p className="mt-1.5 text-[13px] text-ink-2">{o.rating!.text}</p>}
                <div className="mt-1.5 flex items-center gap-1 text-[11.5px] font-semibold text-save"><Check className="h-3.5 w-3.5" />{tr('Verified purchase')} · {productOf(s, o.productId).short}</div>
              </Card>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}
const Score = ({ big, l, icon }: { big: string; l: string; icon?: React.ReactNode }) => <div className="rounded-[16px] border border-line bg-surface p-3"><div className="num flex items-center gap-1 text-[20px] font-bold text-ink">{icon}{big}</div><div className="text-[11.5px] leading-tight text-ink-3">{l}</div></div>;

// =====================================================================================
// Share target: from any shopping app, Share → POOL
// =====================================================================================
export function ShareDemo() {
  const tr = useT();
  const nav = useNavigate();
  const [sheet, setSheet] = useState(false);
  return (
    <div className="flex min-h-full flex-col bg-[#f3f3f3] dark:bg-[#121212]">
      <div className="flex items-center gap-2 bg-[#131921] px-3 py-3 text-white">
        <button aria-label={tr('Back')} onClick={() => nav('/buyer')} className="grid h-8 w-8 place-items-center"><X className="h-5 w-5" /></button>
        <div className="flex h-9 flex-1 items-center gap-2 rounded-[8px] bg-white px-3 text-[13px] text-[#555]"><Search className="h-4 w-4" />frostline 253 l fridge</div>
      </div>
      <div className="px-3 py-1 text-center text-[11px] text-ink-3">{tr('Another shopping app (illustration)')} · <SimTag>{tr('Simulated')}</SimTag></div>
      <div className="flex-1 space-y-3 bg-white p-4 dark:bg-[#1b1b1b]">
        <div className="grid h-56 place-items-center rounded-[12px] bg-[#f7f7f7] dark:bg-[#232323]"><ProductArtFridge /></div>
        <div className="text-[15px] text-[#0f1111] dark:text-[#eee]">FrostLine 253 L 3 Star Frost Free Double Door Refrigerator (FL253, Steel Grey)</div>
        <div className="text-[24px] font-medium text-[#0f1111] dark:text-[#eee]">₹26,490</div>
        <div className="text-[12.5px] text-[#565959]">{tr('Delivery in 3 days · Installation extra')}</div>
        <button onClick={() => setSheet(true)} className="flex w-full items-center justify-center gap-2 rounded-full border border-[#d5d9d9] py-2.5 text-[14px] text-[#0f1111] dark:text-[#eee]"><Share2 className="h-4 w-4" />{tr('Share')}</button>
        <div className="rounded-[12px] border border-dashed border-brand/40 bg-brand-soft p-3 text-[12.5px] text-ink-2">{tr('Tap Share, then POOL. POOL reads only the link you share; it never opens or scrapes the store’s page.')}</div>
      </div>
      <Sheet open={sheet} onClose={() => setSheet(false)} title={tr('Share')}>
        <div className="grid grid-cols-4 gap-3 pb-2">
          {[
            { n: 'POOL', c: 'bg-gradient-to-br from-brand to-wave', on: () => nav('/buyer/find?link=fridge'), hl: true },
            { n: 'WhatsApp', c: 'bg-[#25d366]' },
            { n: 'Messages', c: 'bg-[#1a73e8]' },
            { n: 'Gmail', c: 'bg-[#ea4335]' },
            { n: 'Copy', c: 'bg-surface-3' },
            { n: 'Nearby', c: 'bg-[#5f6368]' },
            { n: 'Keep', c: 'bg-[#fbbc04]' },
            { n: 'More', c: 'bg-surface-3' },
          ].map((x) => (
            <button key={x.n} onClick={x.on} className="flex flex-col items-center gap-1.5">
              <span className={cn('grid h-14 w-14 place-items-center rounded-[22px] text-[13px] font-black text-white', x.c, x.hl && 'ring-4 ring-brand/30')}>{x.n === 'POOL' ? 'P' : x.n === 'Copy' || x.n === 'More' ? <Plus className="h-5 w-5 text-ink-2" /> : x.n[0]}</span>
              <span className={cn('text-[12px]', x.hl ? 'font-bold text-ink' : 'text-ink-3')}>{x.n}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
function ProductArtFridge() {
  const s = useSim();
  const p = s.products.find((x) => x.art === 'fridge');
  return p ? <ProductArt art="fridge" size={180} rounded={24} /> : <Package className="h-16 w-16 text-ink-3" />;
}

