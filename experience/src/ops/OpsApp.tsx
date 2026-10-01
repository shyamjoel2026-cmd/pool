import { AlertTriangle, ArrowRight, BadgeCheck, Command, Gavel, Gauge, History, IndianRupee, Layers, LifeBuoy, Scale, Search, Settings as Cog, ShieldAlert, Store, Tag } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { inr, inrCompact } from '../lib/money';
import { fmtWhen } from '../lib/time';
import { committedCount, productOf } from '../sim/engine';
import { allRefunds, ledger, opsKpis, poolStageLabel } from '../sim/selectors';
import { useNow, useSim } from '../sim/store';
import { Avatar, Card, Chip, Countdown, PortalHost, ToastHost } from '../ui/core';
import { ProductArt } from '../ui/ProductArt';
import { CityMap, LOCALITIES, PIN_AREA, type MapBubble } from '../ui/visuals';
import { Awards, Pools, Pricing } from './Awards';
import { Exceptions, Reconciliation } from './Money';
import { Audit, Risk, SellerReview, Settings } from './Trust';

const NAV = [
  { to: '/ops', end: true, icon: Gauge, label: 'Overview' },
  { to: '/ops/pools', icon: Layers, label: 'Pools' },
  { to: '/ops/sellers', icon: Store, label: 'Seller review' },
  { to: '/ops/awards', icon: Gavel, label: 'Awards' },
  { to: '/ops/pricing', icon: Tag, label: 'Pricing' },
  { to: '/ops/exceptions', icon: LifeBuoy, label: 'Exceptions & refunds' },
  { to: '/ops/reconciliation', icon: Scale, label: 'Reconciliation' },
  { to: '/ops/risk', icon: ShieldAlert, label: 'Risk' },
  { to: '/ops/audit', icon: History, label: 'Audit log' },
  { to: '/ops/settings', icon: Cog, label: 'Rules & settings' },
];

export function OpsApp() {
  const s = useSim();
  const [palette, setPalette] = useState(false);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((x) => !x);
      }
      if (e.key === 'Escape') setPalette(false);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
  const badge = (to: string) => {
    if (to === '/ops/sellers') return s.applications.filter((a) => a.status === 'pending').length;
    if (to === '/ops/awards') return s.pools.filter((p) => p.state === 'closed').length;
    if (to === '/ops/pricing') return s.pools.filter((p) => p.state === 'pricing').length;
    if (to === '/ops/exceptions') return s.tickets.filter((t) => t.status !== 'resolved').length;
    if (to === '/ops/risk') return s.signals.filter((x) => x.status === 'new').length;
    return 0;
  };
  return (
    <PortalHost>
      <ToastHost>
        <div className="flex bg-bg" style={{ minHeight: 'calc(100dvh - 52px)' }}>
          <aside className="sticky top-[52px] hidden h-[calc(100dvh-52px)] w-[248px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
            <div className="flex items-center gap-2.5 px-4 pb-3 pt-4"><Avatar name={s.opsUser.name} size={36} tone="wave" /><div className="min-w-0"><div className="truncate text-[14px] font-bold text-ink">{s.opsUser.name}</div><div className="truncate text-[11.5px] text-ink-3">POOL team · {s.opsUser.role}</div></div></div>
            <button onClick={() => setPalette(true)} className="mx-3 mb-2 flex h-9 items-center gap-2 rounded-[10px] border border-line bg-surface-2 px-2.5 text-[13px] text-ink-3"><Search className="h-4 w-4" />Jump to…<span className="ml-auto flex items-center gap-0.5 rounded-[6px] border border-line px-1 text-[10.5px]"><Command className="h-3 w-3" />K</span></button>
            <nav className="scroll-y flex-1 space-y-0.5 px-2 pb-4">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('flex h-10 items-center gap-2.5 rounded-[10px] px-3 text-[13.5px] font-semibold transition', isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:bg-surface-2')}>
                  <n.icon className="h-[18px] w-[18px]" />{n.label}
                  {badge(n.to) > 0 && <span className="num ml-auto rounded-full bg-warn px-1.5 text-[11px] font-bold text-white">{badge(n.to)}</span>}
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-line p-3 text-[11px] leading-relaxed text-ink-3">Every view of a sealed bid and every money action is written to the audit log with a reason.</div>
          </aside>
          <main className="min-w-0 flex-1">
            <div className="no-scrollbar sticky top-[52px] z-30 flex gap-1 overflow-x-auto border-b border-line bg-surface/95 px-3 py-2 backdrop-blur lg:hidden">
              {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-[12.5px] font-semibold', isActive ? 'bg-brand-soft text-brand-ink' : 'text-ink-2')}><n.icon className="h-4 w-4" />{n.label}{badge(n.to) > 0 && <span className="num rounded-full bg-warn px-1.5 text-[10.5px] text-white">{badge(n.to)}</span>}</NavLink>)}
            </div>
            <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-8">
              <Routes>
                <Route index element={<Overview />} />
                <Route path="pools" element={<Pools />} />
                <Route path="sellers" element={<SellerReview />} />
                <Route path="awards" element={<Awards />} />
                <Route path="awards/:poolId" element={<Awards />} />
                <Route path="pricing" element={<Pricing />} />
                <Route path="pricing/:poolId" element={<Pricing />} />
                <Route path="exceptions" element={<Exceptions />} />
                <Route path="reconciliation" element={<Reconciliation />} />
                <Route path="risk" element={<Risk />} />
                <Route path="audit" element={<Audit />} />
                <Route path="settings" element={<Settings />} />
              </Routes>
            </div>
          </main>
          {palette && <Palette onClose={() => setPalette(false)} />}
        </div>
      </ToastHost>
    </PortalHost>
  );
}

export function PageHead({ title, sub, right, eyebrow }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow text-brand">{eyebrow}</div>}
        <h1 className="mt-1 text-[26px] font-bold tracking-[-0.02em] text-ink sm:text-[30px]">{title}</h1>
        {sub && <p className="mt-1 max-w-[760px] text-[14px] text-ink-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Kpi({ label, value, sub, tone, icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'save' | 'warn' | 'danger' | 'brand' | 'wave'; icon?: ReactNode }) {
  const c = { save: 'text-save', warn: 'text-warn', danger: 'text-danger', brand: 'text-brand', wave: 'text-wave' }[tone ?? 'brand'];
  return (
    <div className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between text-[12.5px] font-semibold text-ink-3">{label}{icon && <span className={c}>{icon}</span>}</div>
      <div className="num mt-1.5 text-[26px] font-bold tracking-[-0.02em] text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-ink-3">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- Overview
function Overview() {
  const s = useSim();
  const t = useNow(15000);
  const nav = useNavigate();
  const k = opsKpis(s, t);
  const L = ledger(s, t);
  const refunds = allRefunds(s, t).filter((r) => r.status === 'processing');
  const queue: Array<{ tone: 'danger' | 'warn' | 'brand'; title: string; sub: string; to: string; at?: number }> = [];
  for (const p of s.pools.filter((x) => x.state === 'closed')) queue.push({ tone: 'warn', title: `Review the award: ${productOf(s, p.productId).short}`, sub: `${committedCount(p)} households · ${p.bids.length} bids · ${p.award?.flagged.length ?? 0} flagged`, to: `/ops/awards/${p.id}`, at: p.pricingDeadline });
  for (const p of s.pools.filter((x) => x.state === 'pricing')) queue.push({ tone: 'warn', title: `Set prices and publish: ${productOf(s, p.productId).short}`, sub: 'No offers by the deadline means no deal and full refunds', to: `/ops/pricing/${p.id}`, at: p.pricingDeadline });
  for (const tk of s.tickets.filter((x) => x.status !== 'resolved')) queue.push({ tone: tk.sellerDueBy < t ? 'danger' : 'brand', title: `${tk.no}: ${tk.type.replace(/_/g, ' ')} · ${tk.buyerName}`, sub: tk.sellerDueBy < t ? 'Seller missed the 24-hour reply. POOL decides now.' : `Seller reply due ${fmtWhen(tk.sellerDueBy, t)}`, to: '/ops/exceptions', at: tk.ackBy });
  if (k.lateOrders.length) queue.push({ tone: 'danger', title: `${k.lateOrders.length} orders past their promised date`, sub: 'Move them to the backup seller at the same price', to: '/ops/exceptions?tab=late' });
  for (const x of k.newSignals) queue.push({ tone: x.severity === 'high' ? 'danger' : 'brand', title: x.title, sub: x.detail.slice(0, 90), to: '/ops/risk' });
  const apps = s.applications.filter((a) => a.status === 'pending');
  if (apps.length) queue.push({ tone: 'brand', title: `${apps.length} seller applications`, sub: apps.map((a) => a.business).join(', '), to: '/ops/sellers' });
  const stages = ['open', 'closed', 'pricing', 'offers', 'fulfilment', 'completed', 'no_deal'] as const;
  const bubbles: MapBubble[] = [];
  for (const p of s.pools.filter((x) => x.state === 'open')) {
    const area = p.track === 'community' ? 'Lakeview Heights' : PIN_AREA[p.pincodes[0]] ?? 'Gachibowli';
    if (!LOCALITIES[area]) continue;
    const ex = bubbles.find((b) => b.area === area);
    if (ex) ex.value += committedCount(p);
    else bubbles.push({ id: p.id, area, value: committedCount(p), label: area, tone: p.track === 'community' ? 'wave' : 'brand' });
  }
  return (
    <>
      <PageHead eyebrow="POOL team console" title={`Good ${new Date(t).getHours() < 12 ? 'morning' : 'day'}, ${s.opsUser.name.split(' ')[0]}`} sub="Everything that needs a person, in deadline order. The engine does the rest." right={<div className="flex items-center gap-2 rounded-[12px] border border-save/30 bg-save-soft px-3 py-2 text-[13px] font-semibold text-save"><Scale className="h-4 w-4" />Ledger difference {inr(L.difference, { exact: true })}</div>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Open pools" value={k.openPools} sub={`${k.committed} committed households`} />
        <Kpi label="Offers waiting" value={k.offersWaiting} sub="24-hour decide window" tone="warn" />
        <Kpi label="In fulfilment" value={k.inFulfilment} sub={`${k.lateOrders.length} late`} tone={k.lateOrders.length ? 'danger' : 'brand'} />
        <Kpi label="Offers accepted" value={`${Math.round(k.acceptRate * 100)}%`} sub="of decided offers" tone="save" />
        <Kpi label="On time" value={`${Math.round(k.onTime * 100)}%`} sub="delivered by promise" tone="save" />
        <Kpi label="Avg buyer saving" value={inr(k.avgSaving)} sub="vs plain outside best" tone="save" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[17px] font-bold text-ink">Needs a person</h2><span className="text-[12.5px] text-ink-3">{queue.length} items</span></div>
          <div className="space-y-2">
            {queue.map((q, i) => (
              <Link key={i} to={q.to} className="flex items-center gap-3 rounded-[16px] border border-line bg-surface p-3.5 transition hover:border-line-2">
                <span className={cn('h-10 w-1.5 shrink-0 rounded-full', q.tone === 'danger' ? 'bg-danger' : q.tone === 'warn' ? 'bg-warn' : 'bg-brand')} />
                <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold text-ink">{q.title}</div><div className="truncate text-[12.5px] text-ink-3">{q.sub}</div></div>
                {q.at ? <div className="text-right text-[11.5px] text-ink-3"><Countdown to={q.at} compact className="text-[13px]" /><div>left</div></div> : <ArrowRight className="h-4 w-4 text-ink-3" />}
              </Link>
            ))}
            {queue.length === 0 && <Card className="p-6 text-center text-[14px] text-ink-3">Nothing needs a person right now.</Card>}
          </div>
        </section>
        <section className="space-y-4">
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between"><h2 className="text-[15px] font-bold text-ink">Live demand</h2><Link to="/ops/pools" className="text-[12.5px] font-semibold text-brand">All pools</Link></div>
            <CityMap bubbles={bubbles} className="aspect-[400/280] w-full" />
          </Card>
          <Card className="p-4">
            <h2 className="text-[15px] font-bold text-ink">Pool pipeline</h2>
            <div className="mt-3 space-y-2">
              {stages.map((st) => { const n = s.pools.filter((p) => p.state === st).length; return <button key={st} onClick={() => nav(`/ops/pools?state=${st}`)} className="flex w-full items-center gap-3 text-left text-[13px]"><span className="w-36 text-ink-2">{poolStageLabel({ state: st } as never)}</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3"><span className="block h-full rounded-full bg-brand" style={{ width: `${(n / s.pools.length) * 100}%` }} /></span><span className="num w-6 text-right font-semibold text-ink">{n}</span></button>; })}
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="GMV (live orders)" value={inrCompact(k.gmv)} icon={<IndianRupee className="h-4 w-4" />} />
            <Kpi label="Margin earned" value={inrCompact(k.margin)} sub="delivered orders, incl. GST" tone="wave" />
            <Kpi label="Held at payment co." value={inrCompact(L.heldAtPA)} sub="bookings, orders, holds" />
            <Kpi label="Refunds in flight" value={inr(refunds.reduce((a, r) => a + r.amount, 0))} sub={`${refunds.length} refunds`} tone="warn" />
          </div>
        </section>
      </div>
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-[17px] font-bold text-ink">Recent activity</h2><Link to="/ops/audit" className="text-[12.5px] font-semibold text-brand">Audit log</Link></div>
        <Card className="divide-y divide-line">
          {s.audit.slice(0, 8).map((e) => <div key={e.id} className="flex items-start gap-3 px-4 py-2.5 text-[13px]"><span className="w-24 shrink-0 text-ink-3">{fmtWhen(e.at, t).replace('Today, ', '')}</span><span className="w-40 shrink-0 truncate font-semibold text-ink">{e.actor}</span><span className="min-w-0 flex-1 text-ink-2"><b className="text-ink">{e.action}</b> · {e.detail}</span></div>)}
        </Card>
      </section>
    </>
  );
}

// ---------------------------------------------------------------- Command palette
function Palette({ onClose }: { onClose: () => void }) {
  const s = useSim();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const items = useMemo(() => {
    const out: Array<{ label: string; sub: string; to: string; icon: ReactNode }> = NAV.map((n) => ({ label: n.label, sub: 'Page', to: n.to, icon: <n.icon className="h-4 w-4" /> }));
    for (const p of s.pools) out.push({ label: productOf(s, p.productId).short, sub: `${p.no} · ${poolStageLabel(p)}`, to: p.state === 'closed' ? `/ops/awards/${p.id}` : p.state === 'pricing' ? `/ops/pricing/${p.id}` : `/ops/pools?focus=${p.id}`, icon: <ProductArt art={productOf(s, p.productId).art} size={20} rounded={6} /> });
    for (const sl of s.sellers) out.push({ label: sl.name, sub: `Seller · ${sl.area}`, to: '/ops/sellers', icon: <BadgeCheck className="h-4 w-4" /> });
    for (const tk of s.tickets) out.push({ label: tk.no, sub: `Ticket · ${tk.buyerName} · ${tk.status}`, to: '/ops/exceptions', icon: <AlertTriangle className="h-4 w-4" /> });
    return out;
  }, [s]);
  const shown = items.filter((x) => !q || (x.label + x.sub).toLowerCase().includes(q.toLowerCase())).slice(0, 9);
  const go = (to: string) => { nav(to); onClose(); };
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-[rgb(5_8_18/0.5)] px-4 pt-[12vh]" onClick={onClose}>
      <div className="pop w-full max-w-[560px] overflow-hidden rounded-[18px] bg-surface shadow-[var(--shadow-pop)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-4"><Search className="h-5 w-5 text-ink-3" /><input autoFocus className="h-14 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3" placeholder="Search pools, sellers, tickets, pages" value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} onKeyDown={(e) => { if (e.key === 'ArrowDown') setI(Math.min(i + 1, shown.length - 1)); if (e.key === 'ArrowUp') setI(Math.max(i - 1, 0)); if (e.key === 'Enter' && shown[i]) go(shown[i].to); }} /><Chip>Esc</Chip></div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {shown.map((x, k) => <button key={k} onMouseEnter={() => setI(k)} onClick={() => go(x.to)} className={cn('flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left', k === i && 'bg-brand-soft')}><span className="text-ink-3">{x.icon}</span><span className="flex-1 truncate text-[14px] font-semibold text-ink">{x.label}</span><span className="truncate text-[12px] text-ink-3">{x.sub}</span></button>)}
          {shown.length === 0 && <div className="p-6 text-center text-[13.5px] text-ink-3">No matches</div>}
        </div>
      </div>
    </div>
  );
}
