import { ArrowRight, ArrowUpRight, BadgeCheck, Building2, Check, ChevronDown, Globe, Heart, KeyRound, Landmark, Languages, Link2, Lock, MessageCircle, Mic, Play, Scale, ShieldCheck, Store, Truck, Users, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { INDIA } from '../lib/gst';
import { LANGS, useT } from '../lib/i18n';
import { inr, inrCompact } from '../lib/money';
import { fmtWhen } from '../lib/time';
import { committedCount, offerFor, potFor, productOf, profileOf, slabAt, splitOrder } from '../sim/engine';
import { ledger, opsKpis } from '../sim/selectors';
import { setPrefs, setTour, useNow, useSim } from '../sim/store';
import type { Pool, Slab, State } from '../sim/types';
import { artHue, ProductArt } from '../ui/ProductArt';
import { Logo, Mark } from '../ui/Logo';
import { CityMap, LOCALITIES, PIN_AREA, Rolling, Water, type MapBubble } from '../ui/visuals';
import { GUIDE } from './guide';
import { PROMISE } from '../buyer/Account';

/** The first screen anyone sees. Every number on it comes from the demo's live sample data. */
export function Landing() {
  const s = useSim();
  const t = useNow(5000);
  const nav = useNavigate();
  const startTour = () => {
    setTour({ active: true, step: 0 });
    nav(GUIDE[0].path(s));
  };
  const openPools = s.pools.filter((p) => p.state === 'open');
  const households = openPools.reduce((a, p) => a + committedCount(p), 0);
  const k = opsKpis(s, t);
  return (
    <div className="min-h-screen bg-bg text-ink">
      <Nav onTour={startTour} />
      <Hero onTour={startTour} households={households} pools={openPools.length} />
      <IndiaBuys />
      <Journey />
      <Honesty />
      <WaveDrop />
      <CitySection saving={k.avgSaving} />
      <IndiaFirst />
      <Doors onTour={startTour} />
      <PromiseGrid />
      <Investors onTour={startTour} />
      <Faq />
      <Footer />
    </div>
  );
}

const scrollTo = (h: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.querySelector(h)?.scrollIntoView({ behavior: 'smooth' });
};

// ---------------------------------------------------------------- Nav: dark glass, readable over every section
function Nav({ onTour }: { onTour: () => void }) {
  const s = useSim();
  const tr = useT();
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
      <div className="mx-auto flex max-w-[1180px] items-center gap-2 rounded-full border border-white/10 bg-[rgb(5_7_15/0.72)] py-1.5 pl-3 pr-1.5 text-white shadow-[0_10px_40px_-12px_rgb(0_0_0/0.5)] backdrop-blur-xl">
        <Link to="/" className="shrink-0" aria-label="POOL home"><Logo size={30} /></Link>
        <nav className="ml-5 hidden items-center gap-0.5 text-[14px] text-white/70 md:flex">
          {[['#buys', tr('What India buys')], ['#how', tr('How it works')], ['#wave', tr('Wave Drop')], ['#investors', tr('Investors')]].map(([h, l]) => (
            <a key={h} href={h} onClick={scrollTo(h)} className="rounded-full px-3 py-1.5 transition hover:bg-white/10 hover:text-white">{l}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <button onClick={() => setOpen(!open)} className="flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] text-white/80 hover:bg-white/10 sm:px-3" aria-label="Language" aria-expanded={open}><Languages className="h-4 w-4" /><span className="hidden sm:inline">{LANGS.find((l) => l.id === s.prefs.lang)!.native}</span></button>
            {open && (
              <div className="absolute right-0 top-11 w-40 overflow-hidden rounded-[18px] border border-line bg-surface p-1 text-ink shadow-[var(--shadow-pop)]">
                {LANGS.map((l) => <button key={l.id} onClick={() => { setPrefs({ lang: l.id }); setOpen(false); }} className={cn('block w-full rounded-[14px] px-3 py-2.5 text-left text-[14px] hover:bg-surface-2', s.prefs.lang === l.id && 'bg-brand-soft font-semibold text-brand-ink')}>{l.native}</button>)}
              </div>
            )}
          </div>
          <button onClick={onTour} className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-white/85 hover:bg-white/10 sm:flex"><Play className="h-3.5 w-3.5" />{tr('Walkthrough')}</button>
          <Link to="/buyer" className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 text-[13.5px] font-semibold text-night transition hover:bg-white/90">{tr('Open the app')}<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------- Hero: your neighbourhood's pool, filling up
const HERO_POOLS = ['pool-phone', 'pool-tv', 'pool-ac', 'pool-scooter', 'pool-rice'];

function Hero({ onTour, households, pools }: { onTour: () => void; households: number; pools: number }) {
  const tr = useT();
  const nav = useNavigate();
  return (
    <section className="aurora grain relative overflow-hidden pb-16 pt-28 text-white sm:pb-24 sm:pt-32">
      <div className="caustics" />
      <div className="relative z-10 mx-auto grid max-w-[1180px] items-center gap-12 px-5 lg:grid-cols-[1.02fr_1fr] lg:gap-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-white/85 glass">
            <span className="relative flex h-2 w-2"><span className="pulse-ring absolute inset-0 rounded-full bg-aqua" /><span className="relative h-2 w-2 rounded-full bg-aqua" /></span>
            {tr('Live in Hyderabad · {n} households in {p} pools', { n: households, p: pools })}
          </div>
          <h1 className="display mt-7 text-[52px] sm:text-[76px] lg:text-[88px]">
            {tr('Before you buy it,')}
            <br />
            <span className="serif-it pr-2 text-[1.12em] text-aqua">{tr('POOL it.')}</span>
          </h1>
          <p className="mt-6 max-w-[540px] text-[17px] leading-relaxed text-white/72 sm:text-[19px]">
            {tr('Your neighbours are buying the same phone, TV or AC this month. POOL turns all of you into one order. Verified local sellers bid for it in secret, and you get one honest price that you are free to refuse.')}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button onClick={() => nav('/buyer')} className="group flex h-14 items-center gap-2 rounded-full bg-white pl-6 pr-5 text-[16px] font-semibold text-night shadow-[0_20px_50px_-15px_rgb(62_234_217/0.55)] transition hover:-translate-y-0.5">
              {tr('Try the app')}<ArrowRight className="h-4.5 w-4.5 transition group-hover:translate-x-0.5" />
            </button>
            <button onClick={onTour} className="flex h-14 items-center gap-2.5 rounded-full pl-2 pr-5 text-[15.5px] font-semibold text-white glass transition hover:bg-white/10">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/12"><Play className="h-4 w-4 fill-current" /></span>{tr('See the whole business · 15 steps')}
            </button>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[13px] text-white/62">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-aqua" />{tr('Refundable booking')}</span>
            <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-aqua" />{tr('Money held until your code')}</span>
            <span className="flex items-center gap-1.5"><Scale className="h-4 w-4 text-aqua" />{tr('We tell you when Amazon is cheaper')}</span>
          </div>
          <div className="mt-6 text-[11px] font-medium tracking-[0.04em] text-white/35">Deep End · build {__POOL_BUILD__}</div>
        </div>
        <PoolStage />
      </div>
      <a href="#buys" onClick={scrollTo('#buys')} className="relative z-10 mx-auto mt-12 flex w-fit flex-col items-center gap-1 text-[12px] text-white/45 hover:text-white/70">
        <span>{tr('What India buys, bought together')}</span>
        <ChevronDown className="float-y h-4 w-4" />
      </a>
    </section>
  );
}

function stateLine(p: Pool, t: number, tr: ReturnType<typeof useT>) {
  if (p.state === 'open') return tr('Closes {t}', { t: fmtWhen(p.closesAt, t) });
  if (p.state === 'closed' || p.state === 'pricing') return tr('Closed · sellers ranked, price being set');
  if (p.state === 'offers') return tr('Offers out · each buyer decides');
  if (p.state === 'fulfilment') return tr('Delivering');
  return tr('Completed');
}

/** The hero visual: a pool of real neighbours. The water rises with households; drops keep falling in. */
function PoolStage() {
  const s = useSim();
  const t = useNow(15000);
  const tr = useT();
  const list = HERO_POOLS.map((id) => s.pools.find((p) => p.id === id)).filter(Boolean) as Pool[];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || list.length < 2) return;
    const h = setInterval(() => setI((x) => (x + 1) % list.length), 4200);
    return () => clearInterval(h);
  }, [paused, list.length]);
  if (!list.length) return null;
  const pool = list[i % list.length];
  const product = productOf(s, pool.productId);
  const hue = artHue(product.art);
  const n = committedCount(pool);
  const maxN = Math.max(...list.map(committedCount));
  const best = Math.min(...product.outside.map((q) => q.pricePaise));
  const level = 0.24 + 0.16 * Math.sqrt(n / Math.max(1, maxN));
  return (
    <div className="relative mx-auto w-full max-w-[540px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="absolute -inset-10 rounded-full opacity-70 blur-3xl transition-colors duration-1000" style={{ background: `radial-gradient(closest-side, ${hue}66, transparent)` }} />
      <Link to={`/buyer/pool/${pool.id}`} className="relative block aspect-[1/1.04] w-full overflow-hidden rounded-[44px] text-left glass ring-glow" aria-label={tr('Open the {p} pool', { p: product.short })}>
        <div className="absolute inset-0 transition-colors duration-1000" style={{ background: `radial-gradient(90% 70% at 50% 18%, ${hue}55, transparent 70%)` }} />
        {/* top row */}
        <div className="relative z-10 flex items-center justify-between p-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[0.08em]"><span className="h-1.5 w-1.5 rounded-full bg-aqua" />{tr('Live pool')}</span>
          <span className="text-[12px] font-medium text-white/65">{stateLine(pool, t, tr)}</span>
        </div>
        {/* product, floating above the water */}
        <div key={pool.id} className="pop absolute inset-x-0 top-[9%] z-10 flex justify-center">
          <div className="float-y aspect-square w-[46%]"><ProductArt art={product.art} size="100%" stage="none" /></div>
        </div>
        {/* households dropping in */}
        <div key={`d-${pool.id}`} className="absolute inset-x-0 z-20" style={{ bottom: `${level * 100}%` }}>
          {[14, 31, 47, 63, 79, 88, 22, 56].map((x, k) => (
            <span key={k} className="absolute" style={{ left: `${x}%`, bottom: 0 }}>
              <span className="drop-in block h-3.5 w-3.5 rounded-full bg-gradient-to-b from-white to-aqua shadow-[0_0_14px_rgb(62_234_217/0.8)]" style={{ animationDelay: `${300 + k * 380}ms` }} />
              <span className="ripple absolute -left-2.5 top-1 h-8 w-8 rounded-full border-2 border-aqua/70" style={{ animationDelay: `${780 + k * 380}ms`, transform: 'scale(0.2)', opacity: 0 }} />
            </span>
          ))}
        </div>
        <Water level={level} />
        {/* numbers on the water */}
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-3 p-6">
          <div>
            <Rolling text={String(n)} className="num-wide text-[64px] font-[780] leading-none text-white drop-shadow-[0_2px_12px_rgb(0_40_60/0.35)]" />
            <div className="mt-1.5 text-[14px] font-semibold text-white/90">{tr('households · {area}', { area: pool.areaLabel })}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[15px] font-bold text-white">{product.short}</div>
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[rgb(5_7_15/0.35)] px-2.5 py-1 text-[12px] font-semibold text-white"><Lock className="h-3.5 w-3.5" />{tr('{n} sealed bids', { n: pool.bids.length })}</div>
            <div className="mt-1.5 text-[12px] text-white/80">{tr('Best outside today')} <span className="num font-bold text-white">{inr(best)}</span></div>
          </div>
        </div>
      </Link>
      {/* switcher */}
      <div className="relative mt-4 flex justify-center gap-2" role="tablist" aria-label={tr('Live pools')}>
        {list.map((p, k) => {
          const pr = productOf(s, p.productId);
          return (
            <button key={p.id} role="tab" aria-selected={k === i % list.length} onClick={() => setI(k)} className={cn('flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-[12px] font-semibold transition', k === i % list.length ? 'bg-white text-night' : 'bg-white/8 text-white/65 hover:bg-white/14')}>
              <ProductArt art={pr.art} size={26} rounded={999} stage={k === i % list.length ? 'soft' : 'none'} />
              <span className="hidden sm:inline">{tr(CAT_LABEL[pr.category] ?? pr.short)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const CAT_LABEL: Record<string, string> = { phones: 'Phone', electronics: 'TV', appliances: 'AC', mobility: 'Scooter', groceries: 'Rice', laptops: 'Laptop', energy: 'Solar' };

// ---------------------------------------------------------------- What India buys most, as live pools
const BUYS: Array<{ id: string; span: string; big?: boolean; wide?: boolean }> = [
  { id: 'pool-phone', span: 'sm:col-span-2 lg:row-span-2', big: true },
  { id: 'pool-tv', span: 'sm:col-span-2', wide: true },
  { id: 'pool-ac', span: '' },
  { id: 'pool-scooter', span: '' },
  { id: 'pool-rice', span: '' },
  { id: 'pool-laptop', span: '' },
  { id: 'pool-solar', span: 'sm:col-span-2', wide: true },
];

function IndiaBuys() {
  const s = useSim();
  const tr = useT();
  return (
    <section id="buys" className="mx-auto max-w-[1180px] scroll-mt-20 px-5 py-24">
      <SectionHead
        eyebrow={tr('What India buys most')}
        title={<>{tr('Phones. TVs. ACs. Scooters. Rice.')}<br /><span className="serif-it text-brand">{tr('Bought together.')}</span></>}
        sub={tr('Phones and appliances are most of what India buys in the festive season. These are live pools in the demo. Tap one and join it.')}
      />
      <div className="mt-12 grid auto-rows-[minmax(220px,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BUYS.map((b) => {
          const p = s.pools.find((x) => x.id === b.id);
          return p ? <BuyCard key={b.id} s={s} p={p} cls={b.span} big={b.big} wide={b.wide} /> : null;
        })}
      </div>
      <p className="mt-5 text-[12px] text-ink-3">{tr('Festive 2025: phones and appliances were 60–65% of online festive sales in India (Redseer, reported by Storyboard18). Pools, brands and prices on this page are sample data.')}</p>
    </section>
  );
}

function BuyCard({ s, p, cls, big, wide }: { s: State; p: Pool; cls: string; big?: boolean; wide?: boolean }) {
  const tr = useT();
  const t = useNow(30000);
  const product = productOf(s, p.productId);
  const best = Math.min(...product.outside.map((q) => q.pricePaise));
  const n = committedCount(p);
  return (
    <Link to={`/buyer/pool/${p.id}`} className={cn('reveal card-lift hue-stage group relative flex overflow-hidden rounded-[32px] border border-line p-6', wide ? 'flex-col sm:flex-row sm:items-center sm:gap-5' : 'flex-col', cls)} style={{ '--hue': artHue(product.art) } as CSSProperties}>
      <div className={cn('relative', big ? 'mx-auto my-4' : wide ? 'shrink-0' : '-mt-1 mb-2')}>
        <ProductArt art={product.art} size={big ? 'min(280px, 70vw)' : wide ? 150 : 120} stage="none" className="transition duration-500 [transition-timing-function:var(--ease-spring)] group-hover:-translate-y-1.5 group-hover:scale-[1.03]" />
      </div>
      <div className={cn('min-w-0', !wide && 'mt-auto')}>
        <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-3">
          <span className="relative flex h-1.5 w-1.5"><span className="pulse-ring absolute inset-0 rounded-full bg-wave" /><span className="relative h-1.5 w-1.5 rounded-full bg-wave" /></span>
          <span className="truncate">{p.areaLabel}</span>
        </div>
        <div className={cn('mt-1.5 font-bold leading-tight text-ink', big ? 'display-tight text-[30px]' : 'text-[18px]')}>{product.short}</div>
        <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
          <div>
            <span className={cn('num-wide font-[780] text-ink', big ? 'text-[44px]' : 'text-[28px]')}>{n}</span>
            <span className="ml-1.5 text-[13px] text-ink-2">{tr('households')}</span>
          </div>
          <div className="pb-1 text-[12.5px] text-ink-3">{tr('Outside today')} <span className="num font-semibold text-ink-2">{inr(best)}</span></div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="rounded-full bg-surface/80 px-2.5 py-1 text-[11.5px] font-semibold text-ink-2 backdrop-blur">{stateLine(p, t, tr)}</span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-surface transition group-hover:rotate-45"><ArrowUpRight className="h-4 w-4" /></span>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------- How it works: six steps, each with a piece of the real UI
function SectionHead({ eyebrow, title, sub, center, dark }: { eyebrow: string; title: ReactNode; sub?: ReactNode; center?: boolean; dark?: boolean }) {
  return (
    <div className={cn('reveal max-w-[760px]', center && 'mx-auto text-center')}>
      <div className={cn('eyebrow', dark ? 'text-aqua' : 'text-brand')}>{eyebrow}</div>
      <h2 className={cn('display mt-4 text-[38px] sm:text-[56px]', dark ? 'text-white' : 'text-ink')}>{title}</h2>
      {sub && <p className={cn('mt-5 text-[17px] leading-relaxed', dark ? 'text-white/65' : 'text-ink-2')}>{sub}</p>}
    </div>
  );
}

function Journey() {
  const s = useSim();
  const tr = useT();
  const phone = s.pools.find((p) => p.id === 'pool-phone');
  const n = phone ? committedCount(phone) : 0;
  const waveBid = phone?.bids.find((b) => b.slabs.length > 1);
  const back = waveBid && n ? Math.floor(potFor(waveBid.slabs, n) / n) : 0;
  const rice = s.pools.find((p) => p.id === 'pool-rice');
  const me = rice?.members.find((m) => m.isMe);
  const offer = rice && me ? offerFor(s, rice, me) : undefined;
  const phoneProduct = phone ? productOf(s, phone.productId) : undefined;
  const steps: Array<{ t: string; b: string; v: ReactNode }> = [
    {
      t: tr('Paste any link'),
      b: tr('Amazon, Flipkart, a shop’s photo or a Telugu voice note. We lock the exact model and variant.'),
      v: (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-[12px] text-ink-3"><Link2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate font-mono">{phoneProduct?.link?.url.replace('https://www.', '') ?? 'flipkart.com/…'}</span></div>
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-save"><Check className="h-4 w-4" strokeWidth={3} />{tr('Exact model locked')}</div>
        </div>
      ),
    },
    {
      t: tr('Neighbours join'),
      b: tr('A refundable booking makes each household a real buyer. One household counts once.'),
      v: (
        <div className="flex items-center">
          {['SK', 'RA', 'IM', 'DP', 'VL', 'AY'].map((x, k) => <span key={x} className="-ml-2 grid h-9 w-9 place-items-center rounded-full border-2 border-surface text-[11px] font-bold text-white first:ml-0" style={{ background: ['#1f57ff', '#00a99a', '#ff5a36', '#7a5cff', '#f5a400', '#0a7d50'][k] }}>{x}</span>)}
          <span className="num ml-2 text-[13px] font-bold text-ink">+{Math.max(0, n - 6)}</span>
        </div>
      ),
    },
    {
      t: tr('Sellers bid in secret'),
      b: tr('Verified local dealers. Bids can only go lower, and nobody sees anyone else’s price.'),
      v: (
        <div className="flex gap-1.5">
          {[0, 1, 2].map((k) => <div key={k} className="relative grid h-12 flex-1 place-items-center rounded-[12px] bg-surface-3"><svg viewBox="0 0 40 26" className="absolute inset-0 h-full w-full p-2.5"><path d="M2 4 L20 15 L38 4" fill="none" stroke="var(--ink-3)" strokeWidth="1.6" /></svg><Lock className="relative mt-4 h-3.5 w-3.5 text-brand" /></div>)}
        </div>
      ),
    },
    {
      t: tr('Your own offer'),
      b: tr('One all-in price for your address. Accept or walk away. Both are one tap, and silence is a refund.'),
      v: (
        <div>
          <div className="num-wide text-[26px] font-[780] leading-none text-ink">{offer ? inr(offer.buyerTotal) : '—'}</div>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-center text-[12px] font-semibold"><span className="rounded-full border-[1.5px] border-line-2 py-1.5 text-ink">{tr('Walk away')}</span><span className="rounded-full border-[1.5px] border-line-2 py-1.5 text-ink">{tr('Accept')}</span></div>
        </div>
      ),
    },
    {
      t: tr('Code at the door'),
      b: tr('A licensed payment company holds your money until you check the box and share your one-time code.'),
      v: (
        <div className="flex gap-1.5">
          {Array.from({ length: 6 }).map((_, k) => <span key={k} className="grid h-11 flex-1 place-items-center rounded-[12px] border-[1.5px] border-line-2 bg-surface text-[18px] font-bold text-ink-3">•</span>)}
        </div>
      ),
    },
    {
      t: tr('Wave Drop'),
      b: tr('Every completed purchase drops money into one pot, split equally among everyone who completed.'),
      v: (
        <div className="relative h-14 overflow-hidden rounded-[14px] bg-wave-soft">
          <Water level={0.55} />
          <div className="relative z-10 flex h-full items-center justify-between px-3 text-[12.5px] font-semibold text-[#04211e]"><span>{tr('Back to each buyer')}</span><span className="num text-[16px] font-[780]">{inr(back)}</span></div>
        </div>
      ),
    },
  ];
  return (
    <section id="how" className="scroll-mt-20 border-y border-line bg-surface py-24">
      <div className="mx-auto max-w-[1180px] px-5">
        <SectionHead eyebrow={tr('How it works')} title={<>{tr('Six steps.')} <span className="serif-it text-brand">{tr('No group chats.')}</span></>} sub={tr('No minimum count, no fake timers, no “deal unlocks at 100 buyers”. Real demand, private competition and a price you can refuse.')} />
        <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((st, k) => (
            <li key={k} className="reveal flex flex-col rounded-[28px] border border-line bg-bg p-6">
              <div className="flex items-center gap-3">
                <span className="num grid h-8 w-8 place-items-center rounded-full bg-ink text-[13px] font-bold text-surface">{k + 1}</span>
                <span className="text-[18px] font-bold text-ink">{st.t}</span>
              </div>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">{st.b}</p>
              <div className="mt-auto pt-5">{st.v}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Honesty: when outside is cheaper, we say so
function Honesty() {
  const s = useSim();
  const tr = useT();
  const pool = s.pools.find((p) => p.id === 'pool-oil');
  const m = pool?.members.find((x) => x.isMe);
  const v = pool && m ? offerFor(s, pool, m) : undefined;
  if (!pool || !v) return null;
  const product = productOf(s, pool.productId);
  return (
    <section className="py-24">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 lg:grid-cols-[1.1fr_1fr]">
        <SectionHead eyebrow={tr('Radical honesty')} title={<>{tr('Sometimes the best advice is:')} <span className="serif-it text-warn">{tr('don’t buy from us.')}</span></>} sub={tr('Ananya has an HDFC and an SBI card. For this oil pool, Flipkart with the SBI card beats the POOL price. So Ananya’s offer says exactly that, and walking away costs nothing. Trust compounds; one bad deal doesn’t.')} />
        <div className="reveal mx-auto w-full max-w-[440px] rounded-[36px] border border-line bg-surface p-5 shadow-[var(--shadow-pop)]">
          <div className="flex items-center gap-3"><ProductArt art={product.art} size={60} /><div><div className="text-[15.5px] font-bold text-ink">{product.short}</div><div className="text-[12.5px] text-ink-3">{tr('Ananya’s offer · real demo data')}</div></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[20px] border border-line bg-bg p-3.5"><div className="text-[11.5px] font-semibold text-ink-3">POOL</div><div className="num-wide mt-0.5 text-[24px] font-[780] text-ink">{inr(v.buyerTotal)}</div></div>
            <div className="rounded-[20px] border-2 border-warn/40 bg-warn-soft p-3.5"><div className="text-[11.5px] font-semibold text-warn">{v.outsideSource}{v.outsideCard ? ' + SBI' : ''}</div><div className="num-wide mt-0.5 text-[24px] font-[780] text-ink">{inr(v.outsideTotal)}</div></div>
          </div>
          <div className="mt-3 rounded-[20px] bg-warn-soft p-4 text-[13.5px] leading-relaxed text-ink-2"><b className="text-ink">{tr('{src} is cheaper for you by {amt}.', { src: v.outsideSource, amt: inr(Math.max(0, -v.saving)) })}</b> {tr('We’d rather tell you. Walk away and your booking comes back in full.')}</div>
          <div className="mt-3 grid grid-cols-2 gap-2"><Link to={`/buyer/offer/${m!.id}`} className="rounded-full border-[1.5px] border-line-2 py-3 text-center text-[14px] font-semibold text-ink">{tr('Walk away')}</Link><Link to={`/buyer/offer/${m!.id}`} className="rounded-full border-[1.5px] border-line-2 py-3 text-center text-[14px] font-semibold text-ink">{tr('See the offer')}</Link></div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Wave Drop: the pot fills as purchases complete
function WaveDrop() {
  const s = useSim();
  const tr = useT();
  const pool = s.pools.find((p) => p.id === 'pool-phone') ?? s.pools.find((p) => p.bids.some((b) => b.slabs.length > 1));
  const bid = useMemo(() => pool?.bids.find((b) => b.slabs.length > 1) ?? pool?.bids.find((b) => b.slabs.length), [pool]);
  const maxN = 300;
  const [n, setN] = useState(() => (pool ? Math.min(maxN, committedCount(pool)) : 120));
  if (!bid || !pool) return null;
  const product = productOf(s, pool.productId);
  const seller = s.sellers.find((x) => x.id === bid.sellerId)?.name ?? '';
  const slabs: Slab[] = bid.slabs;
  const pot = potFor(slabs, n);
  const per = Math.floor(pot / n);
  const marginal = bid.pricePaise - slabAt(slabs, n);
  const maxPot = potFor(slabs, maxN);
  return (
    <section id="wave" className="aurora grain relative scroll-mt-20 overflow-hidden py-24 text-white">
      <div className="caustics" />
      <div className="relative z-10 mx-auto grid max-w-[1180px] items-center gap-12 px-5 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <SectionHead dark eyebrow={tr('The Wave Drop')} title={<>{tr('The more neighbours complete,')} <span className="serif-it text-aqua">{tr('the less everyone pays.')}</span></>} sub={tr('Sellers choose slabs up front, capped at 10% of their price, and the money is held from each payout, so the pot is always funded. Drag to see a real bid from the demo.')} />
          <div className="reveal mt-8 flex items-center gap-3 rounded-[22px] p-3 glass">
            <ProductArt art={product.art} size={52} />
            <div className="min-w-0 text-[13px]"><div className="font-bold">{product.short}</div><div className="text-white/60">{tr('{s}’s bid', { s: seller })} · {slabs.map((sl) => tr('from #{u}: {a}', { u: sl.fromUnit, a: inr(sl.perUnitPaise) })).join(' · ')}</div></div>
          </div>
        </div>
        <div className="reveal">
          <div className="relative h-[360px] overflow-hidden rounded-[40px] glass ring-glow">
            <Water level={0.12 + 0.8 * (pot / Math.max(1, maxPot))} />
            <div className="relative z-10 flex h-full flex-col justify-between p-7">
              <div className="flex items-start justify-between">
                <div><div className="text-[12.5px] text-white/60">{tr('Completed purchases')}</div><Rolling text={String(n)} className="num-wide mt-1 text-[52px] font-[780] leading-none" /></div>
                <div className="text-right"><div className="text-[12.5px] text-white/60">{tr('Pot')}</div><div className="num mt-1 text-[22px] font-bold">{inr(pot)}</div></div>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#04211e]/80">{tr('Back to each buyer')}</div>
                <Rolling text={inr(per)} className="num-wide text-[64px] font-[800] leading-none text-[#04211e]" />
              </div>
            </div>
          </div>
          <input type="range" min={1} max={maxN} value={n} onChange={(e) => setN(Number(e.target.value))} className="mt-6 w-full accent-aqua" aria-label={tr('Completed purchases')} />
          <div className="mt-4 grid grid-cols-2 gap-2 text-[12.5px]">
            <div className="rounded-[18px] p-3.5 glass"><div className="text-white/55">{tr('Seller keeps on sale #{n}', { n })}</div><div className="num text-[18px] font-bold">{inr(marginal)}</div></div>
            <div className="rounded-[18px] p-3.5 glass"><div className="text-white/55">{tr('Of their price')}</div><div className="num text-[18px] font-bold">{Math.round((marginal / bid.pricePaise) * 1000) / 10}%</div></div>
          </div>
          <p className="mt-4 text-[12px] text-white/50">{tr('Slab cap: {p}% of price, so every extra sale stays worth at least {k}% to the seller. Cancelled-by-seller orders still pay their slab.', { p: INDIA.maxSlabBpsOfPrice / 100, k: 100 - INDIA.maxSlabBpsOfPrice / 100 })}</p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- City
function CitySection({ saving }: { saving: number }) {
  const s = useSim();
  const tr = useT();
  const nav = useNavigate();
  const open = s.pools.filter((p) => p.state === 'open');
  const bubbles: MapBubble[] = [];
  for (const p of open) {
    const area = p.track === 'community' ? 'Lakeview Heights' : PIN_AREA[p.pincodes[0]] ?? 'Gachibowli';
    if (!LOCALITIES[area]) continue;
    const ex = bubbles.find((b) => b.area === area && b.tone === (p.track === 'community' ? 'wave' : 'brand'));
    if (ex) ex.value += committedCount(p);
    else bubbles.push({ id: p.id, area, value: committedCount(p), label: `${productOf(s, p.productId).short} · ${committedCount(p)}`, tone: p.track === 'community' ? 'wave' : 'brand', onClick: () => nav(`/buyer/pool/${p.id}`) });
  }
  const households = open.reduce((a, p) => a + committedCount(p), 0);
  const sellers = new Set(s.pools.flatMap((p) => p.bids.map((b) => b.sellerId))).size;
  return (
    <section className="mx-auto max-w-[1180px] px-5 py-24">
      <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <SectionHead eyebrow={tr('Hyderabad first')} title={<>{tr('Demand you can see,')} <span className="serif-it text-brand">{tr('street by street.')}</span></>} sub={tr('Every bubble is a live pool from the demo. Sellers see this as committed demand by pincode, never as names or numbers.')} />
          <div className="reveal mt-8 grid grid-cols-2 gap-3">
            <Stat n={String(households)} l={tr('households pooling now')} />
            <Stat n={String(open.length)} l={tr('open pools in Hyderabad')} />
            <Stat n={String(sellers)} l={tr('verified sellers bidding')} />
            <Stat n={inr(Math.round(saving / 100) * 100)} l={tr('average saving per order')} accent />
          </div>
          <p className="mt-3 text-[11.5px] text-ink-3">{tr('Counts from the demo’s sample data, updated live as you use it.')}</p>
        </div>
        <div className="reveal"><CityMap bubbles={bubbles} className="aspect-[400/280] w-full shadow-[var(--shadow-pop)]" /></div>
      </div>
    </section>
  );
}
const Stat = ({ n, l, accent }: { n: string; l: string; accent?: boolean }) => (
  <div className="rounded-[22px] border border-line bg-surface p-4">
    <div className={cn('num-wide text-[30px] font-[780] leading-none', accent ? 'text-save' : 'text-ink')}>{n}</div>
    <div className="mt-1.5 text-[12.5px] text-ink-3">{l}</div>
  </div>
);

// ---------------------------------------------------------------- India first: three scripts, one product
function IndiaFirst() {
  const tr = useT();
  const items = [
    { icon: Wallet, t: tr('UPI, cards, EMI, pay at door'), b: tr('Pay at the door by UPI or card after checking the box. Never cash, so every rupee can be held and refunded.') },
    { icon: Landmark, t: tr('GST done right'), b: tr('CGST + SGST or IGST by the seller’s state, invoices in your name, TCS and TDS deducted and shown to sellers as credits.') },
    { icon: MessageCircle, t: tr('WhatsApp-native'), b: tr('Neighbours without the app join by voice note and pay by UPI request. Same pool, same rules.') },
    { icon: Mic, t: tr('Telugu, Hindi, English'), b: tr('Voice notes on WhatsApp, a voice assistant, and every screen in three languages, with Indian number formats.') },
    { icon: Lock, t: tr('DPDP Act ready'), b: tr('Consent, access, correction and erasure built in. Sellers never see names before acceptance.') },
    { icon: Globe, t: tr('Built to travel'), b: tr('Units, terms, taxes and fulfilment are data, not code. Rice by the kg, TVs with installation, cement by the bag.') },
  ];
  return (
    <section className="relative overflow-hidden bg-night py-24 text-white">
      <div className="mx-auto max-w-[1180px] px-5">
        <div className="eyebrow reveal text-aqua">{tr('India first')}</div>
        <div className="reveal mt-5 space-y-1 font-[760] leading-[1.02] tracking-[-0.03em]">
          <div className="text-[34px] sm:text-[56px] lg:text-[68px]" lang="te">కొనే ముందు, <span className="text-aqua">POOL</span> చేయండి.</div>
          <div className="text-[34px] text-white/80 sm:text-[56px] lg:text-[68px]" lang="hi">खरीदने से पहले, <span className="text-aqua">POOL</span> कीजिए।</div>
          <div className="text-[34px] text-white/55 sm:text-[56px] lg:text-[68px]">Before you buy it, <span className="text-aqua">POOL</span> it.</div>
        </div>
        <p className="reveal mt-6 max-w-[640px] text-[17px] leading-relaxed text-white/65">{tr('Designed for how India actually buys: in your language, with UPI, GST invoices and WhatsApp, for families buying their first smartphone or their fifth AC.')}</p>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => (
            <div key={i} className="reveal rounded-[26px] border border-white/8 bg-white/[0.04] p-5">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-aqua/15 text-aqua"><it.icon className="h-5 w-5" /></div>
              <div className="mt-4 text-[16.5px] font-bold">{it.t}</div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-white/60">{it.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Three doors
function Doors({ onTour }: { onTour: () => void }) {
  const tr = useT();
  const doors = [
    { to: '/buyer', icon: Heart, art: 'phone' as const, title: tr('For households'), body: tr('Paste a link, join a pool, get one honest offer. Pay by UPI, EMI or at the door, never cash.'), cta: tr('Open the buyer app'), hue: '#1f57ff' },
    { to: '/seller', icon: Store, art: 'tv' as const, title: tr('For local sellers'), body: tr('Bid on pre-paid demand in your pincodes. No listing fees, no ads, no buyer data until they accept. Clear payouts and holds.'), cta: tr('Open the seller app'), hue: '#00a99a' },
    { to: '/buyer/community', icon: Building2, art: 'fan' as const, title: tr('For communities & builders'), body: tr('Move-in pools for a new building: fans, geysers, purifiers, delivered in handover week, installed by brand teams.'), cta: tr('See Lakeview Heights'), hue: '#7a5cff' },
  ];
  return (
    <section id="doors" className="py-24">
      <div className="mx-auto max-w-[1180px] px-5">
        <SectionHead center eyebrow={tr('Three doors, one engine')} title={<>{tr('Walk through any of them.')} <span className="serif-it text-brand">{tr('It all works.')}</span></>} sub={tr('Buyer, seller and the POOL team console share the same live data. Act in one and watch the others change.')} />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {doors.map((d) => (
            <Link key={d.to} to={d.to} className="reveal card-lift hue-stage group relative flex flex-col overflow-hidden rounded-[32px] border border-line p-6" style={{ '--hue': d.hue } as CSSProperties}>
              <div className="flex items-center justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-full text-white shadow-[var(--shadow-card)]" style={{ background: d.hue }}><d.icon className="h-6 w-6" /></div>
                <ProductArt art={d.art} size={84} stage="none" className="-mr-2 -mt-2" />
              </div>
              <div className="display-tight mt-5 text-[24px] text-ink">{d.title}</div>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{d.body}</p>
              <div className="mt-auto flex items-center gap-1.5 pt-6 text-[14.5px] font-semibold text-ink">{d.cta}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div>
            </Link>
          ))}
        </div>
        <div className="reveal mt-4 flex flex-col items-center justify-between gap-4 rounded-[32px] bg-night p-6 text-white sm:flex-row">
          <div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-full bg-white/10"><Landmark className="h-7 w-7 text-aqua" /></div><div><div className="text-[19px] font-bold">{tr('The POOL team console')}</div><div className="text-[14px] text-white/60">{tr('Seller review, awards, pricing, refunds, risk and a ledger that ties out to the paisa.')}</div></div></div>
          <div className="flex gap-2"><Link to="/ops" className="rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-night">{tr('Open the console')}</Link><button onClick={onTour} className="rounded-full px-5 py-3 text-[14px] font-semibold glass">{tr('Guided walkthrough')}</button></div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Promise
function PromiseGrid() {
  const tr = useT();
  const icons = [Wallet, Scale, Check, Lock, Truck, ShieldCheck, BadgeCheck, Users];
  return (
    <section className="border-t border-line bg-surface py-24">
      <div className="mx-auto max-w-[1180px] px-5">
        <SectionHead eyebrow={tr('The POOL Promise')} title={<>{tr('Eight rules we wrote')} <span className="serif-it text-save">{tr('into our terms.')}</span></>} sub={tr('No fake countdowns. No “only 2 left”. No pre-ticked boxes. If a rule costs us a sale, the rule wins.')} />
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROMISE.map((p, i) => {
            const Icon = icons[i];
            return (
              <div key={i} className={cn('reveal rounded-[28px] border border-line bg-bg p-5', i === 0 && 'lg:col-span-2 lg:row-span-2 lg:bg-gradient-to-br lg:from-save-soft lg:to-bg lg:p-8')}>
                <div className={cn('grid place-items-center rounded-full bg-save-soft text-save', i === 0 ? 'h-14 w-14' : 'h-10 w-10')}><Icon className={i === 0 ? 'h-7 w-7' : 'h-5 w-5'} /></div>
                <div className={cn('mt-4 font-bold text-ink', i === 0 ? 'display-tight text-[30px] leading-tight' : 'text-[16px]')}>{tr(p.title)}</div>
                <p className={cn('mt-2 leading-relaxed text-ink-2', i === 0 ? 'text-[16px]' : 'text-[13.5px]')}>{tr(p.body)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Investors: computed from the live ledger, nothing invented
function Investors({ onTour }: { onTour: () => void }) {
  const s = useSim();
  const t = useNow(15000);
  const tr = useT();
  const k = opsKpis(s, t);
  const L = ledger(s, t);
  const tvProfile = profileOf(s, 'delivery_with_installation');
  const sampleBid = s.pools.find((p) => p.id === 'pool-tv')?.bids.find((b) => b.slabs.length > 1);
  const ex = splitOrder({ buyerTotal: 43_000_00, sellerTotal: 40_000_00, gstBps: 1800, profile: tvProfile, waveHold: sampleBid ? Math.max(...sampleBid.slabs.map((x) => x.perUnitPaise)) : 0 });
  const takeRate = k.gmv ? (k.margin / Math.max(1, s.orders.filter((o) => ['handed_over', 'settled'].includes(o.status)).reduce((a, o) => a + o.buyerTotal, 0))) * 100 : 0;
  const rows: Array<[string, number, string?]> = [
    [tr('Buyer pays'), ex.buyerTotal],
    [tr('Seller’s bid'), ex.sellerTotal],
    [tr('POOL margin (incl. GST)'), ex.margin, tr('set by the team per pool')],
    [tr('GST on POOL’s margin'), ex.gstInMargin, '18%'],
    [tr('TCS deducted for the seller'), ex.tcs, '0.5%'],
    [tr('TDS deducted for the seller'), ex.tds, '0.1%'],
    [tr('Installation hold'), ex.holds.reduce((a, h) => a + h.amount, 0), tr('released on job number')],
    [tr('Wave Drop hold'), ex.waveHold, tr('largest slab')],
    [tr('Released to seller on the code'), ex.releaseOnHandover],
  ];
  return (
    <section id="investors" className="aurora grain relative scroll-mt-20 overflow-hidden py-24 text-white">
      <div className="relative z-10 mx-auto max-w-[1180px] px-5">
        <SectionHead dark eyebrow={tr('For investors')} title={<>{tr('A marketplace that earns')} <span className="serif-it text-aqua">{tr('on the spread it creates.')}</span></>} sub={tr('POOL aggregates real, pre-paid demand, makes sellers compete privately, and keeps the difference between their bid and the buyer price it sets. Every number below is computed live from this demo’s ledger.')} />
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <div className="reveal rounded-[32px] p-6 glass lg:col-span-2">
            <div className="flex items-center justify-between"><div className="text-[15px] font-bold">{tr('One TV order, to the paisa')}</div><span className="text-[11.5px] text-white/45">{tr('Walkthrough prices · engine maths')}</span></div>
            <div className="mt-4 divide-y divide-white/10">
              {rows.map(([l, v, h], i) => <div key={i} className={cn('flex items-center justify-between py-2.5 text-[14px]', (i === 2 || i === 8) && 'font-bold')}><span className="text-white/80">{l}{h && <span className="ml-2 text-[11.5px] text-white/40">{h}</span>}</span><span className={cn('num', i === 2 ? 'text-aqua' : 'text-white')}>{inr(v, { exact: v % 100 !== 0 })}</span></div>)}
            </div>
          </div>
          <div className="grid gap-4">
            <Metric l={tr('GMV in the demo')} v={inrCompact(k.gmv)} />
            <Metric l={tr('Take rate on delivered orders')} v={`${takeRate.toFixed(1)}%`} />
            <Metric l={tr('Offers accepted')} v={`${Math.round(k.acceptRate * 100)}%`} />
            <Metric l={tr('Ledger difference')} v={inr(L.difference, { exact: true })} accent />
          </div>
        </div>
        <div className="reveal mt-4 grid gap-4 md:grid-cols-3">
          {[
            [tr('Demand is pre-paid'), tr('Refundable bookings turn interest into committed demand that sellers can plan stock and staff around.')],
            [tr('Margin is not a ranking factor'), tr('Sellers win on price, delivery and rating. POOL prices after the award, so trust and take rate don’t fight.')],
            [tr('Money never sits with POOL'), tr('A licensed payment aggregator holds funds until the code. No wallet, no escrow licence, no float risk.')],
          ].map(([h, b]) => <div key={h} className="rounded-[28px] p-5 glass"><div className="text-[16px] font-bold">{h}</div><p className="mt-2 text-[13.5px] leading-relaxed text-white/65">{b}</p></div>)}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <button onClick={onTour} className="flex h-14 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-night"><Play className="h-4 w-4 fill-current" />{tr('Start the 15-step walkthrough')}</button>
          <Link to="/ops/reconciliation" className="flex h-14 items-center gap-2 rounded-full px-6 text-[15px] font-semibold glass">{tr('Open reconciliation')}<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  );
}
const Metric = ({ l, v, accent }: { l: string; v: string; accent?: boolean }) => (
  <div className="reveal rounded-[28px] p-5 glass">
    <div className="text-[12.5px] text-white/55">{l}</div>
    <div className={cn('num-wide mt-1 text-[34px] font-[780]', accent && 'text-aqua')}>{v}</div>
  </div>
);

// ---------------------------------------------------------------- FAQ & footer
function Faq() {
  const tr = useT();
  const [o, setO] = useState<number | null>(0);
  const qs: Array<[string, string]> = [
    [tr('Is this a real app?'), tr('This is a complete, working demo. Every screen, rule and calculation runs in your browser on sample data. Payments, messages and deliveries are simulated and labelled so.')],
    [tr('How is this different from group-buying apps?'), tr('No minimum-count unlocks, no fake timers. Sellers compete privately for committed demand, and each buyer gets a personal offer they can refuse for free.')],
    [tr('Why would a seller bid lower?'), tr('Pre-paid local demand, batched delivery, no ad spend, and payment guaranteed on the code. The Wave Drop lets them reward volume without a price war.')],
    [tr('What does POOL charge?'), tr('Buyers pay the offer price, nothing else. POOL keeps the difference from the seller’s bid. Sellers pay no listing fees.')],
  ];
  return (
    <section className="mx-auto max-w-[860px] px-5 py-24">
      <SectionHead center eyebrow={tr('Questions')} title={tr('Asked by buyers, sellers and investors.')} />
      <div className="mt-10 space-y-2">
        {qs.map(([q, a], i) => (
          <div key={i} className="overflow-hidden rounded-[24px] border border-line bg-surface">
            <button onClick={() => setO(o === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-[16.5px] font-semibold text-ink" aria-expanded={o === i}>{q}<span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-3 transition', o === i && 'rotate-180 bg-ink text-surface')}><ChevronDown className="h-4 w-4" /></span></button>
            {o === i && <p className="rise px-6 pb-6 text-[15px] leading-relaxed text-ink-2">{a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  const tr = useT();
  return (
    <footer className="bg-night text-white">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2"><Mark size={36} /><span className="text-[24px] font-[800] tracking-[0.02em] [font-stretch:118%]">POOL</span></div>
          <p className="mt-3 max-w-[320px] text-[14px] text-white/55">{tr('Before you buy it, POOL it. Neighbourhood buying power for India, starting in Hyderabad.')}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[12px] text-white/60"><KeyRound className="h-3.5 w-3.5 text-aqua" />{tr('Simulated demo · sample data')}</div>
        </div>
        <FootCol h={tr('Product')} links={[['/buyer', tr('Buyer app')], ['/seller', tr('Seller app')], ['/ops', tr('POOL console')], ['/buyer/whatsapp', 'WhatsApp']]} />
        <FootCol h={tr('Trust')} links={[['/buyer/help/promise', tr('The POOL Promise')], ['/buyer/help/ranking', tr('How sellers are chosen')], ['/buyer/help/legal/refunds', tr('Refund policy')], ['/buyer/help/legal/grievance', tr('Grievance officer')]]} />
        <FootCol h={tr('Legal')} links={[['/buyer/help/legal/terms', tr('Terms')], ['/buyer/help/legal/privacy', tr('Privacy')], ['/buyer/account/privacy', tr('Your data')]]} />
      </div>
      <div className="border-t border-white/10"><div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-5 py-5 text-[12px] text-white/45 sm:flex-row sm:justify-between"><span>{tr('Demo with sample brands, sellers and people. No real money moves. Prices and offers are illustrative.')}</span><span>© 2026 POOL · build {__POOL_BUILD__}</span></div></div>
    </footer>
  );
}
const FootCol = ({ h, links }: { h: string; links: Array<[string, string]> }) => <div><div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/40">{h}</div><ul className="mt-3 space-y-2">{links.map(([to, l]) => <li key={to}><Link to={to} className="text-[14px] text-white/75 hover:text-white">{l}</Link></li>)}</ul></div>;
