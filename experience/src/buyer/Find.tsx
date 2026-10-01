import { AlertTriangle, BadgeCheck, Camera, Check, CircleHelp, ClipboardPaste, Eye, EyeOff, FileSearch, Link2, Loader2, ScanLine, Search, ShieldCheck, Sparkles, Upload, UserCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useT } from '../lib/i18n';
import { inr } from '../lib/money';
import { fmtWhen } from '../lib/time';
import { CATEGORIES } from '../sim/catalog';
import { committedCount, effectiveOutside, lowest30, outsideBest, productOf } from '../sim/engine';
import { addRecent, toggleWatch, useNow, useSim } from '../sim/store';
import type { Evidence, Product } from '../sim/types';
import { Button, Card, Chip, EmptyState, ErrorState, inputCls, LinkButton, ListSkeleton, Section, Segmented, SimTag, useToast } from '../ui/core';
import { ProductArt } from '../ui/ProductArt';
import { Sparkline } from '../ui/visuals';
import { AppBar, PoolCard, useLoadState } from './parts';

const SAMPLE_LINKS = [
  { id: 'tv', label: 'Amazon · 55″ TV', url: 'https://www.amazon.in/Vistaar-QLED-Google-VQ55-26/dp/B0DSIM5526?ref=sr_1_3' },
  { id: 'ac', label: 'Flipkart · 1.5 T AC', url: 'https://www.flipkart.com/coolbreeze-1-5-ton-5-star-inverter-split-ac/p/itmSIM185X?pid=ACNSIM185X' },
  { id: 'fridge', label: 'Reliance Digital · fridge', url: 'https://www.reliancedigital.in/frostline-253-l-frost-free-double-door/p/FL253' },
  { id: 'bad', label: 'Instagram reel', url: 'https://www.instagram.com/reel/C9x2Lk1/' },
];

function readLink(url: string): { productId?: string; via: string; host: string } {
  const u = url.toLowerCase();
  const host = (u.match(/https?:\/\/(?:www\.)?([^/]+)/)?.[1] ?? 'link').replace(/^m\./, '');
  if (u.includes('b0dsim5526') || u.includes('vistaar') || u.includes('vq55')) return { productId: 'p-tv', via: 'ASIN and model number in the link', host };
  if (u.includes('acnsim185x') || u.includes('coolbreeze') || u.includes('cb-185x')) return { productId: 'p-ac', via: 'Flipkart product id and model in the link', host };
  if (u.includes('frostline') || u.includes('fl253')) return { productId: 'p-fridge', via: 'page details (this store allows a single read)', host };
  if (u.includes('nimbus')) return { productId: 'p-laptop', via: 'model in the link', host };
  if (u.includes('aerolite')) return { productId: 'p-fan', via: 'model in the link', host };
  return { via: '', host };
}

export function Find() {
  const [params] = useSearchParams();
  const tr = useT();
  const s = useSim();
  const nav = useNavigate();
  const toast = useToast();
  const [mode, setMode] = useState<'link' | 'search' | 'scan'>(params.get('mode') === 'scan' ? 'scan' : params.get('mode') === 'search' ? 'search' : 'link');
  const preset = SAMPLE_LINKS.find((l) => l.id === params.get('link'));
  const [url, setUrl] = useState(preset?.url ?? '');
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<'idle' | 'reading' | 'result' | 'unknown' | 'expert'>('idle');
  const [step, setStep] = useState(0);
  const [found, setFound] = useState<{ productId?: string; via: string; host: string }>({ via: '', host: '' });

  const start = (u: string) => {
    if (!u.trim()) return;
    setStage('reading');
    setStep(0);
    const r = readLink(u);
    setFound(r);
    [0, 1, 2].forEach((i) => setTimeout(() => setStep(i + 1), 550 * (i + 1)));
    setTimeout(() => setStage(r.productId ? 'result' : 'unknown'), 1850);
  };
  useEffect(() => {
    if (preset) start(preset.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        start(text);
        return;
      }
    } catch {
      /* clipboard read is not allowed here */
    }
    toast('Paste the link into the box (long-press → Paste), or try a sample link below.', 'info');
  };
  const results = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return [];
    return s.products.filter((p) => [p.title, p.brand, p.model, p.category, CATEGORIES.find((c) => c.id === p.category)?.label].join(' ').toLowerCase().includes(n));
  }, [q, s.products]);
  const isAmazonOrFlipkart = /amazon|flipkart/.test(found.host);
  const product = found.productId ? productOf(s, found.productId) : undefined;

  return (
    <div className="min-h-full bg-bg">
      <AppBar back="/buyer" title={tr('Find a product')} />
      <div className="space-y-5 px-4 pb-8 pt-2">
        <Segmented value={mode} onChange={(m) => { setMode(m); setStage('idle'); }} options={[{ value: 'link', label: <><Link2 className="h-4 w-4" />{tr('Paste link')}</> }, { value: 'search', label: <><Search className="h-4 w-4" />{tr('Search')}</> }, { value: 'scan', label: <><ScanLine className="h-4 w-4" />{tr('Scan')}</> }]} />

        {mode === 'link' && (
          <>
            <form onSubmit={(e) => { e.preventDefault(); start(url); }} className="space-y-2.5">
              <label htmlFor="link" className="block text-[13px] font-semibold text-ink-2">{tr('Product link from any app or website')}</label>
              <div className="flex gap-2">
                <input id="link" value={url} onChange={(e) => setUrl(e.target.value)} onPaste={(e) => { const tx = e.clipboardData.getData('text'); if (tx) setTimeout(() => start(tx), 50); }} placeholder="https://www.amazon.in/…" className={cn(inputCls, 'flex-1')} inputMode="url" autoComplete="off" />
                <Button type="button" variant="outline" className="h-12 w-12 px-0" onClick={paste} aria-label="Paste from clipboard"><ClipboardPaste className="h-5 w-5" /></Button>
              </div>
              <Button type="submit" full size="lg" disabled={!url.trim() || stage === 'reading'}>{tr('Find this product')}</Button>
            </form>
            {stage === 'idle' && (
              <div className="space-y-2">
                <div className="eyebrow text-ink-3">{tr('Try a sample link')}</div>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_LINKS.map((l) => (
                    <button key={l.id} onClick={() => { setUrl(l.url); start(l.url); }} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-2 hover:border-line-2">{l.label}</button>
                  ))}
                </div>
                <div className="mt-3 flex items-start gap-2.5 rounded-[14px] bg-surface-2 p-3 text-[12.5px] leading-relaxed text-ink-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-save" />
                  <span>{tr('We never open Amazon or Flipkart pages — their terms don’t allow it. We read only the link itself and you confirm the exact model. AI helps, but never guesses: anything unproven is marked “unconfirmed”.')}</span>
                </div>
              </div>
            )}
            {stage === 'reading' && (
              <Card className="space-y-3 p-4">
                {[tr('Reading the link'), tr('Matching the exact model and variant'), tr('Checking prices we’re allowed to show')].map((label, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={cn('grid h-6 w-6 place-items-center rounded-full', step > i ? 'bg-save text-white' : 'bg-surface-3 text-ink-3')}>{step > i ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : step === i ? <Loader2 className="spin h-3.5 w-3.5" /> : null}</span>
                    <span className={cn('text-[14px]', step >= i ? 'font-semibold text-ink' : 'text-ink-3')}>{label}</span>
                  </div>
                ))}
                {isAmazonOrFlipkart && <p className="text-[12px] text-ink-3">{found.host} {tr('page not opened · reading the link only')}</p>}
              </Card>
            )}
            {stage === 'unknown' && (
              <div className="space-y-3">
                <ErrorState title={tr("We couldn't identify a product from this link")} body={tr('{host} links often point to a post, not a product. Search by name instead, or send it to a POOL expert.', { host: found.host })} />
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setMode('search')} icon={<Search className="h-4 w-4" />}>{tr('Search instead')}</Button>
                  <Button onClick={() => setStage('expert')} icon={<UserCheck className="h-4 w-4" />}>{tr('Ask an expert')}</Button>
                </div>
              </div>
            )}
            {stage === 'expert' && (
              <Card tone="brand" className="p-4">
                <div className="flex items-center gap-2 text-[15px] font-bold text-ink"><UserCheck className="h-5 w-5 text-brand" /> {tr('Sent to a POOL expert')}</div>
                <p className="mt-1.5 text-[13.5px] text-ink-2">{tr('A person on the POOL team will find the exact model and reply in the app and on WhatsApp within 24 hours. Nothing is charged.')}</p>
                <div className="mt-2"><SimTag>Request simulated</SimTag></div>
              </Card>
            )}
            {stage === 'result' && product && (
              <div className="rise space-y-3">
                <Card className="p-4">
                  <div className="flex gap-3">
                    <ProductArt art={product.art} size={76} />
                    <div className="min-w-0">
                      <Chip tone="save" icon={<BadgeCheck className="h-3 w-3" />}>{tr('Found from the link')}</Chip>
                      <div className="mt-1.5 text-[15.5px] font-bold leading-snug text-ink">{product.title}</div>
                      <div className="mt-1 text-[12px] text-ink-3">{tr('Read from')}: {found.via}</div>
                    </div>
                  </div>
                  <EvidenceList product={product} />
                  {product.lookalike && (
                    <div className="mt-3 flex gap-2 rounded-[12px] bg-warn-soft p-3 text-[12.5px] text-ink-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                      <span>{product.lookalike}</span>
                    </div>
                  )}
                </Card>
                <div className="text-center text-[14.5px] font-bold text-ink">{tr('Is this the exact product you want?')}</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setStage('expert')}>{tr('No, it’s different')}</Button>
                  <Button onClick={() => { addRecent(product.id); nav(`/buyer/product/${product.id}?from=link`); }}>{tr('Yes, this is it')}</Button>
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Rice, 55 inch TV, cement, laptop…')} className={cn(inputCls, 'pl-11')} aria-label="Search products" />
            </div>
            {!q && (
              <div className="flex flex-wrap gap-2">
                {['TV', 'AC', 'rice', 'mutton', 'laptop', 'cement', 'cleaning'].map((x) => (
                  <button key={x} onClick={() => setQ(x)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-2">{x}</button>
                ))}
              </div>
            )}
            {q && results.length === 0 && <EmptyState icon={<FileSearch className="h-6 w-6" />} title={tr('No product found for “{q}”', { q })} body={tr('Paste the product’s link instead, or ask a POOL expert to find it.')} action={<Button size="sm" onClick={() => { setMode('link'); }}>{tr('Paste a link')}</Button>} />}
            <div className="space-y-2">
              {results.map((p) => (
                <ProductRow key={p.id} p={p} />
              ))}
            </div>
          </div>
        )}

        {mode === 'scan' && <ScanBox onFound={(id) => { addRecent(id); nav(`/buyer/product/${id}?from=scan`); }} />}
      </div>
    </div>
  );
}

function ProductRow({ p }: { p: Product }) {
  const s = useSim();
  const pool = s.pools.find((x) => x.productId === p.id && x.state === 'open');
  return (
    <Link to={`/buyer/product/${p.id}`} className="flex items-center gap-3 rounded-[16px] border border-line bg-surface p-3">
      <ProductArt art={p.art} size={52} rounded={13} />
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink">{p.title}</div>
        <div className="mt-0.5 text-[12px] text-ink-3">Outside from {inr(Math.min(...p.outside.map((q) => q.pricePaise)))}{pool ? ` · pool open (${committedCount(pool)} households)` : ''}</div>
      </div>
    </Link>
  );
}

function ScanBox({ onFound }: { onFound: (id: string) => void }) {
  const s = useSim();
  const [scanning, setScanning] = useState<string | null>(null);
  const sample = s.products.filter((p) => p.barcode);
  const scan = (id: string) => {
    setScanning(id);
    setTimeout(() => onFound(id), 1300);
  };
  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-night">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,.08),transparent_60%)]" />
        <div className="absolute inset-x-10 top-1/2 h-24 -translate-y-1/2 rounded-[14px] border-2 border-white/70">
          <div className="absolute inset-x-2 top-1/2 h-[2px] -translate-y-1/2 bg-[#7ff0e6] shadow-[0_0_14px_#7ff0e6]" style={{ animation: 'float-y 1.6s ease-in-out infinite' }} />
        </div>
        <div className="absolute bottom-3 left-0 right-0 text-center text-[12.5px] font-medium text-white/70">{scanning ? 'Barcode found · matching…' : 'Point at the barcode on the box or shelf'}</div>
        <div className="absolute left-3 top-3"><SimTag className="border-white/30 bg-white/10 text-white">Camera simulated</SimTag></div>
      </div>
      <div className="eyebrow text-ink-3">Use a sample barcode</div>
      <div className="grid grid-cols-1 gap-2">
        {sample.map((p) => (
          <button key={p.id} onClick={() => scan(p.id)} disabled={!!scanning} className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-3 text-left hover:border-line-2">
            <Camera className="h-5 w-5 text-ink-3" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold text-ink">{p.short}</span>
              <span className="block font-mono text-[11.5px] text-ink-3">{p.barcode}</span>
            </span>
            {scanning === p.id && <Loader2 className="spin h-4 w-4 text-brand" />}
          </button>
        ))}
      </div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-2 p-3 text-[13px] font-semibold text-ink-2">
        <Upload className="h-4 w-4" /> Upload a photo of the barcode
        <input type="file" accept="image/*" className="sr-only" onChange={() => scan('p-fridge')} />
      </label>
      <p className="text-[12px] text-ink-3">Links from different stores for the same item land in the same pool once the barcode matches.</p>
    </div>
  );
}

const EV: Record<Evidence, { label: string; tone: 'save' | 'brand' | 'wave' | 'warn' }> = {
  link: { label: 'from the link', tone: 'save' },
  page: { label: 'from the store page', tone: 'brand' },
  expert: { label: 'confirmed by POOL expert', tone: 'wave' },
  unconfirmed: { label: 'unconfirmed', tone: 'warn' },
};

function EvidenceList({ product }: { product: Product }) {
  return (
    <div className="mt-3 divide-y divide-line rounded-[14px] border border-line">
      {product.specs.map((sp) => (
        <div key={sp.label} className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-[11.5px] text-ink-3">{sp.label}</div>
            <div className={cn('text-[13.5px] font-semibold', sp.evidence === 'unconfirmed' ? 'text-ink-3' : 'text-ink')}>{sp.value}</div>
          </div>
          <Chip tone={EV[sp.evidence].tone}>{EV[sp.evidence].label}</Chip>
        </div>
      ))}
    </div>
  );
}

export function ProductPage() {
  const { id } = useParams();
  const s = useSim();
  const t = useNow(60000);
  const tr = useT();
  const toast = useToast();
  const load = useLoadState('product' + id);
  const product = s.products.find((p) => p.id === id);
  useEffect(() => {
    if (product) addRecent(product.id);
  }, [product]);
  if (!product) return <><AppBar back="/buyer" title="Product" /><div className="p-4"><EmptyState title="This product is not in the demo catalog" /></div></>;
  const watching = s.watch.some((w) => w.productId === product.id);
  const best = outsideBest(product, s.me.cards);
  const low30 = lowest30(product);
  const pools = s.pools.filter((p) => p.productId === product.id && p.state === 'open');
  const myArea = pools[0];
  return (
    <div className="pb-28">
      <AppBar
        back="/buyer"
        title={product.short}
        right={
          <button onClick={() => { const r = toggleWatch(product.id); toast(r.ok && r.value ? 'Watching: we’ll tell you when a pool forms or the price drops' : 'Stopped watching'); }} className="grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-surface-3" aria-label={watching ? 'Stop watching' : 'Watch'}>
            {watching ? <Eye className="h-5 w-5 text-brand" /> : <EyeOff className="h-5 w-5" />}
          </button>
        }
      />
      {load.state === 'loading' ? (
        <div className="p-4"><ListSkeleton rows={3} /></div>
      ) : load.state === 'error' ? (
        <div className="p-4"><ErrorState onRetry={load.retry} /></div>
      ) : (
        <div className="space-y-6 px-4 pt-3">
          <div className="flex gap-4">
            <ProductArt art={product.art} size={112} rounded={22} />
            <div className="min-w-0 flex-1">
              <div className="text-[18px] font-bold leading-snug text-ink">{product.title}</div>
              <div className="mt-1 text-[12.5px] text-ink-3">{product.brand ? `${product.brand} · ` : ''}HSN {product.hsn} · GST {product.gstBps / 100}%</div>
              <div className="mt-1.5 text-[12.5px] text-ink-2">{product.warranty}</div>
            </div>
          </div>
          <Section title={tr('What we know')} sub={tr('Every detail shows where it came from.')}>
            <EvidenceList product={product} />
          </Section>
          {product.lookalike && (
            <div className="flex gap-2 rounded-[14px] bg-warn-soft p-3.5 text-[13px] text-ink-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
              <span>{product.lookalike}</span>
            </div>
          )}
          <Section title={tr('Honest comparison')} sub={tr('All-in price you would pay today, with your own card offers.')} action={<SimTag>Sample prices</SimTag>}>
            <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
              {[...product.outside].sort((a, b) => effectiveOutside(a, s.me.cards).price - effectiveOutside(b, s.me.cards).price).map((q, i) => {
                const e = effectiveOutside(q, s.me.cards);
                const isBest = q.id === best.quote.id;
                return (
                  <div key={q.id} className={cn('px-4 py-3', i > 0 && 'border-t border-line', isBest && 'bg-save-soft/60')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">{q.source}{isBest && <Chip tone="save">Best for you</Chip>}</div>
                        <div className="mt-0.5 text-[12px] text-ink-3">{q.delivery} · {q.installation !== '—' ? `install: ${q.installation}` : 'no install needed'}</div>
                        <div className="text-[12px] text-ink-3">{q.warranty !== '—' ? `${q.warranty} · ` : ''}{q.returns}</div>
                      </div>
                      <div className="text-right">
                        <div className="num text-[16px] font-bold text-ink">{inr(e.price)}</div>
                        {e.discount > 0 && <div className="num text-[11.5px] text-ink-3 line-through">{inr(q.pricePaise)}</div>}
                        {e.cardLabel && <div className="max-w-[140px] text-[11px] font-medium text-save">{e.cardLabel}</div>}
                      </div>
                    </div>
                    <div className="mt-1 text-[10.5px] text-ink-3">Checked {q.checkedAgoMin < 60 ? `${q.checkedAgoMin} min` : `${Math.round(q.checkedAgoMin / 60)} h`} ago</div>
                  </div>
                );
              })}
              <div className="border-t border-dashed border-brand/40 bg-brand-soft/50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-bold text-brand-ink">POOL · {tr('verified local sellers')}</div>
                    <div className="text-[12px] text-ink-2">{tr('Sealed bids. Your price is revealed after the pool closes — accept only if it beats {price}.', { price: inr(best.price) })}</div>
                  </div>
                  <Sparkles className="h-5 w-5 text-brand" />
                </div>
              </div>
            </div>
            <p className="px-1 text-[12px] text-ink-3">{tr('If one of these is better for you, buy there. POOL never hides a better option.')}</p>
          </Section>
          <Section title={tr('Price over 30 days')} sub={<>{tr('Lowest in 30 days')}: <span className="num font-semibold text-save">{inr(low30)}</span> · {tr('today')} <span className="num font-semibold text-ink-2">{inr(best.plainBest)}</span></>}>
            <div className="rounded-[18px] border border-line bg-surface p-3">
              <Sparkline values={product.priceHistory} height={64} />
              <div className="mt-1 flex justify-between text-[10.5px] text-ink-3"><span>30 days ago</span><span>Today</span></div>
            </div>
            <p className="px-1 text-[11.5px] text-ink-3">{tr('POOL never shows a made-up “was” price. Every past price here is a real outside price we checked.')}</p>
          </Section>
          <Section title={pools.length ? tr('Pool near you') : tr('No pool near you yet')} sub={pools.length ? tr('Join instead of starting a duplicate.') : tr('Start one and choose when it closes. Sellers then bid privately.')}>
            {pools.map((p) => <PoolCard key={p.id} p={p} />)}
            {!pools.length && (
              <div className="rounded-[18px] border border-dashed border-line-2 bg-surface p-4 text-center">
                <CircleHelp className="mx-auto h-6 w-6 text-ink-3" />
                <div className="mt-2 text-[14px] font-semibold text-ink">{tr('Be the first in your area')}</div>
                <div className="mt-1 text-[12.5px] text-ink-3">{tr('Your neighbours see it, verified sellers get invited, and the countdown you choose is the one everyone sees.')}</div>
              </div>
            )}
          </Section>
          {t < new Date('2026-11-08T00:00:00+05:30').getTime() && ['electronics', 'appliances', 'laptops'].includes(product.category) && (
            <div className="rounded-[14px] border border-line bg-surface-2 p-3.5 text-[12.5px] leading-relaxed text-ink-2">
              <b className="text-ink">{tr('When to buy:')}</b> {tr('festive-season sales often bring bank-card offers that can beat local dealers on some products. We compare honestly whenever they’re live, including your own cards.')}
            </div>
          )}
        </div>
      )}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-xl" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        {myArea ? (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-ink">{committedCount(myArea)} {tr('households')} · {tr('closes')} {fmtWhen(myArea.closesAt, t)}</div>
              <div className="text-[12px] text-ink-3">{tr('Booking')} {inr(myArea.bookingPaise)} · {tr('refundable')}</div>
            </div>
            <LinkButton to={`/buyer/pool/${myArea.id}`} size="lg">{tr('POOL this')}</LinkButton>
          </div>
        ) : (
          <LinkButton to={`/buyer/start/${product.id}`} full size="lg">{tr('Start a pool')}</LinkButton>
        )}
      </div>
    </div>
  );
}
