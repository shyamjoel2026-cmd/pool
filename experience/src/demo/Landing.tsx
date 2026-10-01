import { ArrowRight, BadgeCheck, Building2, Check, ChevronDown, ClipboardPaste, Globe, Heart, KeyRound, Landmark, Languages, Lock, MessageCircle, Mic, Play, Scale, ShieldCheck, Sparkles, Store, Truck, Users, Waves, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { INDIA } from '../lib/gst';
import { LANGS, useT } from '../lib/i18n';
import { inr, inrCompact } from '../lib/money';
import { fmtWhen } from '../lib/time';
import { committedCount, effectiveOutside, offerFor, potFor, productOf, profileOf, slabAt, splitOrder } from '../sim/engine';
import { ledger, opsKpis } from '../sim/selectors';
import { setPrefs, setTour, useNow, useSim } from '../sim/store';
import type { Slab } from '../sim/types';
import { ProductArt } from '../ui/ProductArt';
import { Logo, Mark } from '../ui/Logo';
import { CityMap, LOCALITIES, PIN_AREA, type MapBubble } from '../ui/visuals';
import { GUIDE } from './guide';
import { PROMISE } from '../buyer/Account';

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
  const sellers = new Set(s.pools.flatMap((p) => p.bids.map((b) => b.sellerId))).size;
  const k = opsKpis(s, t);
  return (
    <div className="min-h-screen bg-bg text-ink">
      <Nav onTour={startTour} />
      <Hero onTour={startTour} households={households} pools={openPools.length} />
      <LiveStrip households={households} pools={openPools.length} sellers={sellers} saving={k.avgSaving} />
      <HowItWorks />
      <Honesty />
      <WaveSlider />
      <CitySection />
      <Doors onTour={startTour} />
      <PromiseGrid />
      <IndiaFirst />
      <Investors onTour={startTour} />
      <Faq />
      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------- Nav
function Nav({ onTour }: { onTour: () => void }) {
  const s = useSim();
  const tr = useT();
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto mt-3 flex max-w-[1180px] items-center gap-3 rounded-[18px] px-3 py-2 text-white glass sm:mx-4 lg:mx-auto">
        <Link to="/" className="shrink-0"><Logo size={30} /></Link>
        <nav className="ml-6 hidden items-center gap-1 text-[14px] text-white/75 md:flex">
          {[['#how', tr('How it works')], ['#wave', tr('Wave Drop')], ['#doors', tr('Sellers & builders')], ['#investors', tr('Investors')]].map(([h, l]) => <a key={h} href={h} onClick={(e) => { e.preventDefault(); document.querySelector(h)?.scrollIntoView({ behavior: 'smooth' }); }} className="rounded-[10px] px-3 py-1.5 hover:bg-white/10 hover:text-white">{l}</a>)}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="relative">
            <button onClick={() => setOpen(!open)} className="flex h-9 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] text-white/80 hover:bg-white/10" aria-label="Language"><Languages className="h-4 w-4" />{LANGS.find((l) => l.id === s.prefs.lang)!.native}</button>
            {open && <div className="absolute right-0 top-11 w-36 overflow-hidden rounded-[12px] bg-surface text-ink shadow-[var(--shadow-pop)]">{LANGS.map((l) => <button key={l.id} onClick={() => { setPrefs({ lang: l.id }); setOpen(false); }} className="block w-full px-3 py-2.5 text-left text-[14px] hover:bg-surface-2">{l.native}</button>)}</div>}
          </div>
          <button onClick={onTour} className="hidden h-9 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold text-white/85 hover:bg-white/10 sm:flex"><Play className="h-3.5 w-3.5" />{tr('Walkthrough')}</button>
          <Link to="/buyer" className="flex h-9 items-center gap-1.5 rounded-[10px] bg-white px-3.5 text-[13.5px] font-semibold text-night">{tr('Open the app')}<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------- Hero with a live, honest story
function Hero({ onTour, households, pools }: { onTour: () => void; households: number; pools: number }) {
  const tr = useT();
  const nav = useNavigate();
  return (
    <section className="aurora grain relative overflow-hidden pb-20 pt-28 text-white sm:pt-32">
      <div className="relative z-10 mx-auto grid max-w-[1180px] items-center gap-12 px-5 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-white/85 glass"><span className="h-2 w-2 animate-pulse rounded-full bg-[#7ff0e6]" />{tr('{n} households pooling in {p} pools right now · Hyderabad', { n: households, p: pools })}</div>
          <h1 className="display mt-6 text-[46px] sm:text-[64px] lg:text-[76px]">
            {tr('Before you buy it,')}<br /><span className="text-gradient">{tr('POOL it.')}</span>
          </h1>
          <p className="mt-6 max-w-[540px] text-[17px] leading-relaxed text-white/70 sm:text-[19px]">{tr('Neighbours who want the same thing join one pool. Verified local sellers bid privately for all of you. You get a personal price, delivered and installed, and pay only if you say yes.')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => nav('/buyer/find?link=tv')} className="group flex h-[54px] items-center gap-2 rounded-[16px] bg-white px-5 text-[15.5px] font-semibold text-night shadow-[0_20px_50px_-15px_rgba(127,240,230,.5)] transition hover:-translate-y-0.5"><ClipboardPaste className="h-5 w-5 text-brand" />{tr('Paste a product link')}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></button>
            <button onClick={onTour} className="flex h-[54px] items-center gap-2 rounded-[16px] px-5 text-[15.5px] font-semibold text-white glass transition hover:bg-white/10"><Play className="h-4.5 w-4.5" />{tr('Walk the whole business · 15 steps')}</button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-white/60">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#7ff0e6]" />{tr('Refundable booking')}</span>
            <span className="flex items-center gap-1.5"><Lock className="h-4 w-4 text-[#7ff0e6]" />{tr('Money held until your code')}</span>
            <span className="flex items-center gap-1.5"><Scale className="h-4 w-4 text-[#7ff0e6]" />{tr('We tell you when Amazon is cheaper')}</span>
          </div>
        </div>
        <StoryCard />
      </div>
      <a href="#how" onClick={(e) => { e.preventDefault(); document.querySelector('#how')?.scrollIntoView({ behavior: 'smooth' }); }} className="relative z-10 mx-auto mt-14 flex w-fit flex-col items-center gap-1 text-[12px] text-white/45"><span>{tr('See how it works')}</span><ChevronDown className="float-y h-4 w-4" /></a>
    </section>
  );
}

/** Self-playing story of one TV pool, using the demo's own numbers. */
function StoryCard() {
  const s = useSim();
  const t = useNow(1000);
  const tr = useT();
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const i = setInterval(() => setStep((x) => (x + 1) % 5), 3200);
    return () => clearInterval(i);
  }, [paused]);
  const pool = s.pools.find((p) => p.id === 'pool-tv')!;
  const product = productOf(s, pool.productId);
  const amazon = product.outside.find((q) => q.source.startsWith('Amazon')) ?? product.outside[0];
  const withCard = effectiveOutside(amazon, [{ id: 'x', bank: amazon.cardOffer?.bank ?? '', type: amazon.cardOffer?.cardType ?? 'credit', network: '' }]);
  const n = committedCount(pool);
  const examplePrice = 43_000_00;
  const waveBid = pool.bids.find((b) => b.slabs.length > 1) ?? pool.bids[0];
  const pot = waveBid ? potFor(waveBid.slabs, n) : 0;
  const perBuyer = n ? Math.floor(pot / n) : 0;
  const steps = [tr('Paste'), tr('Pool'), tr('Bids'), tr('Offer'), tr('Wave')];
  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-brand/30 via-transparent to-wave/30 blur-2xl" />
      <div className="relative overflow-hidden rounded-[28px] p-5 glass ring-glow sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">{steps.map((l, i) => <button key={l} onClick={() => setStep(i)} className={cn('rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition', step === i ? 'bg-white text-night' : 'text-white/55 hover:text-white')}>{l}</button>)}</div>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/40">{tr('Live demo data')}</span>
        </div>
        <div className="mt-5 min-h-[300px]">
          {step === 0 && (
            <div key="s0" className="step-in space-y-4">
              <div className="rounded-[14px] bg-white/[0.08] px-3.5 py-3 font-mono text-[12px] text-white/70">{product.link?.url ?? 'amazon.in/…'}</div>
              <div className="flex gap-4">
                <ProductArt art={product.art} size={92} rounded={20} />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-[#7ff0e6]">{tr('Exact model confirmed')} · {product.link?.idLabel} {product.link?.idValue}</div>
                  <div className="mt-1 text-[18px] font-bold leading-snug">{product.title}</div>
                  <div className="mt-2 text-[13px] text-white/60">{amazon.source}: <span className="num font-semibold text-white">{inr(amazon.pricePaise)}</span>{amazon.cardOffer && <> · {tr('with {b} card', { b: amazon.cardOffer.bank.split(' ')[0] })} <span className="num font-semibold text-white">{inr(withCard.price)}</span></>}</div>
                </div>
              </div>
              <p className="text-[12.5px] text-white/50">{tr('We read the link you paste. We never open or scrape the store’s page.')}</p>
            </div>
          )}
          {step === 1 && (
            <div key="s1" className="step-in">
              <div className="num count-glow text-[64px] font-bold leading-none">{n}</div>
              <div className="mt-1 text-[16px] font-semibold">{tr('households in Hyderabad West paid a refundable booking')}</div>
              <div className="mt-5 flex flex-wrap gap-1.5">{Array.from({ length: Math.min(n, 40) }).map((_, i) => <span key={i} className="envelope-drop grid h-7 w-7 place-items-center rounded-full bg-white/10 text-[10px] font-bold text-white/70" style={{ animationDelay: `${i * 25}ms` }}>{String.fromCharCode(65 + ((i * 7) % 26))}</span>)}</div>
              <div className="mt-5 text-[13px] text-white/60">{tr('Closes {t}, the time its starter chose. Only paid bookings count, once per household.', { t: fmtWhen(pool.closesAt, t) })}</div>
            </div>
          )}
          {step === 2 && (
            <div key="s2" className="step-in">
              <div className="flex items-center gap-2 text-[16px] font-semibold"><Lock className="h-5 w-5 text-[#7ff0e6]" />{tr('{n} sealed bids from verified sellers', { n: pool.bids.length })}</div>
              <div className="mt-5 grid grid-cols-3 gap-2.5">{pool.bids.map((b, i) => <div key={b.id} className="envelope-drop relative h-20 rounded-[14px] bg-white/[0.08]" style={{ animationDelay: `${i * 120}ms` }}><svg viewBox="0 0 40 26" className="absolute inset-0 h-full w-full p-3"><path d="M2 4 L20 15 L38 4" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.6" /></svg><span className="absolute bottom-2 left-3 text-[10.5px] text-white/45">{tr('Price hidden')}</span></div>)}</div>
              <div className="mt-5 text-[13px] text-white/60">{tr('Nobody sees another seller’s price. They can lower a bid before close, never raise it. Every view is logged.')}</div>
            </div>
          )}
          {step === 3 && (
            <div key="s3" className="step-in">
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/50">{tr('Your personal offer')}</div>
              <div className="num mt-2 text-[56px] font-bold leading-none tracking-[-0.03em]">{inr(examplePrice)}</div>
              <div className="mt-2 text-[14px] text-white/65">{tr('All-in: GST, delivery and installation. Guaranteed for 24 hours.')}</div>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <div className="rounded-[14px] bg-white/[0.08] p-3"><div className="text-[11.5px] text-white/50">{tr('Amazon with HDFC card')}</div><div className="num text-[18px] font-bold">{inr(withCard.price)}</div></div>
                <div className="rounded-[14px] bg-[#7ff0e6]/15 p-3"><div className="text-[11.5px] text-[#7ff0e6]">{tr('You save')}</div><div className="num text-[18px] font-bold text-[#7ff0e6]">{inr(Math.max(0, withCard.price - examplePrice))}</div></div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2"><span className="rounded-[12px] border border-white/25 py-2.5 text-center text-[13.5px] font-semibold">{tr('Walk away')}</span><span className="rounded-[12px] bg-white py-2.5 text-center text-[13.5px] font-semibold text-night">{tr('Accept')}</span></div>
              <div className="mt-2 text-[11px] text-white/40">{tr('Example price: the TV pool is still open in the demo.')}</div>
            </div>
          )}
          {step === 4 && (
            <div key="s4" className="step-in">
              <div className="relative h-40 overflow-hidden rounded-[18px] bg-white/[0.06]">
                <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#0b9e97] to-[#7ff0e6]/60"><svg className="wave-move absolute -top-[10px] left-0 h-[12px] w-[200%]" viewBox="0 0 400 12" preserveAspectRatio="none"><path d="M0 6 Q25 0 50 6 T100 6 T150 6 T200 6 T250 6 T300 6 T350 6 T400 6 V12 H0Z" fill="#7ff0e6" opacity=".6" /></svg></div>
                <div className="relative p-4"><div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/60">{tr('Wave Drop')}</div><div className="num mt-1 text-[40px] font-bold">{inr(perBuyer)}</div><div className="text-[13px] text-white/80">{tr('back to each buyer if all {n} complete', { n })}</div></div>
              </div>
              <div className="mt-4 text-[13px] text-white/60">{tr('Each completed purchase drops a slab the seller set into one pot ({pot} here). Split equally when every order is final. Real numbers, never a promise.', { pot: inr(pot) })}</div>
            </div>
          )}
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10"><div key={step + (paused ? 'p' : '')} className="h-full rounded-full bg-[#7ff0e6]" style={{ width: paused ? `${(step + 1) * 20}%` : undefined, animation: paused ? undefined : 'grow 3.2s linear both' }} /></div>
        <style>{'@keyframes grow{from{width:0}to{width:100%}}'}</style>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Live strip + marquee
function LiveStrip({ households, pools, sellers, saving }: { households: number; pools: number; sellers: number; saving: number }) {
  const s = useSim();
  const tr = useT();
  const items = s.pools.filter((p) => p.state === 'open');
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-6 px-5 py-8 md:grid-cols-4">
        <Stat n={String(households)} l={tr('households pooling now')} />
        <Stat n={String(pools)} l={tr('open pools in Hyderabad')} />
        <Stat n={String(sellers)} l={tr('verified sellers bidding')} />
        <Stat n={inr(Math.round(saving / 100) * 100)} l={tr('average saving per order')} accent />
      </div>
      <div className="relative overflow-hidden border-t border-line py-4">
        <div className="marquee flex w-max gap-3">
          {[...items, ...items].map((p, i) => {
            const prod = productOf(s, p.productId);
            return <Link key={i} to={`/buyer/pool/${p.id}`} className="flex items-center gap-2.5 rounded-full border border-line bg-surface-2 py-1.5 pl-1.5 pr-4"><ProductArt art={prod.art} size={32} rounded={999} /><span className="text-[13px] font-semibold text-ink">{prod.short}</span><span className="num text-[12px] text-ink-3">{committedCount(p)} {tr('households')}</span></Link>;
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-surface" /><div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-surface" />
      </div>
      <div className="pb-3 text-center text-[11px] text-ink-3">{tr('Counts from the demo’s sample data, updated live as you use it.')}</div>
    </section>
  );
}
const Stat = ({ n, l, accent }: { n: string; l: string; accent?: boolean }) => <div><div className={cn('num display text-[34px] sm:text-[42px]', accent ? 'text-gradient-ink' : 'text-ink')}>{n}</div><div className="mt-1 text-[13.5px] text-ink-3">{l}</div></div>;

// ---------------------------------------------------------------- How it works
function SectionHead({ eyebrow, title, sub, center, dark }: { eyebrow: string; title: ReactNode; sub?: ReactNode; center?: boolean; dark?: boolean }) {
  return (
    <div className={cn('reveal max-w-[720px]', center && 'mx-auto text-center')}>
      <div className={cn('eyebrow', dark ? 'text-[#7ff0e6]' : 'text-brand')}>{eyebrow}</div>
      <h2 className={cn('display mt-3 text-[34px] sm:text-[48px]', dark ? 'text-white' : 'text-ink')}>{title}</h2>
      {sub && <p className={cn('mt-4 text-[16.5px] leading-relaxed', dark ? 'text-white/65' : 'text-ink-2')}>{sub}</p>}
    </div>
  );
}

function HowItWorks() {
  const tr = useT();
  const steps = [
    { icon: ClipboardPaste, t: tr('Paste, scan or ask'), b: tr('Any store link, a barcode, or a voice note in Telugu. We confirm the exact model and show the best outside price, with your own card offers.'), tone: 'from-brand/15' },
    { icon: Users, t: tr('Join or start a pool'), b: tr('A refundable booking makes you a real buyer. The starter picks the closing time; it can only move later if everyone agrees.'), tone: 'from-wave/15' },
    { icon: Lock, t: tr('Sellers bid in private'), b: tr('Verified local dealers bid sealed prices, capacity and delivery dates. The published rule picks the winner. POOL’s fee never does.'), tone: 'from-sim/15' },
    { icon: Sparkles, t: tr('Your personal offer'), b: tr('A guaranteed price for your quantity and address. Accept and Walk away are equal buttons. No reply means a full refund.'), tone: 'from-warn/15' },
    { icon: KeyRound, t: tr('Check the box, then the code'), b: tr('Pay now, by EMI, or at your door by UPI. A payment company holds the money until you give a one-time code.'), tone: 'from-save/15' },
    { icon: Waves, t: tr('Wave Drop'), b: tr('Every completed purchase drops a slab into a shared pot. When the wave closes, it is split equally among buyers who completed.'), tone: 'from-wave/20' },
  ];
  return (
    <section id="how" className="mx-auto max-w-[1180px] px-5 py-24">
      <SectionHead eyebrow={tr('How it works')} title={<>{tr('Group buying, rebuilt')}<br />{tr('around one honest offer.')}</>} sub={tr('No group chats, no chasing a minimum count, no “deal unlocks at 100 buyers”. Just real demand, private competition and a price you can refuse.')} />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((st, i) => (
          <div key={i} className={cn('reveal card-lift relative overflow-hidden rounded-[24px] border border-line bg-gradient-to-br to-surface p-6', st.tone)}>
            <div className="flex items-center justify-between"><div className="grid h-12 w-12 place-items-center rounded-[16px] bg-surface text-ink shadow-[var(--shadow-card)]"><st.icon className="h-6 w-6" /></div><span className="num text-[44px] font-bold text-ink/[0.07]">0{i + 1}</span></div>
            <div className="mt-5 text-[19px] font-bold text-ink">{st.t}</div>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{st.b}</p>
          </div>
        ))}
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
    <section className="bg-surface py-24">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 lg:grid-cols-2">
        <SectionHead eyebrow={tr('Radical honesty')} title={tr('Sometimes the best advice is: don’t buy from us.')} sub={tr('Ananya has an HDFC and an SBI card. For this oil pool, Flipkart with the SBI card beats the POOL price. So Ananya’s offer says exactly that, and walking away costs nothing. Trust compounds; one bad deal doesn’t.')} />
        <div className="reveal mx-auto w-full max-w-[420px] rounded-[28px] border border-line bg-bg p-5 shadow-[var(--shadow-pop)]">
          <div className="flex items-center gap-3"><ProductArt art={product.art} size={56} /><div><div className="text-[15px] font-bold text-ink">{product.short}</div><div className="text-[12.5px] text-ink-3">{tr('Ananya’s offer · real demo data')}</div></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[16px] border border-line bg-surface p-3"><div className="text-[11.5px] text-ink-3">POOL</div><div className="num text-[22px] font-bold text-ink">{inr(v.buyerTotal)}</div></div>
            <div className="rounded-[16px] border-2 border-warn/40 bg-warn-soft p-3"><div className="text-[11.5px] text-warn">{v.outsideSource}{v.outsideCard ? ' + SBI' : ''}</div><div className="num text-[22px] font-bold text-ink">{inr(v.outsideTotal)}</div></div>
          </div>
          <div className="mt-3 rounded-[16px] bg-warn-soft p-3.5 text-[13.5px] text-ink-2"><b className="text-ink">{tr('{src} is cheaper for you by {amt}.', { src: v.outsideSource, amt: inr(Math.max(0, -v.saving)) })}</b> {tr('We’d rather tell you. Walk away and your booking comes back in full.')}</div>
          <div className="mt-3 grid grid-cols-2 gap-2"><Link to={`/buyer/offer/${m!.id}`} className="rounded-[12px] border-2 border-ink/80 py-2.5 text-center text-[14px] font-semibold text-ink">{tr('Walk away')}</Link><Link to={`/buyer/offer/${m!.id}`} className="rounded-[12px] bg-brand py-2.5 text-center text-[14px] font-semibold text-white">{tr('See the offer')}</Link></div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Wave Drop slider: every extra sale still pays the seller
function WaveSlider() {
  const s = useSim();
  const tr = useT();
  const bid = useMemo(() => s.pools.find((p) => p.id === 'pool-washer')?.bids.find((b) => b.slabs.length > 0) ?? s.pools.flatMap((p) => p.bids).find((b) => b.slabs.length > 1), [s.pools]);
  const [n, setN] = useState(40);
  if (!bid) return null;
  const pool = s.pools.find((p) => p.id === bid.poolId)!;
  const product = productOf(s, pool.productId);
  const slabs: Slab[] = bid.slabs;
  const pot = potFor(slabs, n);
  const per = Math.floor(pot / n);
  const marginal = bid.pricePaise - slabAt(slabs, n);
  const maxN = 120;
  const bars = Array.from({ length: 24 }, (_, i) => Math.round(((i + 1) / 24) * maxN));
  const maxPer = Math.max(...bars.map((x) => Math.floor(potFor(slabs, x) / x)), 1);
  return (
    <section id="wave" className="aurora grain relative overflow-hidden py-24 text-white">
      <div className="relative z-10 mx-auto grid max-w-[1180px] gap-12 px-5 lg:grid-cols-[1fr_1.1fr]">
        <SectionHead dark eyebrow={tr('The Wave Drop')} title={tr('The more neighbours complete, the less everyone pays.')} sub={tr('Sellers choose slabs up front, capped at 10% of their price, and the money is held from each payout, so the pot is always funded. Drag to see a real bid from the demo.')} />
        <div className="reveal rounded-[28px] p-6 glass ring-glow">
          <div className="flex items-center gap-3"><ProductArt art={product.art} size={48} /><div><div className="text-[14.5px] font-bold">{product.short}</div><div className="text-[12.5px] text-white/55">{tr('{s}’s bid', { s: s.sellers.find((x) => x.id === bid.sellerId)?.name ?? '' })} · {inr(bid.pricePaise)} · {slabs.map((sl) => tr('from #{u}: {a}', { u: sl.fromUnit, a: inr(sl.perUnitPaise) })).join(' · ')}</div></div></div>
          <div className="mt-6 flex items-end justify-between"><div><div className="text-[12.5px] text-white/55">{tr('Completed purchases')}</div><div className="num text-[44px] font-bold leading-none">{n}</div></div><div className="text-right"><div className="text-[12.5px] text-white/55">{tr('Back to each buyer')}</div><div className="num text-[44px] font-bold leading-none text-[#7ff0e6]">{inr(per)}</div></div></div>
          <input type="range" min={1} max={maxN} value={n} onChange={(e) => setN(Number(e.target.value))} className="mt-6 w-full accent-[#7ff0e6]" aria-label={tr('Completed purchases')} />
          <div className="mt-5 flex h-24 items-end gap-1">{bars.map((x) => { const v = Math.floor(potFor(slabs, x) / x); return <div key={x} className={cn('flex-1 rounded-t-[4px] transition-colors', x <= n ? 'bg-[#7ff0e6]' : 'bg-white/15')} style={{ height: `${Math.max(3, (v / maxPer) * 100)}%` }} />; })}</div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-[12px]">
            <div className="rounded-[14px] bg-white/[0.07] p-3"><div className="text-white/55">{tr('Pot')}</div><div className="num text-[17px] font-bold">{inr(pot)}</div></div>
            <div className="rounded-[14px] bg-white/[0.07] p-3"><div className="text-white/55">{tr('Seller keeps on sale #{n}', { n })}</div><div className="num text-[17px] font-bold">{inr(marginal)}</div></div>
            <div className="rounded-[14px] bg-white/[0.07] p-3"><div className="text-white/55">{tr('Of their price')}</div><div className="num text-[17px] font-bold">{Math.round((marginal / bid.pricePaise) * 1000) / 10}%</div></div>
          </div>
          <p className="mt-4 text-[12px] text-white/50">{tr('Slab cap: {p}% of price, so every extra sale stays worth at least {k}% to the seller. Cancelled-by-seller orders still pay their slab.', { p: INDIA.maxSlabBpsOfPrice / 100, k: 100 - INDIA.maxSlabBpsOfPrice / 100 })}</p>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- City
function CitySection() {
  const s = useSim();
  const tr = useT();
  const nav = useNavigate();
  const t = useNow(30000);
  const open = s.pools.filter((p) => p.state === 'open');
  const bubbles: MapBubble[] = [];
  for (const p of open) {
    const area = p.track === 'community' ? 'Lakeview Heights' : PIN_AREA[p.pincodes[0]] ?? 'Gachibowli';
    if (!LOCALITIES[area]) continue;
    const ex = bubbles.find((b) => b.area === area && b.tone === (p.track === 'community' ? 'wave' : 'brand'));
    if (ex) ex.value += committedCount(p);
    else bubbles.push({ id: p.id, area, value: committedCount(p), label: `${productOf(s, p.productId).short} · ${committedCount(p)}`, tone: p.track === 'community' ? 'wave' : 'brand', onClick: () => nav(`/buyer/pool/${p.id}`) });
  }
  return (
    <section className="mx-auto max-w-[1180px] px-5 py-24">
      <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHead eyebrow={tr('Hyderabad first')} title={tr('Demand you can see, street by street.')} sub={tr('Every bubble is a live pool from the demo. Sellers see this as committed demand by pincode, never as names or numbers.')} />
          <div className="reveal mt-8 space-y-2">
            {open.slice(0, 5).map((p) => {
              const prod = productOf(s, p.productId);
              return <Link key={p.id} to={`/buyer/pool/${p.id}`} className="card-lift flex items-center gap-3 rounded-[16px] border border-line bg-surface p-3"><ProductArt art={prod.art} size={44} /><div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold text-ink">{prod.short}</div><div className="text-[12px] text-ink-3">{p.areaLabel} · {tr('closes')} {fmtWhen(p.closesAt, t)}</div></div><span className="num rounded-full bg-brand-soft px-2.5 py-1 text-[12.5px] font-bold text-brand-ink">{committedCount(p)}</span></Link>;
            })}
          </div>
        </div>
        <div className="reveal"><CityMap bubbles={bubbles} className="aspect-[400/280] w-full shadow-[var(--shadow-pop)]" /></div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Three doors
function Doors({ onTour }: { onTour: () => void }) {
  const tr = useT();
  const doors = [
    { to: '/buyer', icon: Heart, title: tr('For households'), body: tr('Paste a link, join a pool, get one honest offer. Pay by UPI, EMI or at the door, never cash.'), cta: tr('Open the buyer app'), cls: 'from-brand to-[#5b75ff]' },
    { to: '/seller', icon: Store, title: tr('For local sellers'), body: tr('Bid on pre-paid demand in your pincodes. No listing fees, no ads, no buyer data until they accept. Clear payouts and holds.'), cta: tr('Open the seller app'), cls: 'from-[#0b9e97] to-[#34c9b8]' },
    { to: '/buyer/community', icon: Building2, title: tr('For communities & builders'), body: tr('Move-in pools for a new building: fans, geysers, purifiers, delivered in handover week, installed by brand teams.'), cta: tr('See Lakeview Heights'), cls: 'from-[#6447c9] to-[#8f75ff]' },
  ];
  return (
    <section id="doors" className="bg-surface py-24">
      <div className="mx-auto max-w-[1180px] px-5">
        <SectionHead center eyebrow={tr('Three doors, one engine')} title={tr('Walk through any of them. It all works.')} sub={tr('Buyer, seller and the POOL team console share the same live data. Act in one and watch the others change.')} />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {doors.map((d) => (
            <Link key={d.to} to={d.to} className="reveal card-lift group relative overflow-hidden rounded-[28px] border border-line bg-bg p-6">
              <div className={cn('grid h-14 w-14 place-items-center rounded-[18px] bg-gradient-to-br text-white shadow-[var(--shadow-pop)]', d.cls)}><d.icon className="h-7 w-7" /></div>
              <div className="mt-6 text-[22px] font-bold text-ink">{d.title}</div>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{d.body}</p>
              <div className="mt-6 flex items-center gap-1.5 text-[14.5px] font-semibold text-brand">{d.cta}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div>
            </Link>
          ))}
        </div>
        <div className="reveal mt-4 flex flex-col items-center justify-between gap-4 rounded-[28px] bg-night p-6 text-white sm:flex-row">
          <div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-[18px] bg-white/10"><Landmark className="h-7 w-7 text-[#7ff0e6]" /></div><div><div className="text-[19px] font-bold">{tr('The POOL team console')}</div><div className="text-[14px] text-white/60">{tr('Seller review, awards, pricing, refunds, risk and a ledger that ties out to the paisa.')}</div></div></div>
          <div className="flex gap-2"><Link to="/ops" className="rounded-[14px] bg-white px-4 py-3 text-[14px] font-semibold text-night">{tr('Open the console')}</Link><button onClick={onTour} className="rounded-[14px] px-4 py-3 text-[14px] font-semibold glass">{tr('Guided walkthrough')}</button></div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Promise bento
function PromiseGrid() {
  const tr = useT();
  const icons = [Wallet, Scale, Check, Lock, Truck, ShieldCheck, BadgeCheck, Users];
  return (
    <section className="mx-auto max-w-[1180px] px-5 py-24">
      <SectionHead eyebrow={tr('The POOL Promise')} title={tr('Eight rules we wrote into our terms.')} sub={tr('No fake countdowns. No “only 2 left”. No pre-ticked boxes. If a rule costs us a sale, the rule wins.')} />
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PROMISE.map((p, i) => {
          const Icon = icons[i];
          return (
            <div key={i} className={cn('reveal card-lift rounded-[22px] border border-line bg-surface p-5', i === 0 && 'lg:col-span-2 lg:row-span-2 lg:bg-gradient-to-br lg:from-save-soft lg:to-surface lg:p-7')}>
              <Icon className={cn('text-save', i === 0 ? 'h-9 w-9' : 'h-6 w-6')} />
              <div className={cn('mt-4 font-bold text-ink', i === 0 ? 'text-[26px] leading-tight' : 'text-[16px]')}>{tr(p.title)}</div>
              <p className={cn('mt-2 leading-relaxed text-ink-2', i === 0 ? 'text-[15.5px]' : 'text-[13.5px]')}>{tr(p.body)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- India first
function IndiaFirst() {
  const tr = useT();
  const items = [
    { icon: Wallet, t: tr('UPI, cards, EMI, pay at door'), b: tr('Pay at the door by UPI or card after checking the box. Never cash, so every rupee can be held and refunded.') },
    { icon: Landmark, t: tr('GST done right'), b: tr('CGST + SGST or IGST by the seller’s state, invoices in your name, TCS and TDS deducted and shown to sellers as credits.') },
    { icon: Mic, t: tr('Telugu, Hindi, English'), b: tr('Voice notes on WhatsApp, a voice assistant, and every screen in three languages, with Indian number formats.') },
    { icon: MessageCircle, t: tr('WhatsApp-native'), b: tr('Neighbours without the app join by voice note and pay by UPI request. Same pool, same rules.') },
    { icon: Lock, t: tr('DPDP Act ready'), b: tr('Consent, access, correction and erasure built in. Sellers never see names before acceptance.') },
    { icon: Globe, t: tr('Built to travel'), b: tr('Units, terms, taxes and fulfilment are data, not code. Rice by the kg, TVs with installation, cement by the bag.') },
  ];
  return (
    <section className="bg-surface py-24">
      <div className="mx-auto max-w-[1180px] px-5">
        <SectionHead eyebrow={tr('India first')} title={tr('Designed for how India actually buys.')} />
        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => <div key={i} className="reveal flex gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-brand-soft text-brand"><it.icon className="h-5 w-5" /></div><div><div className="text-[16.5px] font-bold text-ink">{it.t}</div><p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{it.b}</p></div></div>)}
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
    <section id="investors" className="aurora grain relative overflow-hidden py-24 text-white">
      <div className="relative z-10 mx-auto max-w-[1180px] px-5">
        <SectionHead dark eyebrow={tr('For investors')} title={tr('A marketplace that earns on the spread it creates.')} sub={tr('POOL aggregates real, pre-paid demand, makes sellers compete privately, and keeps the difference between their bid and the buyer price it sets. Every number below is computed live from this demo’s ledger.')} />
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <div className="reveal rounded-[24px] p-6 glass lg:col-span-2">
            <div className="flex items-center justify-between"><div className="text-[15px] font-bold">{tr('One TV order, to the paisa')}</div><span className="text-[11.5px] text-white/45">{tr('Walkthrough prices · engine maths')}</span></div>
            <div className="mt-4 divide-y divide-white/10">
              {rows.map(([l, v, h], i) => <div key={i} className={cn('flex items-center justify-between py-2.5 text-[14px]', (i === 2 || i === 8) && 'font-bold')}><span className="text-white/80">{l}{h && <span className="ml-2 text-[11.5px] text-white/40">{h}</span>}</span><span className={cn('num', i === 2 ? 'text-[#7ff0e6]' : 'text-white')}>{inr(v, { exact: v % 100 !== 0 })}</span></div>)}
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
          ].map(([h, b]) => <div key={h} className="rounded-[22px] p-5 glass"><div className="text-[16px] font-bold">{h}</div><p className="mt-2 text-[13.5px] leading-relaxed text-white/65">{b}</p></div>)}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <button onClick={onTour} className="flex h-[52px] items-center gap-2 rounded-[16px] bg-white px-5 text-[15px] font-semibold text-night"><Play className="h-4.5 w-4.5" />{tr('Start the 15-step walkthrough')}</button>
          <Link to="/ops/reconciliation" className="flex h-[52px] items-center gap-2 rounded-[16px] px-5 text-[15px] font-semibold glass">{tr('Open reconciliation')}<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  );
}
const Metric = ({ l, v, accent }: { l: string; v: string; accent?: boolean }) => <div className="reveal rounded-[24px] p-5 glass"><div className="text-[12.5px] text-white/55">{l}</div><div className={cn('num display mt-1 text-[32px]', accent && 'text-[#7ff0e6]')}>{v}</div></div>;

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
      <div className="mt-10 divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
        {qs.map(([q, a], i) => (
          <div key={i}>
            <button onClick={() => setO(o === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-[16px] font-semibold text-ink" aria-expanded={o === i}>{q}<ChevronDown className={cn('h-5 w-5 shrink-0 text-ink-3 transition', o === i && 'rotate-180')} /></button>
            {o === i && <p className="px-6 pb-5 text-[15px] leading-relaxed text-ink-2">{a}</p>}
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
        <div><div className="flex items-center gap-2"><Mark size={34} /><span className="text-[22px] font-bold tracking-[0.06em]">POOL</span></div><p className="mt-3 max-w-[320px] text-[14px] text-white/55">{tr('Before you buy it, POOL it. Neighbourhood buying power for India, starting in Hyderabad.')}</p></div>
        <FootCol h={tr('Product')} links={[['/buyer', tr('Buyer app')], ['/seller', tr('Seller app')], ['/ops', tr('POOL console')], ['/buyer/whatsapp', 'WhatsApp']]} />
        <FootCol h={tr('Trust')} links={[['/buyer/help/promise', tr('The POOL Promise')], ['/buyer/help/ranking', tr('How sellers are chosen')], ['/buyer/help/legal/refunds', tr('Refund policy')], ['/buyer/help/legal/grievance', tr('Grievance officer')]]} />
        <FootCol h={tr('Legal')} links={[['/buyer/help/legal/terms', tr('Terms')], ['/buyer/help/legal/privacy', tr('Privacy')], ['/buyer/account/privacy', tr('Your data')]]} />
      </div>
      <div className="border-t border-white/10"><div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-5 py-5 text-[12px] text-white/45 sm:flex-row sm:justify-between"><span>{tr('Demo with sample brands, sellers and people. No real money moves. Prices and offers are illustrative.')}</span><span>© 2026 POOL</span></div></div>
    </footer>
  );
}
const FootCol = ({ h, links }: { h: string; links: Array<[string, string]> }) => <div><div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/40">{h}</div><ul className="mt-3 space-y-2">{links.map(([to, l]) => <li key={to}><Link to={to} className="text-[14px] text-white/75 hover:text-white">{l}</Link></li>)}</ul></div>;
