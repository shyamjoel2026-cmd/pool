import { AlertTriangle, Check, CheckCircle2, Eye, Lock, Plus, ShieldCheck, Sparkles, Trash2, Trophy, Waves, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cn } from '../lib/cn';
import { INDIA } from '../lib/gst';
import { inr, rs } from '../lib/money';
import { DAY, fmtDay, fmtDayTime, fmtWhen } from '../lib/time';
import { eligibilityReasons, holdPerUnit, latestBids, outsideBest, poolDeliverBy, potFor, productOf, profileOf, qtyLabel, sellerOf, slabAt, splitOrder, uomOf } from '../sim/engine';
import { poolStageLabel } from '../sim/selectors';
import { submitBid, useNow, useSim } from '../sim/store';
import type { Bid, Slab } from '../sim/types';
import { Button, Card, Chip, EmptyState, inputCls, KV, LinkButton, Section, Segmented, Sheet, SimTag, Stepper, Toggle, useToast } from '../ui/core';
import { ProductArt } from '../ui/ProductArt';
import { AppBar } from '../buyer/parts';

const MODE_LABEL: Record<string, string> = { home_delivery: 'Home delivery', courier: 'Courier', store_pickup: 'Pickup at your shop', service_visit: 'Visit at buyer’s place' };

export function BidForm() {
  const { poolId } = useParams();
  const s = useSim();
  const t = useNow(1000);
  const toast = useToast();
  const pool = s.pools.find((p) => p.id === poolId);
  const me = sellerOf(s, s.sellerMeId);
  const existing = pool ? latestBids(pool.bids).find((b) => b.sellerId === me.id) : undefined;
  const product = pool ? productOf(s, pool.productId) : undefined;
  const prof = pool ? profileOf(s, pool.profileId) : undefined;
  const reqDays = pool?.requirements.deliverWithinDays ?? 5;
  const [price, setPrice] = useState(existing ? String(existing.pricePaise / 100) : '');
  // Default capacity: enough for everyone committed so far, plus headroom for late joiners.
  const committedNow = pool ? pool.members.filter((m) => m.status === 'committed').reduce((a, m) => a + m.qtyBase, 0) : 0;
  const [cap, setCap] = useState(existing?.capacityBase ?? (product?.uom === 'kg' ? Math.max(50000, Math.ceil((committedNow * 1.2) / 10000) * 10000) : Math.max(20, Math.ceil((committedNow + 10) / 5) * 5)));
  const [days, setDays] = useState(existing && pool ? Math.round((existing.deliverBy - pool.closesAt) / DAY) : Math.min(4, reqDays));
  const [modes, setModes] = useState<string[]>(existing?.modes ?? prof?.modes.slice(0, 1) ?? ['home_delivery']);
  const [terms, setTerms] = useState<Bid['terms']>(existing?.terms ?? Object.fromEntries((pool?.requirements.terms ?? []).map((r) => [r.key, r.value])));
  const [covered, setCovered] = useState<string[]>(existing?.optionsCovered ?? (product?.options ?? []).flatMap((o) => o.values.map((v) => `${o.key}:${v.id}`)));
  const [slabs, setSlabs] = useState<Array<{ from: string; amt: string }>>(existing?.slabs.map((x) => ({ from: String(x.fromUnit), amt: String(x.perUnitPaise / 100) })) ?? []);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState<'payout' | 'wave'>('payout');
  if (!pool || !product || !prof) return <><AppBar back="/seller/demand" title="Bid" /><div className="p-4"><EmptyState title="Pool not found" /></div></>;
  const uom = uomOf(product.uom);
  const open = pool.state === 'open' && t < pool.closesAt;
  if (!open && !done) return <><AppBar back={`/seller/demand/${pool.id}`} title="Bid" /><div className="p-4"><EmptyState icon={<Lock className="h-6 w-6" />} title="Bidding has closed" body={`This pool is now: ${poolStageLabel(pool)}. You’ll see your result when offers are published.`} action={<LinkButton to="/seller/bids" size="sm">Your bids</LinkButton>} /></div></>;

  const pricePaise = Math.round(Number(price.replace(/[^0-9.]/g, '')) * 100) || 0;
  const slabList: Slab[] = slabs.map((x) => ({ fromUnit: Math.floor(Number(x.from)) || 0, perUnitPaise: rs(Number(x.amt) || 0) })).filter((x) => x.fromUnit > 0 && x.perUnitPaise > 0).sort((a, b) => a.fromUnit - b.fromUnit);
  const slabCap = Math.floor((pricePaise * INDIA.maxSlabBpsOfPrice) / 10_000);
  const deliverBy = pool.closesAt + days * DAY;
  const draft: Bid = { id: 'draft', poolId: pool.id, sellerId: me.id, revision: 0, pricePaise, capacityBase: cap, deliverBy, modes, terms, optionsCovered: covered, slabs: slabList, validUntil: 0, submittedAt: t, history: [], accessLog: [] };
  const reasons = eligibilityReasons(pool, draft, me);
  const raising = existing && pricePaise > existing.pricePaise;
  const slabErr = slabList.some((x) => x.perUnitPaise > slabCap) ? `Each slab can be at most ${inr(slabCap)} (10% of your price).` : new Set(slabList.map((x) => x.fromUnit)).size !== slabList.length ? 'Two slabs start at the same unit.' : '';
  const best = outsideBest(product, []);
  const committedQty = pool.members.filter((m) => m.status === 'committed').reduce((a, m) => a + m.qtyBase, 0);
  const capUnits = Math.max(1, Math.floor(cap / uom.baseScale));
  // Payout preview per unit: the buyer price is set later by POOL; estimate taxes at your own price.
  const unitSplit = splitOrder({ buyerTotal: pricePaise, sellerTotal: pricePaise, gstBps: product.gstBps, profile: prof, waveHold: holdPerUnit(slabList) });
  const fillWalkthrough = () => {
    setPrice('40000');
    setCap(60);
    setDays(4);
    setTerms({ installation_included: true, warranty_months: 12, wall_mount: 'included' });
    setSlabs([{ from: '11', amt: '250' }, { from: '31', amt: '500' }]);
  };
  const submit = () => {
    setErr('');
    const r = submitBid(pool.id, { pricePaise, capacityBase: cap, deliverBy, modes, terms, optionsCovered: covered, slabs: slabList });
    setConfirm(false);
    if (!r.ok) return setErr(r.error);
    setDone(true);
    toast(existing ? 'Bid lowered and resealed' : 'Bid sealed');
  };

  if (done) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-12 text-center">
        <div className="envelope-drop relative grid h-24 w-28 place-items-center rounded-[22px] bg-wave text-white shadow-[var(--shadow-pop)]"><Lock className="h-10 w-10" /><span className="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-full bg-save ring-4 ring-bg"><Check className="h-5 w-5" strokeWidth={3} /></span></div>
        <div className="mt-6 text-[22px] font-bold text-ink">Your bid is sealed</div>
        <p className="mt-2 max-w-[320px] text-[14px] text-ink-2">{inr(pricePaise)} per {uom.label}, up to {qtyLabel(cap, uom)}, delivered by {fmtDay(deliverBy)}. Nobody can see it until {fmtWhen(pool.closesAt, t)}, and every view after that is logged for you to see.</p>
        <div className="mt-6 grid w-full max-w-[320px] gap-2">
          <LinkButton to="/seller/bids" variant="wave" full>See your bids</LinkButton>
          <LinkButton to="/seller/demand" variant="outline" full>More demand</LinkButton>
        </div>
      </div>
    );
  }

  const ok = pricePaise > 0 && !raising && !slabErr && modes.length > 0;
  return (
    <div className="pb-36">
      <AppBar back={`/seller/demand/${pool.id}`} title={existing ? 'Lower your bid' : 'Sealed bid'} sub={`${product.short} · ${pool.no}`} />
      <div className="space-y-6 px-4 pt-3">
        <div className="flex items-center gap-3 rounded-[22px] border border-line bg-surface p-3">
          <ProductArt art={product.art} size={52} />
          <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold text-ink">{product.title}</div><div className="text-[12px] text-ink-3">{qtyLabel(committedQty, uom)} committed · closes {fmtWhen(pool.closesAt, t)}</div></div>
        </div>
        {s.tour.active && !existing && <button onClick={fillWalkthrough} className="flex w-full items-center justify-between rounded-[14px] border border-dashed border-sim/50 bg-sim-soft px-3.5 py-2.5 text-[13px] font-semibold text-sim"><span className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Fill the walkthrough bid</span><SimTag>Demo</SimTag></button>}

        <Section title="1. Your price" sub={`Per ${uom.label}, GST-inclusive, delivered${prof.holds.length ? ' and installed' : ''}. POOL sets what buyers pay on top.`}>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[22px] font-bold text-ink-3">₹</span>
            <input inputMode="decimal" aria-label="Price per unit" className={cn(inputCls, 'h-16 pl-10 text-[26px] font-bold num')} placeholder="0" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
          {existing && <p className={cn('px-1 text-[12.5px]', raising ? 'font-semibold text-danger' : 'text-ink-3')}>Your current bid is {inr(existing.pricePaise)}. You can only lower it before close (rev {existing.revision} → {existing.revision + 1}).</p>}
          <p className="px-1 text-[12px] text-ink-3">Public best outside today: {inr(best.plainBest)} at {best.quote.source}. Other sellers’ bids are never shown to you.</p>
        </Section>

        <Section title="2. Capacity and delivery">
          <div className="flex items-center justify-between rounded-[16px] border border-line bg-surface p-3"><div><div className="text-[14px] font-semibold text-ink">Up to</div><div className="text-[12px] text-ink-3">{qtyLabel(committedQty, uom)} committed so far</div></div><Stepper value={cap} onChange={setCap} min={uom.baseScale} step={uom.baseScale === 1 ? 5 : uom.baseScale * 10} format={(v) => qtyLabel(v, uom)} /></div>
          <div className="space-y-2">
            <div className="text-[13px] font-semibold text-ink-2">Deliver{prof.holds.length ? ' and install' : ''} within</div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">{Array.from({ length: reqDays + 2 }, (_, i) => i + 1).map((d) => <button key={d} onClick={() => setDays(d)} className={cn('min-w-[64px] rounded-[12px] border px-2 py-2 text-center', days === d ? 'border-wave bg-wave-soft' : 'border-line bg-surface', d > reqDays && 'opacity-70')}><div className="num text-[15px] font-bold text-ink">{d}d</div><div className="text-[10.5px] text-ink-3">{fmtDay(pool.closesAt + d * DAY).split(',')[0]}</div></button>)}</div>
            <p className="px-1 text-[12px] text-ink-3">Pool needs delivery by {fmtDayTime(poolDeliverBy(pool))}. Earlier dates win ties and serve buyers with a need-by date.</p>
          </div>
          <div className="flex flex-wrap gap-2">{[...new Set([...prof.modes, ...(prof.modes.includes('home_delivery') ? ['courier'] : [])])].map((m) => <button key={m} onClick={() => setModes(modes.includes(m) ? modes.filter((x) => x !== m) : [...modes, m])} className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold', modes.includes(m) ? 'border-wave bg-wave-soft text-wave-ink' : 'border-line text-ink-2')}>{modes.includes(m) && <Check className="h-3.5 w-3.5" />}{MODE_LABEL[m] ?? m}</button>)}</div>
        </Section>

        {(pool.requirements.terms.length > 0 || (product.options?.length ?? 0) > 0) && (
          <Section title="3. Terms">
            <Card className="divide-y divide-line">
              {pool.requirements.terms.map((r) => (
                <div key={r.key} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div><div className="text-[14px] font-semibold text-ink">{r.label}</div><div className="text-[12px] text-ink-3">Required: {r.op === 'eq' ? (r.value === true ? 'yes' : String(r.value)) : `at least ${r.value}`}</div></div>
                  {typeof r.value === 'boolean' ? <Toggle label={r.label} checked={terms[r.key] === true} onChange={(v) => setTerms({ ...terms, [r.key]: v })} /> : typeof r.value === 'number' ? <Segmented value={String(terms[r.key] ?? r.value)} onChange={(v) => setTerms({ ...terms, [r.key]: Number(v) })} options={[12, 24, 36].map((n) => ({ value: String(n), label: String(n) }))} /> : <input className={cn(inputCls, 'h-10 w-32')} value={String(terms[r.key] ?? '')} onChange={(e) => setTerms({ ...terms, [r.key]: e.target.value })} />}
                </div>
              ))}
              {product.options?.map((o) => (
                <div key={o.key} className="px-4 py-3">
                  <div className="text-[14px] font-semibold text-ink">{o.label} you can supply</div>
                  <div className="mt-2 flex flex-wrap gap-2">{o.values.map((v) => { const k = `${o.key}:${v.id}`; const on = covered.includes(k); return <button key={k} onClick={() => setCovered(on ? covered.filter((x) => x !== k) : [...covered, k])} className={cn('rounded-full border px-3 py-1.5 text-[13px] font-semibold', on ? 'border-wave bg-wave-soft text-wave-ink' : 'border-line text-ink-3 line-through')}>{v.label}</button>; })}</div>
                </div>
              ))}
            </Card>
          </Section>
        )}

        <Section title="4. Wave Drop (optional)" sub="Reward volume without a price war. Each completed order adds the slab to a pot that goes back to buyers. Held from your payout, so it’s always funded.">
          <Card className="space-y-2 p-4">
            {slabs.length === 0 && <p className="text-[13px] text-ink-3">No slabs. Buyers see “no Wave Drop” on your offer.</p>}
            {slabs.map((x, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[13px] text-ink-2">From order #</span>
                <input inputMode="numeric" aria-label="From unit" className={cn(inputCls, 'h-10 w-16 px-2 text-center')} value={x.from} onChange={(e) => setSlabs(slabs.map((y, j) => (j === i ? { ...y, from: e.target.value.replace(/\D/g, '') } : y)))} />
                <span className="text-[13px] text-ink-2">add ₹</span>
                <input inputMode="numeric" aria-label="Amount per unit" className={cn(inputCls, 'h-10 w-20 px-2 text-center')} value={x.amt} onChange={(e) => setSlabs(slabs.map((y, j) => (j === i ? { ...y, amt: e.target.value.replace(/[^0-9.]/g, '') } : y)))} />
                <button aria-label="Remove slab" onClick={() => setSlabs(slabs.filter((_, j) => j !== i))} className="ml-auto grid h-9 w-9 place-items-center rounded-full text-ink-3 hover:bg-surface-3"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {slabErr && <p className="text-[12.5px] font-medium text-danger">{slabErr}</p>}
            <Button size="sm" variant="outline" icon={<Plus className="h-4 w-4" />} onClick={() => setSlabs([...slabs, { from: String((slabList[slabList.length - 1]?.fromUnit ?? 0) + 20 || 11), amt: '' }])}>Add slab</Button>
            {pricePaise > 0 && <p className="text-[12px] text-ink-3">Max per slab: {inr(slabCap)} (10% of your price).</p>}
          </Card>
        </Section>

        {/* Previews */}
        {pricePaise > 0 && (
          <Section title="What you’d earn">
            <Segmented value={preview} onChange={setPreview} options={[{ value: 'payout', label: 'Per unit payout' }, { value: 'wave', label: 'Wave Drop at scale' }]} />
            {preview === 'payout' ? (
              <Card className="p-4">
                <KV k="Your price" v={inr(unitSplit.sellerTotal)} strong />
                <KV k="TCS 0.5% (GST credit for you)" v={`−${inr(unitSplit.tcs, { exact: true })}`} tone="muted" />
                <KV k="TDS 0.1% (income-tax credit)" v={`−${inr(unitSplit.tds, { exact: true })}`} tone="muted" />
                {unitSplit.holds.map((h) => <KV key={h.key} k={`${h.label} (${h.bps / 100}%)`} hint="released on the installation job number" v={`−${inr(h.amount)}`} tone="muted" />)}
                {unitSplit.waveHold > 0 && <KV k="Wave Drop hold (largest slab)" hint="unused part released when the wave closes" v={`−${inr(unitSplit.waveHold)}`} tone="muted" />}
                <div className="my-1.5 h-px bg-line" />
                <KV k="Released when the buyer’s code is verified" v={inr(unitSplit.releaseOnHandover, { exact: true })} strong />
                <p className="mt-2 text-[11.5px] text-ink-3">Estimate per unit. TCS is finally computed on the price POOL sets for the buyer. Settlement to {me.bank.name} ••{me.bank.last4} in 2 working days.</p>
              </Card>
            ) : (
              <WavePreview price={pricePaise} slabs={slabList} capUnits={capUnits} />
            )}
          </Section>
        )}

        {/* Eligibility */}
        {pricePaise > 0 && (reasons.length === 0 ? (
          <Card tone="save" className="flex gap-3 p-4"><CheckCircle2 className="h-5 w-5 shrink-0 text-save" /><div className="text-[13px] text-ink-2"><b className="text-ink">Eligible under the published rule.</b> Ranked by price, then delivery date, then rating. POOL’s margin is never a factor.</div></Card>
        ) : (
          <Card tone="warn" className="p-4"><div className="flex items-center gap-2 text-[14px] font-bold text-ink"><AlertTriangle className="h-5 w-5 text-warn" />This bid can’t win as it is</div><ul className="mt-2 space-y-1 text-[13px] text-ink-2">{reasons.map((r) => <li key={r} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-danger" />{r}</li>)}</ul></Card>
        ))}
        {err && <p className="rounded-[12px] bg-danger-soft p-3 text-[13px] font-medium text-danger">{err}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 liquid-glass rounded-t-[28px] px-4 pb-3 pt-3.5" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <Button full size="lg" variant="wave" disabled={!ok} icon={<Lock className="h-4.5 w-4.5" />} onClick={() => setConfirm(true)}>{existing ? 'Review lower bid' : 'Review and seal'}</Button>
        <p className="mt-1.5 text-center text-[11.5px] text-ink-3">You can lower it until close. You can’t raise or withdraw it.</p>
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Seal this bid?" footer={<div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setConfirm(false)}>Edit</Button><Button variant="wave" icon={<Lock className="h-4 w-4" />} onClick={submit}>Seal bid</Button></div>}>
        <div className="space-y-1 text-[13.5px]">
          <KV k="Price" v={`${inr(pricePaise)}/${uom.label}`} strong />
          <KV k="Capacity" v={qtyLabel(cap, uom)} />
          <KV k="Deliver by" v={fmtDayTime(deliverBy)} />
          <KV k="Modes" v={modes.map((m) => MODE_LABEL[m] ?? m).join(', ')} />
          <KV k="Wave Drop" v={slabList.length ? slabList.map((x) => `#${x.fromUnit}: ${inr(x.perUnitPaise)}`).join(' · ') : 'None'} />
          <div className="mt-3 rounded-[12px] bg-surface-2 p-3 text-[12.5px] text-ink-2">If you win, you must serve every household assigned to you at this price, up to your capacity. Cancelling a won order costs a ₹200 late credit or the gap to the backup seller, from your deposit.</div>
        </div>
      </Sheet>
    </div>
  );
}

function WavePreview({ price, slabs, capUnits }: { price: number; slabs: Slab[]; capUnits: number }) {
  const points = [10, 25, 50, 100, capUnits].filter((n, i, a) => n <= Math.max(capUnits, 10) && a.indexOf(n) === i).sort((a, b) => a - b);
  if (!slabs.length) return <Card className="p-4 text-[13px] text-ink-3">Add a slab to see how the pot grows with volume.</Card>;
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-[12.5px]">
        <thead className="bg-surface-2 text-left text-ink-3"><tr><th className="px-3 py-2 font-semibold">Orders</th><th className="px-3 py-2 text-right font-semibold">Pot</th><th className="px-3 py-2 text-right font-semibold">Each buyer</th><th className="px-3 py-2 text-right font-semibold">You keep on the last</th></tr></thead>
        <tbody className="divide-y divide-line">
          {points.map((n) => { const pot = potFor(slabs, n); return <tr key={n}><td className="num px-3 py-2 font-semibold text-ink">{n}</td><td className="num px-3 py-2 text-right">{inr(pot)}</td><td className="num px-3 py-2 text-right text-wave">{inr(Math.floor(pot / n))}</td><td className="num px-3 py-2 text-right">{inr(price - slabAt(slabs, n))} <span className="text-ink-3">({Math.round(((price - slabAt(slabs, n)) / price) * 100)}%)</span></td></tr>; })}
        </tbody>
      </table>
      <div className="flex items-start gap-2 border-t border-line bg-wave-soft/60 p-3 text-[12px] text-ink-2"><Waves className="mt-0.5 h-4 w-4 shrink-0 text-wave" />Every extra completed order still pays you at least 90% of your price. If you cancel a won order, its slab still goes into the pot.</div>
    </Card>
  );
}

// ---------------------------------------------------------------- Bids and results
export function Bids() {
  const s = useSim();
  const t = useNow(30000);
  const me = s.sellerMeId;
  const [tab, setTab] = useState<'live' | 'review' | 'results'>('live');
  const mine = useMemo(() => s.pools.map((p) => ({ p, b: latestBids(p.bids).find((x) => x.sellerId === me) })).filter((x) => x.b) as Array<{ p: (typeof s.pools)[number]; b: Bid }>, [s.pools, me]);
  const live = mine.filter((x) => x.p.state === 'open');
  const review = mine.filter((x) => x.p.state === 'closed' || x.p.state === 'pricing');
  const results = mine.filter((x) => !['open', 'closed', 'pricing'].includes(x.p.state));
  const list = tab === 'live' ? live : tab === 'review' ? review : results;
  return (
    <div className="pb-6">
      <AppBar back="/seller/demand" title="Your bids" />
      <div className="space-y-4 px-4 pt-3">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'live', label: 'Sealed', count: live.length }, { value: 'review', label: 'In review', count: review.length }, { value: 'results', label: 'Results', count: results.length }]} />
        {list.length === 0 ? <EmptyState icon={<Lock className="h-6 w-6" />} title={tab === 'live' ? 'No sealed bids' : tab === 'review' ? 'Nothing in review' : 'No results yet'} body="Bid on open demand to compete for committed buyers." action={<LinkButton to="/seller/demand" size="sm" variant="wave">See demand</LinkButton>} /> : list.map(({ p, b }) => <BidCard key={p.id} p={p} b={b} t={t} />)}
      </div>
    </div>
  );
}

function BidCard({ p, b, t }: { p: (ReturnType<typeof useSim>)['pools'][number]; b: Bid; t: number }) {
  const s = useSim();
  const [log, setLog] = useState(false);
  const product = productOf(s, p.productId);
  const uom = uomOf(product.uom);
  const won = p.award?.assignments.filter((a) => a.sellerId === s.sellerMeId) ?? [];
  const published = ['offers', 'fulfilment', 'completed'].includes(p.state);
  const rank = p.award ? p.award.ranked.indexOf(b.id) + 1 : 0;
  const inelig = p.award?.ineligible.find((x) => x.bidId === b.id);
  const accepted = s.orders.filter((o) => o.poolId === p.id && o.sellerId === s.sellerMeId).length;
  const ranked = p.award ? p.award.ranked.map((id) => p.bids.find((x) => x.id === id)!) : [];
  const winner = ranked[0];
  const decider = winner && rank > 1 ? (winner.pricePaise < b.pricePaise ? 'price' : winner.deliverBy < b.deliverBy ? 'delivery date' : 'rating') : undefined;
  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <ProductArt art={product.art} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><div className="truncate text-[14.5px] font-bold text-ink">{product.short}</div>{p.state === 'open' ? <Chip tone="wave" icon={<Lock className="h-3 w-3" />}>Sealed</Chip> : !published ? <Chip tone="warn">In review</Chip> : won.length ? <Chip tone="save" icon={<Trophy className="h-3 w-3" />}>Won</Chip> : <Chip>Not selected</Chip>}</div>
          <div className="text-[12.5px] text-ink-3">{p.no} · {inr(b.pricePaise)}/{uom.label} · cap {qtyLabel(b.capacityBase, uom)} · rev {b.revision}</div>
        </div>
      </div>
      <div className="mt-3 text-[13px] text-ink-2">
        {p.state === 'open' && <>Closes {fmtWhen(p.closesAt, t)}. You can lower it until then. {b.history.length > 1 && <span className="text-ink-3">History: {b.history.map((h) => inr(h.pricePaise)).join(' → ')}</span>}</>}
        {!published && p.state !== 'open' && <>Bids opened at close. The POOL team is reviewing the award; results come with the offers{p.pricingDeadline ? `, by ${fmtWhen(p.pricingDeadline, t)}` : ''}.</>}
        {published && won.length > 0 && <><b className="text-ink">{won.length} households</b> assigned ({qtyLabel(won.reduce((a, x) => a + x.qtyBase, 0), uom)}). {accepted} accepted so far{p.acceptBy && p.state === 'offers' ? ` · decide window ends ${fmtWhen(p.acceptBy, t)}` : ''}. <Link to="/seller/orders" className="font-semibold text-wave">Orders</Link></>}
        {published && won.length === 0 && (inelig ? <>Not eligible: {inelig.reasons.join('; ')}.</> : rank ? <>Ranked {rank} of {ranked.length} eligible bids. Deciding factor: <b className="text-ink">{decider}</b>. Winners’ prices stay private.</> : null)}
      </div>
      <button onClick={() => setLog(!log)} className="mt-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-3"><Eye className="h-4 w-4" />Who viewed this bid ({b.accessLog.length})</button>
      {log && (
        <div className="mt-2 space-y-1.5 rounded-[12px] bg-surface-2 p-3 text-[12px]">
          {b.accessLog.length === 0 ? <div className="text-ink-3">Nobody. Prices stay sealed until close.</div> : b.accessLog.map((x, i) => <div key={i} className="flex justify-between gap-2"><span className="text-ink-2"><b className="text-ink">{x.who}</b> · {x.role} · {x.why}</span><span className="shrink-0 text-ink-3">{fmtWhen(x.at, t)}</span></div>)}
          <div className="flex items-center gap-1.5 pt-1 text-ink-3"><ShieldCheck className="h-3.5 w-3.5" />Every view by the POOL team is logged with a reason.</div>
        </div>
      )}
    </Card>
  );
}

