import { AlertTriangle, ArrowRight, BadgeCheck, Building2, CalendarDays, ChevronRight, Clock, Eye, Gauge, Lock, MapPin, MessageSquare, Package, Radar, Repeat, ShieldCheck, Star, Truck, Users, Waves } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { cn } from '../lib/cn';
import { inr } from '../lib/money';
import { DAY, fmtDate, fmtDay, fmtDayTime, fmtWhen, startOfDayIST } from '../lib/time';
import { committedCount, committedUnits, latestBids, outsideBest, poolDeliverBy, productOf, profileOf, qtyLabel, sellerOf, uomOf, waveMeter } from '../sim/engine';
import { sellerDemandFor, sellerPayouts } from '../sim/selectors';
import { useNow, useSim } from '../sim/store';
import type { Pool } from '../sim/types';
import { Button, Card, Chip, Countdown, EmptyState, ErrorState, KV, LinkButton, ListSkeleton, Progress, Section, SimTag } from '../ui/core';
import { ProductArt } from '../ui/ProductArt';
import { PIN_AREA, SealedVault, WaveMeter } from '../ui/visuals';
import { AppBar, BellButton, useLoadState } from '../buyer/parts';

const sellerTasks = (s: ReturnType<typeof useSim>, me: string, t: number) => {
  const mine = s.orders.filter((o) => o.sellerId === me);
  const toConfirm = mine.filter((o) => o.status === 'confirmed' && !o.steps.some((x) => x.key === 'seller_confirmed'));
  const toDispatch = mine.filter((o) => o.status === 'confirmed' && o.steps.some((x) => x.key === 'seller_confirmed') && !o.steps.some((x) => x.key === 'dispatched' || x.key === 'ready_for_pickup'));
  const atDoor = mine.filter((o) => o.status === 'confirmed' && o.steps.some((x) => x.key === 'dispatched' || x.key === 'ready_for_pickup'));
  const toInstall = mine.filter((o) => o.status === 'handed_over' && profileOf(s, s.pools.find((p) => p.id === o.poolId)!.profileId).steps.some((x) => x.afterHandover && !o.steps.some((y) => y.key === x.key)));
  const tickets = s.tickets.filter((x) => x.sellerId === me && x.status === 'open');
  const closing = s.pools.filter((p) => p.state === 'open' && p.invitedSellers.includes(me) && !p.bids.some((b) => b.sellerId === me) && p.closesAt - t < 3 * DAY);
  return { toConfirm, toDispatch, atDoor, toInstall, tickets, closing };
};

// ---------------------------------------------------------------- Today
export function Today() {
  const s = useSim();
  const t = useNow(30000);
  const load = useLoadState('seller-today');
  const me = sellerOf(s, s.sellerMeId);
  const k = sellerTasks(s, me.id, t);
  const pay = sellerPayouts(s, me.id, t);
  const hour = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(t));
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const live = s.pools.filter((p) => (p.state === 'fulfilment' || p.state === 'offers') && p.bids.some((b) => b.sellerId === me.id && b.slabs.length) && s.orders.some((o) => o.poolId === p.id && o.sellerId === me.id));
  const demand = sellerDemandFor(s, me.id).slice(0, 3);
  return (
    <div className="pb-6">
      <div className="aurora grain relative overflow-hidden px-4 pb-6 pt-3 text-white">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-semibold"><BadgeCheck className="h-4 w-4 text-[#7ff0e6]" />{me.name}</div>
          <BellButton to="/seller/notifications" />
        </div>
        <div className="relative z-10 mt-4">
          <div className="text-[14px] text-white/60">{greet}, {me.owner.split(' ').slice(-2).join(' ')}</div>
          <div className="display mt-1 text-[30px]">{k.toConfirm.length + k.toDispatch.length + k.atDoor.length + k.tickets.length} things need you today</div>
        </div>
        <div className="relative z-10 mt-4 grid grid-cols-4 gap-2">
          {[[k.toConfirm.length, 'Confirm', '/seller/orders?tab=confirm'], [k.toDispatch.length, 'Dispatch', '/seller/orders?tab=dispatch'], [k.atDoor.length, 'At the door', '/seller/orders?tab=door'], [k.tickets.length, 'Issues', '/seller/orders?tab=issues']].map(([n, l, to]) => (
            <Link key={l as string} to={to as string} className="rounded-[14px] p-2.5 text-center glass"><div className="num text-[22px] font-bold">{n as number}</div><div className="text-[11px] text-white/60">{l as string}</div></Link>
          ))}
        </div>
      </div>
      {load.state === 'loading' ? <div className="p-4"><ListSkeleton rows={3} /></div> : load.state === 'error' ? <div className="p-4"><ErrorState onRetry={load.retry} /></div> : (
        <div className="space-y-6 px-4 pt-4">
          {/* Deadlines */}
          <Section title="Needs you now">
            <div className="space-y-2">
              {k.tickets.map((tk) => {
                const o = s.orders.find((x) => x.id === tk.orderId)!;
                return <TaskRow key={tk.id} tone="danger" icon={<MessageSquare className="h-5 w-5" />} title={`Reply to ${tk.no} · ${tk.buyerName}`} sub={`${tk.description.slice(0, 60)}… · POOL steps in after ${fmtWhen(tk.sellerDueBy, t)}`} to={`/seller/order/${o.id}`} at={tk.sellerDueBy} />;
              })}
              {k.toConfirm.length > 0 && <TaskRow tone="warn" icon={<Package className="h-5 w-5" />} title={`Confirm ${k.toConfirm.length} new ${k.toConfirm.length === 1 ? 'order' : 'orders'}`} sub="Buyers accepted your offer. Confirm to lock the delivery date." to="/seller/orders?tab=confirm" />}
              {k.toDispatch.length > 0 && <TaskRow tone="brand" icon={<Truck className="h-5 w-5" />} title={`Dispatch ${k.toDispatch.length} ${k.toDispatch.length === 1 ? 'order' : 'orders'}`} sub={`Earliest promised ${fmtWhen(Math.min(...k.toDispatch.map((o) => o.promisedBy)), t)}. Add a dispatch photo.`} to="/seller/orders?tab=dispatch" />}
              {k.atDoor.length > 0 && <TaskRow tone="wave" icon={<ShieldCheck className="h-5 w-5" />} title={`${k.atDoor.length} handover codes to collect`} sub="Money is released when you verify each buyer’s code." to="/seller/orders?tab=door" />}
              {k.toInstall.length > 0 && <TaskRow tone="brand" icon={<Gauge className="h-5 w-5" />} title={`${k.toInstall.length} installations pending`} sub="Add the brand job number to release the 10% installation hold." to="/seller/orders?tab=delivered" />}
              {k.closing.map((p) => <TaskRow key={p.id} tone="brand" icon={<Radar className="h-5 w-5" />} title={`Bid on ${productOf(s, p.productId).short}`} sub={`${committedCount(p)} committed households · closes ${fmtWhen(p.closesAt, t)}`} to={`/seller/demand/${p.id}`} at={p.closesAt} />)}
              {k.toConfirm.length + k.toDispatch.length + k.atDoor.length + k.tickets.length + k.closing.length === 0 && <EmptyState title="All clear" body="Nothing is waiting on you. New demand will show up here." />}
            </div>
          </Section>

          {/* Money */}
          <Link to="/seller/payouts" className="block overflow-hidden rounded-[20px] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between"><div className="eyebrow text-ink-3">Payouts</div><ChevronRight className="h-4 w-4 text-ink-3" /></div>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <div><div className="num text-[19px] font-bold text-ink">{inr(pay.scheduled)}</div><div className="text-[11.5px] text-ink-3">to your bank in 2 days</div></div>
              <div><div className="num text-[19px] font-bold text-ink">{inr(pay.onHoldPA)}</div><div className="text-[11.5px] text-ink-3">waiting for codes</div></div>
              <div><div className="num text-[19px] font-bold text-ink">{inr(pay.onHoldHolds + pay.onHoldWave)}</div><div className="text-[11.5px] text-ink-3">holds (install, Wave)</div></div>
            </div>
          </Link>

          {live.length > 0 && (
            <Section title="Your live waves" sub="Pots fill as orders complete. You keep every rupee the pot doesn’t use.">
              {live.map((p) => {
                const bid = p.bids.find((b) => b.sellerId === me.id)!;
                const w = waveMeter(s, p, bid.id)!;
                return <WaveMeter key={p.id} level={Math.min(1, w.liveUnits / Math.max(10, (w.nextSlab?.fromUnit ?? w.liveUnits) + 5))} title={productOf(s, p.productId).short} value={inr(w.potLive)} caption={`${w.liveUnits} live orders · ${w.settledUnits} completed · held ${inr(w.hold)} per unit${w.nextSlab ? ` · from #${w.nextSlab.fromUnit}: ${inr(w.nextSlab.perUnitPaise)}` : ''}`} height={120} />;
              })}
            </Section>
          )}

          <Section title="Demand for you" action={<Link to="/seller/demand" className="text-[13px] font-semibold text-wave">All</Link>}>
            <div className="space-y-2">{demand.map((p) => <DemandCard key={p.id} p={p} />)}</div>
          </Section>

          <div className="grid grid-cols-2 gap-2">
            <Link to="/seller/forward" className="rounded-[18px] border border-line bg-surface p-4"><CalendarDays className="h-5 w-5 text-wave" /><div className="mt-2 text-[14px] font-bold text-ink">Forward demand</div><div className="text-[12px] text-ink-3">Handovers and weekly pools ahead</div></Link>
            <Link to="/seller/staff" className="rounded-[18px] border border-line bg-surface p-4"><Truck className="h-5 w-5 text-wave" /><div className="mt-2 text-[14px] font-bold text-ink">Delivery staff mode</div><div className="text-[12px] text-ink-3">A simple screen for Salim</div></Link>
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between"><div className="text-[14.5px] font-bold text-ink">Your scorecard</div><Link to={`/buyer/seller/${me.id}`} className="text-[12.5px] font-semibold text-wave">Public view</Link></div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div><div className="num flex items-center justify-center gap-1 text-[18px] font-bold text-ink"><Star className="h-4 w-4 fill-warn text-warn" />{me.rating?.toFixed(1) ?? '—'}</div><div className="text-[11px] text-ink-3">{me.ratingCount} ratings</div></div>
              <div><div className="num text-[18px] font-bold text-ink">{Math.round(me.onTimeBps / 100)}%</div><div className="text-[11px] text-ink-3">on time</div></div>
              <div><div className="num text-[18px] font-bold text-ink">{(me.cancelBps / 100).toFixed(1)}%</div><div className="text-[11px] text-ink-3">cancelled</div></div>
            </div>
            <p className="mt-3 text-[12px] text-ink-3">Rating breaks ties after price and delivery date. It only counts completed POOL orders.</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function TaskRow({ tone, icon, title, sub, to, at }: { tone: 'danger' | 'warn' | 'brand' | 'wave'; icon: React.ReactNode; title: string; sub: string; to: string; at?: number }) {
  const c = { danger: 'bg-danger-soft text-danger', warn: 'bg-warn-soft text-warn', brand: 'bg-brand-soft text-brand', wave: 'bg-wave-soft text-wave' }[tone];
  return (
    <Link to={to} className="flex items-center gap-3 rounded-[16px] border border-line bg-surface p-3 transition hover:border-line-2">
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-[12px]', c)}>{icon}</span>
      <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold text-ink">{title}</div><div className="line-clamp-2 text-[12px] text-ink-3">{sub}</div></div>
      {at ? <Countdown to={at} compact className="shrink-0 text-[12px]" /> : <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />}
    </Link>
  );
}

function DemandCard({ p }: { p: Pool }) {
  const s = useSim();
  const product = productOf(s, p.productId);
  const uom = uomOf(product.uom);
  const mine = latestBids(p.bids).find((b) => b.sellerId === s.sellerMeId);
  const units = committedUnits(p, uom);
  return (
    <Link to={`/seller/demand/${p.id}`} className="flex gap-3 rounded-[18px] border border-line bg-surface p-3 shadow-[var(--shadow-card)] transition hover:border-line-2">
      <ProductArt art={product.art} size={64} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">{mine ? <Chip tone="wave" icon={<Lock className="h-3 w-3" />}>Sealed · rev {mine.revision}</Chip> : <Chip tone="warn">No bid yet</Chip>}{p.track === 'community' && <Chip tone="brand">Community</Chip>}</div>
        <div className="mt-1 truncate text-[14.5px] font-semibold text-ink">{product.short}</div>
        <div className="text-[12px] text-ink-3">{p.areaLabel} · deliver by {fmtDay(poolDeliverBy(p))}</div>
        <div className="mt-1.5 flex items-center gap-3 text-[12px]"><span className="font-semibold text-ink-2"><span className="num">{committedCount(p)}</span> households · <span className="num">{Number.isInteger(units) ? units : units.toFixed(1)}</span> {uom.plural}</span><span className="text-ink-3">closes <Countdown to={p.closesAt} compact className="text-[12px]" /></span></div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------- Demand list
export function DemandList() {
  const s = useSim();
  const load = useLoadState('seller-demand');
  const list = sellerDemandFor(s, s.sellerMeId).sort((a, b) => a.closesAt - b.closesAt);
  const bidOn = list.filter((p) => p.bids.some((b) => b.sellerId === s.sellerMeId)).length;
  return (
    <div className="pb-6">
      <AppBar title="Demand" sub="Committed buyers in your categories and pincodes" right={<BellButton to="/seller/notifications" />} />
      <div className="space-y-4 px-4 pt-3">
        <div className="grid grid-cols-3 gap-2">
          <MiniStat n={list.length} l="open pools for you" />
          <MiniStat n={list.reduce((a, p) => a + committedCount(p), 0)} l="paid households" />
          <MiniStat n={bidOn} l="you’ve bid on" />
        </div>
        <Card tone="wave" className="flex gap-3 p-3.5 text-[12.5px] text-ink-2"><Eye className="h-5 w-5 shrink-0 text-wave" />You see pincodes, quantities and dates, never names or numbers. Buyer details unlock only when a buyer accepts your offer.</Card>
        {load.state === 'loading' ? <ListSkeleton rows={3} /> : load.state === 'error' ? <ErrorState onRetry={load.retry} /> : list.length === 0 ? <EmptyState icon={<Radar className="h-6 w-6" />} title="No open demand right now" body="We’ll notify you the moment a pool opens in your categories." /> : <div className="space-y-3">{list.map((p) => <DemandCard key={p.id} p={p} />)}</div>}
        <Link to="/seller/bids" className="flex items-center justify-between rounded-[16px] border border-line bg-surface px-4 py-3.5 text-[14px] font-semibold text-ink">Your bids and results <ArrowRight className="h-4 w-4 text-ink-3" /></Link>
      </div>
    </div>
  );
}
const MiniStat = ({ n, l }: { n: number | string; l: string }) => <div className="rounded-[16px] border border-line bg-surface p-3"><div className="num text-[20px] font-bold text-ink">{n}</div><div className="text-[11px] leading-tight text-ink-3">{l}</div></div>;

// ---------------------------------------------------------------- Demand detail
export function DemandDetail() {
  const { poolId } = useParams();
  const s = useSim();
  const t = useNow(1000);
  const load = useLoadState('seller-pool' + poolId);
  const pool = s.pools.find((p) => p.id === poolId);
  if (!pool) return <><AppBar back="/seller/demand" title="Demand" /><div className="p-4"><EmptyState title="Pool not found" /></div></>;
  const product = productOf(s, pool.productId);
  const uom = uomOf(product.uom);
  const prof = profileOf(s, pool.profileId);
  const members = pool.members.filter((m) => m.status !== 'pending' && m.status !== 'left');
  const units = committedUnits(pool, uom);
  const deliverBy = poolDeliverBy(pool);
  const byPin = new Map<string, number>();
  for (const m of members) byPin.set(m.pincode, (byPin.get(m.pincode) ?? 0) + 1);
  const pins = [...byPin.entries()].sort((a, b) => b[1] - a[1]);
  const maxPin = Math.max(1, ...pins.map((x) => x[1]));
  const early = members.filter((m) => m.needBy && m.needBy < deliverBy);
  const days = Array.from({ length: 7 }, (_, i) => startOfDayIST(t) - (6 - i) * DAY);
  const perDay = days.map((d) => members.filter((m) => m.joinedAt >= d && m.joinedAt < d + DAY).length);
  const maxDay = Math.max(1, ...perDay);
  const mine = latestBids(pool.bids).find((b) => b.sellerId === s.sellerMeId);
  const best = outsideBest(product, []);
  const isOpen = pool.state === 'open' && t < pool.closesAt;
  const optCounts = (product.options ?? []).map((o) => ({ o, counts: o.values.map((v) => ({ v, n: members.filter((m) => m.options[o.key] === v.id).length })) }));
  return (
    <div className={cn(isOpen ? 'pb-28' : 'pb-8')}>
      <AppBar back="/seller/demand" title={product.short} sub={pool.no} />
      {load.state === 'loading' ? <div className="p-4"><ListSkeleton rows={3} /></div> : load.state === 'error' ? <div className="p-4"><ErrorState onRetry={load.retry} /></div> : (
        <div className="space-y-6 px-4 pt-3">
          <div className="flex gap-3">
            <ProductArt art={product.art} size={80} rounded={18} />
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-bold leading-snug text-ink">{product.title}</div>
              <div className="mt-1 flex items-center gap-1 text-[12.5px] text-ink-3"><MapPin className="h-3.5 w-3.5" />{pool.areaLabel}</div>
              <div className="mt-1 text-[12px] text-ink-3">Started by {pool.startedBy.name} · {fmtDate(pool.createdAt)}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat n={members.length} l="households paid a booking" />
            <MiniStat n={Number.isInteger(units) ? units : units.toFixed(1)} l={`${uom.plural} committed`} />
            <div className="rounded-[16px] border border-warn/25 bg-warn-soft p-3">{isOpen ? <Countdown to={pool.closesAt} compact className="text-[18px]" /> : <span className="text-[15px] font-bold text-ink">Closed</span>}<div className="text-[11px] text-ink-3">until close</div></div>
          </div>

          {mine ? (
            <Card tone="wave" className="p-4">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[15px] font-bold text-ink"><Lock className="h-4.5 w-4.5 text-wave" />Your sealed bid</div><Chip tone="wave">Revision {mine.revision}</Chip></div>
              <div className="mt-2 grid grid-cols-2 gap-x-4">
                <KV k="Price" v={`${inr(mine.pricePaise)}/${uom.label}`} />
                <KV k="Capacity" v={qtyLabel(mine.capacityBase, uom)} />
                <KV k="Deliver by" v={fmtDay(mine.deliverBy)} />
                <KV k="Wave Drop" v={mine.slabs.length ? `${mine.slabs.length} slabs` : 'None'} />
              </div>
              <p className="mt-2 text-[12px] text-ink-3">Hidden from everyone until {fmtDayTime(pool.closesAt)}. You can lower it until then, never raise it.</p>
            </Card>
          ) : (
            isOpen && <SealedVault count={pool.bids.length} closesText={fmtWhen(pool.closesAt, t)} />
          )}

          <Section title="What you must offer" sub="Bids that miss any of these can’t win, however cheap.">
            <Card className="divide-y divide-line">
              <ReqRow icon={<Truck className="h-4.5 w-4.5" />} t={`${prof.label} by ${fmtDayTime(deliverBy)}`} />
              {pool.requirements.terms.map((r) => <ReqRow key={r.key} icon={<ShieldCheck className="h-4.5 w-4.5" />} t={`${r.label}${typeof r.value === 'number' ? `: at least ${r.value}` : ''}`} />)}
              <ReqRow icon={<BadgeCheck className="h-4.5 w-4.5" />} t="GST invoice to each buyer, at the price POOL sets" />
              {prof.holds.map((h) => <ReqRow key={h.key} icon={<Clock className="h-4.5 w-4.5" />} t={`${h.label}: ${h.bps / 100}% held until the job number (or ${h.releaseAfterDays} days)`} />)}
            </Card>
          </Section>

          {early.length > 0 && (
            <Card tone="warn" className="flex gap-3 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-warn" />
              <div className="text-[13px] text-ink-2"><b className="text-ink">{early.length} households need it before {fmtDay(deliverBy)}.</b> Only bids that deliver by their date can serve them. An earlier delivery date wins these buyers.</div>
            </Card>
          )}

          <Section title="Where the buyers are">
            <Card className="space-y-2.5 p-4">
              {pins.slice(0, 7).map(([pin, n]) => (
                <div key={pin}>
                  <div className="flex justify-between text-[12.5px]"><span className="font-semibold text-ink">{PIN_AREA[pin] ?? 'Area'} · {pin}</span><span className="num text-ink-3">{n}</span></div>
                  <Progress value={n / maxPin} tone="wave" className="mt-1" height={5} />
                </div>
              ))}
            </Card>
          </Section>

          <Section title="Joins, last 7 days">
            <Card className="p-4">
              <div className="flex h-20 items-end gap-1.5">{perDay.map((n, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t-[5px] bg-wave/80" style={{ height: `${Math.max(4, (n / maxDay) * 64)}px` }} /><span className="text-[10px] text-ink-3">{fmtDay(days[i]).split(' ')[0]}</span></div>)}</div>
              <p className="mt-2 text-[12px] text-ink-3">Only paid bookings count. One household is counted once.</p>
            </Card>
          </Section>

          {optCounts.length > 0 && (
            <Section title="Options buyers chose">
              <Card className="p-4">
                {optCounts.map(({ o, counts }) => <div key={o.key} className="space-y-1.5"><div className="text-[12.5px] font-semibold text-ink-2">{o.label}</div>{counts.map(({ v, n }) => <div key={v.id} className="flex items-center gap-2 text-[12.5px]"><span className="w-24 text-ink">{v.label}</span><Progress className="flex-1" value={n / Math.max(1, members.length)} height={5} /><span className="num w-8 text-right text-ink-3">{n}</span></div>)}</div>)}
              </Card>
            </Section>
          )}

          <Card className="p-4">
            <KV k="Best price outside today" hint={`${best.quote.source} · public price, delivery included`} v={`${inr(best.plainBest)}/${uom.label}`} />
            <p className="mt-1 text-[12px] text-ink-3">Buyers see this next to their POOL offer. Your bid is never shown to buyers or other sellers.</p>
          </Card>
        </div>
      )}
      {isOpen && load.state === 'ready' && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-xl" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <LinkButton full size="lg" variant="wave" to={`/seller/demand/${pool.id}/bid`} icon={<Lock className="h-4.5 w-4.5" />}>{mine ? 'Lower your bid' : 'Place a sealed bid'}</LinkButton>
        </div>
      )}
    </div>
  );
}
const ReqRow = ({ icon, t }: { icon: React.ReactNode; t: string }) => <div className="flex items-center gap-3 px-4 py-3 text-[13.5px] text-ink"><span className="text-ink-3">{icon}</span>{t}</div>;

// ---------------------------------------------------------------- Forward demand calendar
export function Forward() {
  const s = useSim();
  const t = useNow(60000);
  const me = sellerOf(s, s.sellerMeId);
  const items: Array<{ at: number; icon: React.ReactNode; title: string; sub: string; to?: string; tone: string }> = [];
  for (const c of s.communities) items.push({ at: c.handoverAt, icon: <Building2 className="h-5 w-5" />, title: `${c.name} handover · ${c.homes} homes`, sub: c.needs.map((n) => `${n.category} ${n.households}`).join(' · '), tone: 'bg-brand-soft text-brand' });
  for (const p of s.pools.filter((x) => x.state === 'open' && me.categories.includes(productOf(s, x.productId).category))) {
    const bid = p.bids.some((b) => b.sellerId === me.id);
    items.push({ at: p.closesAt, icon: p.recurring ? <Repeat className="h-5 w-5" /> : <Users className="h-5 w-5" />, title: `${productOf(s, p.productId).short} closes`, sub: `${committedCount(p)} households · ${bid ? 'you’ve bid' : 'no bid from you yet'}${p.recurring ? ` · ${p.recurring}` : ''}`, to: `/seller/demand/${p.id}`, tone: bid ? 'bg-wave-soft text-wave' : 'bg-warn-soft text-warn' });
  }
  items.sort((a, b) => a.at - b.at);
  const weeks = new Map<number, typeof items>();
  for (const it of items) {
    const w = Math.max(0, Math.floor((startOfDayIST(it.at) - startOfDayIST(t)) / (7 * DAY)));
    weeks.set(w, [...(weeks.get(w) ?? []), it]);
  }
  return (
    <div className="pb-8">
      <AppBar back="/seller" title="Forward demand" sub="Plan stock, staff and installation teams" />
      <div className="space-y-5 px-4 pt-3">
        <Card tone="wave" className="flex gap-3 p-4 text-[13px] text-ink-2"><CalendarDays className="h-5 w-5 shrink-0 text-wave" />New buildings, weekly pools and closing dates in one view. Community needs are counts of registered households, not orders.</Card>
        {[...weeks.entries()].map(([w, xs]) => (
          <Section key={w} title={w === 0 ? 'This week' : w === 1 ? 'Next week' : `In ${w} weeks`}>
            <div className="space-y-2">{xs.map((it, i) => {
              const inner = <><span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-[12px]', it.tone)}>{it.icon}</span><div className="min-w-0 flex-1"><div className="text-[14px] font-semibold text-ink">{it.title}</div><div className="text-[12px] text-ink-3">{fmtDayTime(it.at)}</div><div className="mt-0.5 line-clamp-2 text-[12px] text-ink-2">{it.sub}</div></div></>;
              return it.to ? <Link key={i} to={it.to} className="flex gap-3 rounded-[16px] border border-line bg-surface p-3">{inner}</Link> : <div key={i} className="flex gap-3 rounded-[16px] border border-line bg-surface p-3">{inner}</div>;
            })}</div>
          </Section>
        ))}
        <p className="text-center"><SimTag>Sample buildings and dates</SimTag></p>
        <Button full variant="outline" icon={<Waves className="h-4 w-4" />} onClick={() => history.back()}>Back</Button>
      </div>
    </div>
  );
}
