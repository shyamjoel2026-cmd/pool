import { ArrowLeft, Bell, Check, CreditCard, Home, Landmark, Loader2, Lock, Package, ShieldCheck, Smartphone, User, Users, Wallet, WifiOff, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { gstSplit } from '../lib/gst';
import { translate, useT } from '../lib/i18n';
import { inr } from '../lib/money';
import { fmtWhen } from '../lib/time';
import { committedCount, productOf, qtyLabel, uomOf } from '../sim/engine';
import { getState, setDemo, useNow, useSim } from '../sim/store';
import type { Pool, State } from '../sim/types';
import { Button, Chip, Countdown, KV, SimTag } from '../ui/core';
import { ProductArt } from '../ui/ProductArt';

// ---------------------------------------------------------------- App bar & tab bar
export function AppBar({ title, back, right, sub, transparent }: { title?: ReactNode; back?: string | true; right?: ReactNode; sub?: ReactNode; transparent?: boolean }) {
  const nav = useNavigate();
  return (
    <div className={cn('sticky top-0 z-30 flex min-h-[56px] items-center gap-1 px-2', transparent ? 'bg-transparent' : 'border-b border-line/70 bg-bg/90 backdrop-blur-xl')}>
      {back && (
        <button aria-label="Back" onClick={() => (back === true ? nav(-1) : nav(back))} className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-surface-3">
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <div className={cn('min-w-0 flex-1', !back && 'pl-2')}>
        {title && <div className="truncate text-[16.5px] font-bold text-ink">{title}</div>}
        {sub && <div className="truncate text-[12px] text-ink-3">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function BellButton({ to }: { to: string }) {
  const s = useSim();
  const unread = s.notifications.filter((n) => n.to === (to.startsWith('/seller') ? 'seller' : 'buyer') && !n.read).length;
  return (
    <Link to={to} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative grid h-10 w-10 place-items-center rounded-full text-ink-2 hover:bg-surface-3">
      <Bell className="h-5 w-5" />
      {unread > 0 && <span className="num absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
    </Link>
  );
}

export function TabBar() {
  const t = useT();
  const s = useSim();
  const decide = s.pools.filter((p) => p.members.some((m) => m.isMe && m.status === 'offered')).length;
  const tabs = [
    { to: '/buyer', end: true, icon: Home, label: t('Home') },
    { to: '/buyer/pools', icon: Users, label: t('My pools'), badge: decide },
    { to: '/buyer/orders', icon: Package, label: t('Orders') },
    { to: '/buyer/money', icon: Wallet, label: t('Money') },
    { to: '/buyer/account', icon: User, label: t('Account') },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-xl" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} aria-label="Main">
      <div className="mx-auto grid max-w-[560px] grid-cols-5">
        {tabs.map((tb) => (
          <NavLink key={tb.to} to={tb.to} end={tb.end} className={({ isActive }) => cn('relative flex h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition', isActive ? 'text-brand' : 'text-ink-3 hover:text-ink-2')}>
            {({ isActive }) => (
              <>
                <tb.icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 2} />
                <span>{tb.label}</span>
                {tb.badge ? <span className="num absolute right-[22%] top-2 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-warn px-1 text-[10px] font-bold text-white">{tb.badge}</span> : null}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function OfflineBanner() {
  const s = useSim();
  if (!s.demo.offline) return null;
  return (
    <div className="flex items-center gap-2 bg-ink px-4 py-2 text-[12.5px] font-semibold text-surface">
      <WifiOff className="h-4 w-4" /> You're offline. We'll send your actions when you're back.
    </div>
  );
}

// ---------------------------------------------------------------- Pool card
export function poolStatus(p: Pool, t: number) {
  const L = (k: string, v?: Record<string, string>) => translate(getState().prefs.lang, k, v);
  if (p.state === 'open') return { tone: 'brand' as const, text: L('Closes {t}', { t: fmtWhen(p.closesAt, t) }) };
  if (p.state === 'closed' || p.state === 'pricing') return { tone: 'warn' as const, text: L('Setting your price') };
  if (p.state === 'offers') return { tone: 'warn' as const, text: L('Offers out') };
  if (p.state === 'fulfilment') return { tone: 'wave' as const, text: L('Delivering') };
  if (p.state === 'completed') return { tone: 'save' as const, text: L('Completed') };
  return { tone: 'neutral' as const, text: L('No deal · refunded') };
}

export function PoolCard({ p, compact }: { p: Pool; compact?: boolean }) {
  const s = useSim();
  const t2 = useT();
  const t = useNow(30000);
  const product = productOf(s, p.productId);
  const uom = uomOf(product.uom);
  const best = Math.min(...product.outside.map((q) => q.pricePaise));
  const n = committedCount(p);
  const mine = p.members.find((m) => m.isMe && !['left', 'pending'].includes(m.status));
  const st = poolStatus(p, t);
  return (
    <Link to={`/buyer/pool/${p.id}`} className="flex gap-3 rounded-[18px] border border-line bg-surface p-3 shadow-[var(--shadow-card)] transition hover:border-line-2 active:scale-[0.995]">
      <ProductArt art={product.art} size={compact ? 60 : 76} />
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-center gap-1.5">
          {p.track === 'community' && <Chip tone="wave">{t2('Community')}</Chip>}
          {mine && <Chip tone="save" icon={<Check className="h-3 w-3" strokeWidth={3} />}>{t2("You're in")}</Chip>}
          {p.recurring && <Chip>{t2('Weekly')}</Chip>}
        </div>
        <div className="mt-1 line-clamp-2 text-[14.5px] font-semibold leading-snug text-ink">{product.short}</div>
        <div className="mt-0.5 text-[12px] text-ink-3">{p.areaLabel}</div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
          <span className="font-semibold text-ink-2"><span className="num">{n}</span> {t2('households')}</span>
          {p.state === 'open' ? (
            <span className="text-ink-3">{t2('closes in')} <Countdown to={p.closesAt} compact className="text-[12px]" /></span>
          ) : (
            <Chip tone={st.tone}>{st.text}</Chip>
          )}
        </div>
        {!compact && (
          <div className="mt-1.5 text-[11.5px] text-ink-3">
            {t2('Best outside today')} <span className="num font-semibold text-ink-2">{inr(best)}</span>/{uom.label} · {t2('booking')} <span className="num">{inr(p.bookingPaise)}</span> {t2('refundable')}
          </div>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------- Price breakdown
export function GstBreakdown({ total, gstBps, interState, booking, qtyText, unitPrice }: { total: number; gstBps: number; interState: boolean; booking: number; qtyText: string; unitPrice: number }) {
  const g = gstSplit(total, gstBps, interState);
  return (
    <div className="divide-y divide-line">
      <div className="pb-2">
        <KV k={`Price · ${qtyText}`} hint={`${inr(unitPrice)} each, all-in`} v={inr(total)} strong />
      </div>
      <div className="py-2">
        <KV k="Taxable value" v={inr(g.taxable, { exact: true })} />
        {gstBps === 0 ? (
          <KV k="GST" hint="Nil-rated for this product" v="₹0.00" />
        ) : interState ? (
          <KV k={`IGST ${gstBps / 100}%`} hint="Seller is in another state" v={inr(g.igst, { exact: true })} />
        ) : (
          <>
            <KV k={`CGST ${gstBps / 200}%`} v={inr(g.cgst, { exact: true })} />
            <KV k={`SGST ${gstBps / 200}%`} v={inr(g.sgst, { exact: true })} />
          </>
        )}
        <KV k="Delivery & installation" v="Included" tone="save" />
      </div>
      <div className="pt-2">
        <KV k="Booking already paid" v={`−${inr(booking)}`} tone="save" />
        <KV k="You pay now or at the door" v={inr(total - booking)} strong />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Simulated payment sheet (Razorpay-style test checkout)
export interface PayMethod {
  id: string;
  label: string;
  sub: string;
  icon: ReactNode;
}

export function PaymentSheet({ open, onClose, amount, purpose, allowEmi, onPay, onSuccess, successText }: { open: boolean; onClose: () => void; amount: number; purpose: string; allowEmi?: boolean; onPay: (method: string) => { ok: true; value: unknown } | { ok: false; error: string }; onSuccess: () => void; successText: string }) {
  const s = useSim();
  const [method, setMethod] = useState('upi');
  const [stage, setStage] = useState<'choose' | 'approve' | 'done' | 'failed'>('choose');
  const [err, setErr] = useState('');
  const [ref, setRef] = useState('');
  const [emi, setEmi] = useState(6);
  // Freeze the amount when the sheet opens: after paying, the order's balance drops to zero but the receipt must still show what was paid.
  const [shown, setShown] = useState(amount);
  useEffect(() => {
    if (open) {
      setStage('choose');
      setErr('');
      setShown(amount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const methods: PayMethod[] = [
    { id: 'upi', label: 'UPI', sub: s.me.upi[0], icon: <Smartphone className="h-5 w-5" /> },
    ...s.me.cards.map((c) => ({ id: c.id, label: `${c.bank} ${c.type} card`, sub: `${c.network} •••• ${c.last4}`, icon: <CreditCard className="h-5 w-5" /> })),
    { id: 'nb', label: 'Netbanking', sub: 'All major banks', icon: <Landmark className="h-5 w-5" /> },
    ...(allowEmi ? [{ id: 'emi', label: 'Card EMI', sub: 'HDFC credit card · 3, 6 or 9 months', icon: <CreditCard className="h-5 w-5" /> }] : []),
  ];
  const mLabel = (id: string) => {
    const m = methods.find((x) => x.id === id)!;
    return id === 'upi' ? `UPI · ${s.me.upi[0]}` : id === 'emi' ? `HDFC card EMI · ${emi} months` : `${m.label}${m.sub.includes('••••') ? ` ${m.sub.slice(-9)}` : ''}`;
  };
  const pay = () => {
    setStage('approve');
    setTimeout(() => {
      const r = onPay(mLabel(method));
      if (r.ok) {
        setRef(String(r.value ?? ''));
        setStage('done');
      } else {
        setErr(r.error);
        setStage('failed');
      }
    }, method === 'upi' ? 2200 : 1500);
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Payment">
      <div className="fade-enter absolute inset-0 bg-[rgb(5_8_18/0.6)]" onClick={() => stage !== 'approve' && onClose()} />
      <div className="sheet-enter relative w-full max-w-[520px] overflow-hidden rounded-t-[26px] bg-surface">
        <div className="flex items-center justify-between bg-night px-5 py-4 text-white">
          <div>
            <div className="flex items-center gap-1.5 text-[12px] text-white/60"><Lock className="h-3.5 w-3.5" /> POOL checkout · payment company</div>
            <div className="num mt-1 text-[24px] font-bold">{inr(shown)}</div>
            <div className="text-[12px] text-white/60">{purpose}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <SimTag className="border-white/30 bg-white/10 text-white">Simulated · test mode</SimTag>
            {stage !== 'approve' && <button onClick={onClose} aria-label="Close payment" className="grid h-8 w-8 place-items-center rounded-full bg-white/10"><X className="h-4 w-4" /></button>}
          </div>
        </div>
        {stage === 'choose' && (
          <div className="space-y-2.5 p-5" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
            {methods.map((m) => (
              <button key={m.id} onClick={() => setMethod(m.id)} className={cn('flex w-full items-center gap-3 rounded-[14px] border p-3 text-left transition', method === m.id ? 'border-brand bg-brand-soft/60 ring-2 ring-brand/20' : 'border-line hover:border-line-2')}>
                <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-surface-3 text-ink-2">{m.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-ink">{m.label}</span>
                  <span className="block text-[12px] text-ink-3">{m.sub}</span>
                </span>
                <span className={cn('grid h-5 w-5 place-items-center rounded-full border-2', method === m.id ? 'border-brand' : 'border-line-2')}>{method === m.id && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}</span>
              </button>
            ))}
            {method === 'emi' && (
              <div className="grid grid-cols-3 gap-2">
                {[3, 6, 9].map((n) => (
                  <button key={n} onClick={() => setEmi(n)} className={cn('rounded-[12px] border p-2.5 text-center', emi === n ? 'border-brand bg-brand-soft' : 'border-line')}>
                    <div className="num text-[14px] font-bold text-ink">{inr(Math.ceil(shown / n / 100) * 100)}</div>
                    <div className="text-[11px] text-ink-3">× {n} months{n === 3 ? ' · no-cost' : ''}</div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-start gap-2 rounded-[12px] bg-surface-2 p-3 text-[12px] text-ink-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-save" />
              <span>Your money is held by a licensed payment company, not by POOL or the seller. It is released to the seller only after you give your handover code. Refunds go back to this same method.</span>
            </div>
            <Button full size="lg" onClick={pay}>Pay {inr(shown)}</Button>
          </div>
        )}
        {stage === 'approve' && (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <Loader2 className="spin h-10 w-10 text-brand" />
            <div className="mt-4 text-[16px] font-bold text-ink">{method === 'upi' ? 'Approve in your UPI app' : 'Confirming with your bank'}</div>
            <p className="mt-1 text-[13px] text-ink-3">{method === 'upi' ? `A request for ${inr(shown)} was sent to ${s.me.upi[0]}. (Simulated: approving automatically.)` : 'This takes a few seconds. Do not close this screen.'}</p>
          </div>
        )}
        {stage === 'done' && (
          <div className="flex flex-col items-center px-6 py-9 text-center" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
            <div className="pop grid h-16 w-16 place-items-center rounded-full bg-save text-white">
              <svg viewBox="0 0 24 24" className="h-9 w-9"><path className="draw" d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div className="mt-4 text-[18px] font-bold text-ink">Payment successful</div>
            <p className="mt-1 max-w-[320px] text-[13.5px] text-ink-2">{successText}</p>
            {ref && <div className="mt-3 rounded-full bg-surface-3 px-3 py-1 font-mono text-[11.5px] text-ink-3">Ref {ref}</div>}
            <Button className="mt-5" full size="lg" onClick={onSuccess}>Continue</Button>
          </div>
        )}
        {stage === 'failed' && (
          <div className="flex flex-col items-center px-6 py-9 text-center" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
            <div className="pop grid h-16 w-16 place-items-center rounded-full bg-danger text-white"><X className="h-8 w-8" strokeWidth={3} /></div>
            <div className="mt-4 text-[18px] font-bold text-ink">Payment didn't go through</div>
            <p className="mt-1 max-w-[320px] text-[13.5px] text-ink-2">{err}</p>
            <div className="mt-5 grid w-full grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setStage('choose')}>Change method</Button>
              <Button onClick={pay}>Try again</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Next steps (what needs the buyer now)
export interface NextStep {
  id: string;
  tone: 'warn' | 'brand' | 'wave' | 'save';
  title: string;
  body: string;
  to: string;
  cta: string;
  at?: number;
  art?: string;
}

export function nextSteps(s: State, t: number): NextStep[] {
  const out: NextStep[] = [];
  const L = (k: string, v?: Record<string, string | number>) => translate(s.prefs.lang, k, v);
  for (const p of s.pools) {
    const product = productOf(s, p.productId);
    const uom = uomOf(product.uom);
    for (const m of p.members.filter((x) => x.isMe)) {
      if (m.status === 'offered' && p.acceptBy) out.push({ id: `offer-${m.id}`, tone: 'warn', title: L('Decide on your {p} offer', { p: product.short }), body: L('{q} · decide by {t}. No reply = full refund.', { q: qtyLabel(m.qtyBase, uom), t: fmtWhen(p.acceptBy, t) }), to: `/buyer/offer/${m.id}`, cta: L('Review offer'), at: p.acceptBy, art: product.art });
      if (m.status === 'pending' && p.state === 'open') out.push({ id: `pend-${m.id}`, tone: 'brand', title: L('Finish joining: {p}', { p: product.short }), body: L('Pay the {amt} refundable booking to count as a committed buyer.', { amt: inr(p.bookingPaise) }), to: `/buyer/join/${p.id}`, cta: L('Pay booking'), art: product.art });
      if (m.status === 'committed' && (p.state === 'closed' || p.state === 'pricing')) out.push({ id: `price-${m.id}`, tone: 'brand', title: L('{p}: price coming', { p: product.short }), body: L('Sellers have bid. Your personal offer arrives by {t}.', { t: fmtWhen(p.pricingDeadline ?? t, t) }), to: `/buyer/pool/${p.id}`, cta: L('See status'), art: product.art });
    }
  }
  for (const o of s.orders.filter((x) => x.isMe)) {
    const product = productOf(s, o.productId);
    const dispatched = o.steps.some((x) => x.key === 'dispatched' || x.key === 'ready_for_pickup');
    if (o.status === 'awaiting_payment') out.push({ id: `pay-${o.id}`, tone: 'warn', title: L('Pay for {p}', { p: product.short }), body: L('{amt} to confirm your accepted offer.', { amt: inr(o.balanceDue) }), to: `/buyer/order/${o.id}`, cta: L('Pay now'), art: product.art });
    if (o.status === 'confirmed' && dispatched) out.push({ id: `code-${o.id}`, tone: 'wave', title: o.balanceDue > 0 ? L('{p} arrives today — pay at the door', { p: product.short }) : L('{p} arrives today', { p: product.short }), body: o.balanceDue > 0 ? L('Pay {amt} by UPI or card when it arrives, check the box, then give your code.', { amt: inr(o.balanceDue) }) : L('Check the box, then give your handover code.'), to: `/buyer/order/${o.id}`, cta: o.balanceDue > 0 ? L('Pay & get code') : L('Open code'), art: product.art });
    if (o.status === 'settled' && !o.rating) out.push({ id: `rate-${o.id}`, tone: 'save', title: L('How was your {p}?', { p: product.short }), body: L('Only buyers who completed a purchase can rate a seller.'), to: `/buyer/order/${o.id}`, cta: L('Rate'), art: product.art });
  }
  return out.sort((a, b) => (a.tone === 'warn' ? 0 : 1) - (b.tone === 'warn' ? 0 : 1) || (a.at ?? 9e15) - (b.at ?? 9e15));
}

export function NextStepCard({ n }: { n: NextStep }) {
  const s = useSim();
  const tr2 = useT();
  const tone = { warn: 'border-warn/30 bg-warn-soft', brand: 'border-brand/20 bg-brand-soft', wave: 'border-wave/25 bg-wave-soft', save: 'border-save/20 bg-save-soft' }[n.tone];
  const prod = s.products.find((p) => p.art === n.art);
  return (
    <Link to={n.to} className={cn('flex w-[290px] shrink-0 snap-start flex-col justify-between rounded-[18px] border p-3.5 transition active:scale-[0.99]', tone)}>
      <div className="flex gap-3">
        {prod && <ProductArt art={prod.art} size={44} rounded={12} />}
        <div className="min-w-0">
          <div className="text-[14px] font-bold leading-snug text-ink">{n.title}</div>
          <div className="mt-1 text-[12.5px] leading-snug text-ink-2">{n.body}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        {n.at ? <span className="text-[12px] text-ink-3"><Countdown to={n.at} compact className="text-[12px]" /> {tr2('left')}</span> : <span />}
        <span className="rounded-full bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-surface">{n.cta}</span>
      </div>
    </Link>
  );
}

export function useLoadState(key: string) {
  const s = useSim();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [n, setN] = useState(0);
  useEffect(() => {
    setState('loading');
    const fail = s.demo.failNextLoad;
    const tm = setTimeout(() => {
      if (fail) {
        setState('error');
        setDemo({ failNextLoad: false });
      } else setState('ready');
    }, s.demo.slowNetwork ? 1700 : 350);
    return () => clearTimeout(tm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, n]);
  return { state, retry: () => setN((x) => x + 1) };
}
