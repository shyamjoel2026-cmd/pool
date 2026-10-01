import { ArrowRight, Bell, Building2, CalendarClock, ChevronRight, ClipboardPaste, Eye, Hammer, HandCoins, LayoutGrid, List, Map as MapIcon, MapPin, Mic, PackageCheck, ScanLine, Search, ShieldCheck, Sparkles, Truck, Undo2, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useT } from '../lib/i18n';
import { inr } from '../lib/money';
import { DAY, fmtDay, fmtLeft } from '../lib/time';
import { CATEGORIES } from '../sim/catalog';
import { committedCount, outsideBest, productOf } from '../sim/engine';
import { myMoneySummary } from '../sim/selectors';
import { useNow, useSim } from '../sim/store';
import type { CategoryId } from '../sim/types';
import { Card, Chip, Countdown, EmptyState, ErrorState, ListSkeleton, Section, Segmented, SimTag } from '../ui/core';
import { ProductArt } from '../ui/ProductArt';
import { CityMap, PIN_AREA } from '../ui/visuals';
import { AppBar, BellButton, NextStepCard, nextSteps, PoolCard, useLoadState } from './parts';

const CAT_ICON: Record<CategoryId, string> = { electronics: 'tv', appliances: 'ac', groceries: 'rice', meat: 'mutton', laptops: 'laptop', home: 'fan', books: 'books', building: 'cement', services: 'cleaning' };

export function Home() {
  const s = useSim();
  const t = useNow(30000);
  const tr = useT();
  const nav = useNavigate();
  const load = useLoadState('home');
  const steps = nextSteps(s, t);
  const money = myMoneySummary(s, t);
  const open = s.pools.filter((p) => p.state === 'open').sort((a, b) => a.closesAt - b.closesAt);
  const community = s.communities.find((c) => c.id === s.me.communityId);
  const weekly = s.pools.find((p) => p.recurring && p.state === 'open');
  const myWeekly = weekly?.members.find((m) => m.isMe && m.status === 'committed');
  const addr = s.me.addresses.find((a) => a.isDefault)!;
  const hour = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(t));
  const greet = hour < 12 ? tr('Good morning') : hour < 17 ? tr('Good afternoon') : tr('Good evening');
  const completed = s.orders.filter((o) => o.status === 'settled');
  const delivered = s.orders.filter((o) => o.handedOverAt);
  const onTime = delivered.length ? Math.round((delivered.filter((o) => o.handedOverAt! <= o.promisedBy).length / delivered.length) * 100) : 0;
  const avgSave = completed.length ? Math.round(completed.reduce((a, o) => a + (Math.min(...productOf(s, o.productId).outside.map((q) => q.pricePaise)) * o.qtyBase - o.buyerTotal), 0) / completed.length) : 0;

  return (
    <div className="buyer-home pb-6">
      {/* Header */}
      <div className="buyer-hero relative overflow-hidden bg-surface-2 px-4 pb-6 pt-3 text-ink">
        <div className="relative flex items-center justify-between">
          <Link to="/buyer/account/addresses" className="flex min-w-0 items-center gap-1.5 rounded-full bg-surface-3 py-1.5 pl-2 pr-3 text-[12.5px] font-semibold">
            <MapPin className="h-4 w-4 text-brand" />
            <span className="truncate">{addr.line2.split(',').pop()?.trim()} · {addr.pincode}</span>
          </Link>
          <div className="flex items-center">
            <Link to="/buyer/assistant" aria-label="Ask POOL" className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-surface-3"><Sparkles className="h-5 w-5" /></Link>
            <div className="text-ink [&_a]:text-ink [&_a:hover]:bg-surface-3"><BellButton to="/buyer/notifications" /></div>
          </div>
        </div>
        <div className="buyer-hero-copy relative mt-4">
          <div className="text-[13px] text-ink-3">{greet}, {s.me.name.split(' ')[0]}</div>
          <h1 className="mt-0.5 text-[26px] font-bold leading-[1.12] tracking-[-0.02em]">{tr('Before you buy it,')}<br /><span className="text-brand">{tr('POOL it.')}</span></h1>
        </div>
        {/* Smart bar */}
        <div className="buyer-smart-bar relative mt-4 rounded-[18px] bg-surface p-1.5 text-ink shadow-[0_18px_40px_-18px_rgba(0,0,0,.6)]">
          <button onClick={() => nav('/buyer/find')} className="flex h-12 w-full items-center gap-2.5 rounded-[13px] px-3 text-left text-[14.5px] text-ink-3">
            <Search className="h-5 w-5 text-ink-2" />
            {tr('Paste a link, search, or ask')}
          </button>
          <div className="grid grid-cols-3 gap-1.5 px-1 pb-1">
            <button onClick={() => nav('/buyer/find?mode=paste')} className="flex items-center justify-center gap-1.5 rounded-[11px] bg-surface-3 py-2.5 text-[12.5px] font-semibold text-ink"><ClipboardPaste className="h-4 w-4 text-brand" />{tr('Paste link')}</button>
            <button onClick={() => nav('/buyer/assistant?voice=1')} className="flex items-center justify-center gap-1.5 rounded-[11px] bg-surface-3 py-2.5 text-[12.5px] font-semibold text-ink"><Mic className="h-4 w-4 text-brand" />{tr('Speak')}</button>
            <button onClick={() => nav('/buyer/find?mode=scan')} className="flex items-center justify-center gap-1.5 rounded-[11px] bg-surface-3 py-2.5 text-[12.5px] font-semibold text-ink"><ScanLine className="h-4 w-4 text-brand" />{tr('Scan')}</button>
          </div>
        </div>
        <Link to="/buyer/share" className="relative mt-3 flex items-center gap-1.5 text-[12px] text-ink-2">
          <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10.5px] font-bold text-ink">NEW</span> {tr('Shopping on another app? Tap Share → POOL.')} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
        <div className="collective-art" aria-hidden="true">
          <div className="collective-ring ring-one"/><div className="collective-ring ring-two"/>
          <div className="collective-product"><ProductArt art="tv" size="100%" rounded={28}/></div>
          <div className="collective-mini"><ProductArt art="washer" size="100%" rounded={22}/></div>
          <div className="collective-note"><Users size={18}/><span>{tr('Better together')}</span></div>
          <span className="collective-spark">✳</span>
        </div>
      </div>

      <div className="home-content space-y-7 px-4 pt-5">
        {load.state === 'loading' && <ListSkeleton rows={3} />}
        {load.state === 'error' && <ErrorState onRetry={load.retry} />}
        {load.state === 'ready' && (
          <>
            {steps.length > 0 && (
              <Section className="home-next" title={tr('Your next step')} sub={steps.length === 1 ? tr('One thing needs you') : tr('{n} things need you', { n: steps.length })}>
                <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
                  {steps.map((n) => (
                    <NextStepCard key={n.id} n={n} />
                  ))}
                </div>
              </Section>
            )}

            {/* Money at a glance */}
            <Link to="/buyer/money" className="home-money grid grid-cols-3 divide-x divide-line rounded-[18px] border border-line bg-surface py-3 shadow-[var(--shadow-card)]">
              {[
                [tr('Held until delivery'), money.heldBookings + money.heldOrders, 'text-ink'],
                [tr('Refunds coming'), money.refundsInProgress, 'text-wave'],
                [tr('Saved with POOL'), money.savedTotal, 'text-save'],
              ].map(([k, v, c]) => (
                <div key={k as string} className="px-3">
                  <div className={cn('num text-[16px] font-bold', c as string)}>{inr(v as number)}</div>
                  <div className="mt-0.5 text-[11px] leading-tight text-ink-3">{k as string}</div>
                </div>
              ))}
            </Link>

            {/* Community */}
            {community && (
              <Card to="/buyer/community" className="overflow-hidden p-0">
                <div className="flex items-center gap-3 bg-[linear-gradient(120deg,color-mix(in_oklab,var(--wave)_22%,var(--surface)),var(--surface))] p-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-wave text-white"><Building2 className="h-6 w-6" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="eyebrow text-wave-ink">{tr('Your new home')}</div>
                    <div className="text-[16px] font-bold text-ink">{community.name} · {tr('handover in {d} days', { d: Math.max(0, Math.ceil((community.handoverAt - t) / DAY)) })}</div>
                    <div className="text-[12.5px] text-ink-2">{tr('Move-in basket with your neighbours, installed in handover week.')}</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-ink-3" />
                </div>
                <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[12px] text-ink-2">
                  <span><b className="num text-ink">{community.registered}</b> of {community.homes} homes registered</span>
                  <span><b className="num text-ink">{community.poolIds.length}</b> pools open</span>
                  <span className="ml-auto text-wave-ink">{community.builder}</span>
                </div>
              </Card>
            )}

            {/* Weekly rhythm */}
            {weekly && (
              <Card to={`/buyer/pool/${weekly.id}`} className="flex items-center gap-3 p-3.5">
                <ProductArt art={productOf(s, weekly.productId).art} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Chip tone="brand" icon={<CalendarClock className="h-3 w-3" />}>{tr('Every Sunday')}</Chip>
                    {myWeekly && <Chip tone="save">{tr("You're in this week")}</Chip>}
                  </div>
                  <div className="mt-1 text-[14.5px] font-semibold text-ink">{tr('Sunday mutton pool, Kondapur')}</div>
                  <div className="text-[12px] text-ink-3">{tr('Closes')} {fmtDay(weekly.closesAt)} 8 PM · <Countdown to={weekly.closesAt} compact className="text-[12px]" /> · {committedCount(weekly)} {tr('households')}</div>
                </div>
              </Card>
            )}

            {/* Pools near you */}
            <Section className="home-pools" title={tr('Pools near you')} sub={tr('Sample pools. Explore a complete buying journey.')} action={<Link to="/buyer/explore" className="text-[13px] font-semibold text-brand">{tr('See all')}</Link>}>
              <div className="home-pool-grid space-y-3">
                {open.filter((p) => p.track === 'open').slice(0, 4).map((p) => (
                  <PoolCard key={p.id} p={p} />
                ))}
              </div>
            </Section>

            {/* Watching */}
            <Section title={tr('Watching')} action={<Link to="/buyer/watching" className="text-[13px] font-semibold text-brand">{tr('Manage')}</Link>}>
              {s.watch.length === 0 ? (
                <EmptyState icon={<Eye className="h-6 w-6" />} title="Nothing watched yet" body="Watch a product to hear when a pool forms near you or the price drops." />
              ) : (
                <div className="space-y-2">
                  {s.watch.map((w) => {
                    const prod = productOf(s, w.productId);
                    const pool = s.pools.find((p) => p.productId === prod.id && p.state === 'open');
                    const best = outsideBest(prod, s.me.cards);
                    return (
                      <Link key={w.productId} to={pool ? `/buyer/pool/${pool.id}` : `/buyer/product/${prod.id}`} className="flex items-center gap-3 rounded-[16px] border border-line bg-surface p-3">
                        <ProductArt art={prod.art} size={44} rounded={12} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-semibold text-ink">{prod.short}</div>
                          <div className="text-[12px] text-ink-3">
                            {w.alert === 'pool' ? (pool ? <span className="font-semibold text-save">{tr('A pool formed near you')} · {committedCount(pool)} {tr('households')}</span> : tr('Alert when a pool forms')) : <>{tr('Alert below')} {inr(w.targetPaise!)} · {tr('now')} {inr(best.price)}</>}
                          </div>
                        </div>
                        <Bell className={cn('h-4 w-4', pool && w.alert === 'pool' ? 'text-save' : 'text-ink-3')} />
                      </Link>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* Categories */}
            <Section title={tr('Anything can be pooled')} sub={tr('From rice to TVs to services — one category at a time.')}>
              <div className="grid grid-cols-3 gap-2.5">
                {CATEGORIES.map((c) => {
                  const n = open.filter((p) => productOf(s, p.productId).category === c.id).length;
                  return (
                    <Link key={c.id} to={`/buyer/category/${c.id}`} className="flex flex-col items-center gap-1.5 rounded-[16px] border border-line bg-surface p-2.5 text-center transition hover:border-line-2">
                      <ProductArt art={CAT_ICON[c.id] as never} size={52} rounded={14} />
                      <div className="text-[12px] font-semibold leading-tight text-ink">{tr(c.label)}</div>
                      <div className="text-[10.5px] text-ink-3">{n ? `${n} open` : tr('Start one')}</div>
                    </Link>
                  );
                })}
              </div>
            </Section>

            {/* Promise */}
            <Card to="/buyer/help/promise" className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-save" />
                  <div className="text-[15px] font-bold text-ink">{tr('The POOL Promise')}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-3" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  [HandCoins, tr('Price never goes up')],
                  [ShieldCheck, tr('Money held until code')],
                  [Truck, tr('On time or late credit')],
                  [PackageCheck, tr('Genuine or full refund')],
                  [Wrench, tr('Installed as promised')],
                  [Undo2, tr('One desk, refund first')],
                ].map(([Icon, label], i) => {
                  const I = Icon as typeof ShieldCheck;
                  return (
                    <div key={i} className="rounded-[12px] bg-surface-2 p-2.5">
                      <I className="h-4 w-4 text-brand" />
                      <div className="mt-1 text-[11.5px] font-semibold leading-tight text-ink-2">{label as string}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Track record (from completed records only) */}
            <div className="rounded-[18px] border border-line bg-surface p-4">
              <div className="flex items-center justify-between">
                <div className="text-[15px] font-bold text-ink">{tr('Track record in Hyderabad West')}</div>
                <SimTag>Sample data</SimTag>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div><div className="num text-[20px] font-bold text-ink">{completed.length}</div><div className="text-[11px] text-ink-3">{tr('completed purchases')}</div></div>
                <div><div className="num text-[20px] font-bold text-save">{inr(avgSave)}</div><div className="text-[11px] text-ink-3">{tr('average saving')}</div></div>
                <div><div className="num text-[20px] font-bold text-ink">{onTime}%</div><div className="text-[11px] text-ink-3">{tr('delivered on time')}</div></div>
              </div>
              <p className="mt-3 text-[11.5px] leading-snug text-ink-3">{tr('Counted only from completed orders: paid, delivered, return window over. No estimates.')}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Explore() {
  const s = useSim();
  const tr = useT();
  const [view, setView] = useState<'list' | 'map'>('list');
  const [cat, setCat] = useState<'all' | CategoryId>('all');
  const nav = useNavigate();
  const load = useLoadState('explore');
  const open = s.pools.filter((p) => p.state === 'open' && (cat === 'all' || productOf(s, p.productId).category === cat)).sort((a, b) => a.closesAt - b.closesAt);
  const bubbles = useMemo(() => {
    return open.map((p) => {
      const areaCounts: Record<string, number> = {};
      for (const m of p.members.filter((x) => x.status === 'committed')) {
        const a = PIN_AREA[m.pincode] ?? m.area;
        areaCounts[a] = (areaCounts[a] ?? 0) + 1;
      }
      const top = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0];
      const area = p.track === 'community' ? 'Lakeview Heights' : top?.[0] ?? 'Gachibowli';
      return { id: p.id, area, value: committedCount(p), label: `${productOf(s, p.productId).short}: ${committedCount(p)} households`, tone: p.track === 'community' ? ('wave' as const) : ('brand' as const), onClick: () => nav(`/buyer/pool/${p.id}`) };
    });
  }, [open, s, nav]);
  return (
    <div>
      <AppBar back="/buyer" title={tr('Pools near you')} sub={`${open.length} ${tr('open pools')}`} right={<Segmented value={view} onChange={setView} options={[{ value: 'list', label: <List className="h-4 w-4" /> }, { value: 'map', label: <MapIcon className="h-4 w-4" /> }]} className="w-[96px]" />} />
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        {(['all', ...CATEGORIES.map((c) => c.id)] as const).map((c) => (
          <button key={c} onClick={() => setCat(c as typeof cat)} className={cn('whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold', cat === c ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-ink-2')}>
            {c === 'all' ? tr('All') : tr(CATEGORIES.find((x) => x.id === c)!.label)}
          </button>
        ))}
      </div>
      <div className="space-y-3 px-4 pb-6">
        {load.state === 'loading' ? (
          <ListSkeleton rows={4} />
        ) : load.state === 'error' ? (
          <ErrorState onRetry={load.retry} />
        ) : open.length === 0 ? (
          <EmptyState icon={<LayoutGrid className="h-6 w-6" />} title={tr('No open pools here yet')} body={tr('Paste a product link to start one. You choose when it closes.')} action={<Link to="/buyer/find" className="rounded-[12px] bg-brand px-4 py-2.5 text-[14px] font-semibold text-on-brand">{tr('Start a pool')}</Link>} />
        ) : view === 'map' ? (
          <>
            <CityMap bubbles={bubbles} className="aspect-[4/3]" />
            <p className="text-[12px] text-ink-3">{tr('Bubbles show committed households per pool, placed where most of them live. Tap one to open it.')}</p>
            {open.map((p) => <PoolCard key={p.id} p={p} compact />)}
          </>
        ) : (
          open.map((p) => <PoolCard key={p.id} p={p} />)
        )}
      </div>
    </div>
  );
}

export function Category() {
  const { id } = useParams();
  const s = useSim();
  const tr = useT();
  const t = useNow(60000);
  const cat = CATEGORIES.find((c) => c.id === id);
  const load = useLoadState('cat' + id);
  if (!cat) return <EmptyState title="Category not found" />;
  const products = s.products.filter((p) => p.category === cat.id);
  const pools = s.pools.filter((p) => productOf(s, p.productId).category === cat.id && p.state === 'open');
  return (
    <div>
      <AppBar back="/buyer" title={tr(cat.label)} sub={tr(cat.hint)} />
      <div className="space-y-6 px-4 py-4">
        {load.state !== 'ready' ? (
          load.state === 'error' ? <ErrorState onRetry={load.retry} /> : <ListSkeleton rows={3} />
        ) : (
          <>
            <Section title={tr('Open pools')}>
              {pools.length ? <div className="space-y-3">{pools.map((p) => <PoolCard key={p.id} p={p} />)}</div> : <EmptyState icon={<Hammer className="h-6 w-6" />} title={tr('No open pool in this category')} body={tr('Start one from any product below, or paste a link. You choose the closing time.')} />}
            </Section>
            <Section title={tr('Products people pool')}>
              <div className="grid grid-cols-2 gap-3">
                {products.map((p) => {
                  const best = outsideBest(p, s.me.cards);
                  const pool = s.pools.find((x) => x.productId === p.id && x.state === 'open');
                  return (
                    <Link key={p.id} to={`/buyer/product/${p.id}`} className="rounded-[18px] border border-line bg-surface p-3">
                      <ProductArt art={p.art} size="100%" className="aspect-square" />
                      <div className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-ink">{p.short}</div>
                      <div className="mt-1 text-[11.5px] text-ink-3">{tr('Outside from')} <span className="num font-semibold text-ink-2">{inr(best.plainBest)}</span></div>
                      {pool ? <div className="mt-1.5 text-[11.5px] font-semibold text-brand">{tr('Pool closes in')} {fmtLeft(pool.closesAt, t)}</div> : <div className="mt-1.5 text-[11.5px] font-semibold text-ink-3">{tr('No pool yet')}</div>}
                    </Link>
                  );
                })}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
