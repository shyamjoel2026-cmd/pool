import { AlertTriangle, Ban, Check, CheckCircle2, Eye, Flag, Gavel, Info, Lock, Send, ShieldCheck, Tag, Undo2, Users, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/cn';
import { gstInMargin, INDIA } from '../lib/gst';
import { inr } from '../lib/money';
import { fmtDay, fmtDayTime, fmtWhen } from '../lib/time';
import { committedCount, effectiveOutside, latestBids, median, minSavingFor, outsideBest, poolDeliverBy, productOf, profileOf, qtyLabel, sellerOf, splitOrder, unservedText, uomOf } from '../sim/engine';
import { poolStageLabel } from '../sim/selectors';
import { confirmAward, demoClosePoolNow, logBidView, publishOffers, setBidBlocked, setBuyerPrice, useNow, useSim } from '../sim/store';
import type { Pool } from '../sim/types';
import { Button, Card, Chip, Countdown, EmptyState, inputCls, KV, Segmented, Sheet, SimTag, useToast } from '../ui/core';
import { ProductArt } from '../ui/ProductArt';
import { Kpi, PageHead } from './OpsApp';

const stageTone = (p: Pool) => (p.state === 'open' ? 'brand' : p.state === 'closed' || p.state === 'pricing' ? 'warn' : p.state === 'offers' ? 'warn' : p.state === 'completed' ? 'save' : p.state === 'no_deal' ? 'neutral' : 'wave');

// ---------------------------------------------------------------- Pools
export function Pools() {
  const s = useSim();
  const t = useNow(30000);
  const [params] = useSearchParams();
  const [st, setSt] = useState<string>(params.get('state') ?? 'all');
  const focus = params.get('focus');
  const list = s.pools.filter((p) => st === 'all' || p.state === st);
  return (
    <>
      <PageHead title="Pools" sub="Every pool, its stage, and the next deadline the engine enforces." />
      <Segmented className="mb-4 max-w-[760px]" value={st} onChange={setSt} options={[{ value: 'all', label: 'All', count: s.pools.length }, ...(['open', 'closed', 'pricing', 'offers', 'fulfilment', 'completed', 'no_deal'] as const).map((x) => ({ value: x, label: poolStageLabel({ state: x } as Pool), count: s.pools.filter((p) => p.state === x).length }))]} />
      <div className="overflow-x-auto rounded-[18px] border border-line bg-surface">
        <table className="w-full min-w-[880px] text-[13px]">
          <thead className="bg-surface-2 text-left text-[12px] text-ink-3"><tr><th className="px-4 py-2.5 font-semibold">Pool</th><th className="px-3 py-2.5 font-semibold">Stage</th><th className="px-3 py-2.5 text-right font-semibold">Households</th><th className="px-3 py-2.5 text-right font-semibold">Bids</th><th className="px-3 py-2.5 font-semibold">Started by</th><th className="px-3 py-2.5 font-semibold">Next deadline</th><th className="px-3 py-2.5" /></tr></thead>
          <tbody className="divide-y divide-line">
            {list.map((p) => {
              const prod = productOf(s, p.productId);
              const next = p.state === 'open' ? ['Closes', p.closesAt] : p.state === 'closed' || p.state === 'pricing' ? ['Pricing deadline', p.pricingDeadline] : p.state === 'offers' ? ['Decide window ends', p.acceptBy] : undefined;
              const action = p.state === 'closed' ? ['Review award', `/ops/awards/${p.id}`] : p.state === 'pricing' ? ['Set prices', `/ops/pricing/${p.id}`] : p.state === 'open' ? ['Bids', `/ops/awards/${p.id}`] : p.state === 'fulfilment' ? ['Exceptions', '/ops/exceptions'] : ['Award', `/ops/awards/${p.id}`];
              return (
                <tr key={p.id} className={cn('hover:bg-surface-2', focus === p.id && 'bg-brand-soft/50')}>
                  <td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><ProductArt art={prod.art} size={34} rounded={10} /><div className="min-w-0"><div className="truncate font-semibold text-ink">{prod.short}</div><div className="text-[11.5px] text-ink-3">{p.no} · {p.areaLabel}</div></div></div></td>
                  <td className="px-3 py-2.5"><Chip tone={stageTone(p)} dot>{poolStageLabel(p)}</Chip></td>
                  <td className="num px-3 py-2.5 text-right font-semibold">{committedCount(p)}</td>
                  <td className="num px-3 py-2.5 text-right">{latestBids(p.bids).length}</td>
                  <td className="px-3 py-2.5 text-ink-2">{p.startedBy.name}</td>
                  <td className="px-3 py-2.5 text-ink-2">{next?.[1] ? <>{next[0]} · <span className="font-semibold text-ink">{fmtWhen(next[1] as number, t)}</span></> : p.noDealReason ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right"><Link to={action[1]} className="font-semibold text-brand">{action[0]} →</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Awards
export function Awards() {
  const { poolId } = useParams();
  const s = useSim();
  const t = useNow(1000);
  const nav = useNavigate();
  const toast = useToast();
  const [hold, setHold] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const logged = useRef<string | null>(null);
  const queue = s.pools.filter((p) => p.state === 'closed' || p.state === 'open');
  const pool = s.pools.find((p) => p.id === poolId) ?? s.pools.find((p) => p.state === 'closed');
  useEffect(() => {
    if (pool && (pool.state === 'closed' || pool.state === 'pricing') && logged.current !== pool.id) {
      logged.current = pool.id;
      logBidView(pool.id, 'Award review');
    }
  }, [pool?.id, pool?.state]);
  if (!pool) return <><PageHead title="Awards" /><EmptyState icon={<Gavel className="h-6 w-6" />} title="No pools waiting for an award" body="When a pool closes at its chosen time, its sealed bids open here." /></>;
  const product = productOf(s, pool.productId);
  const uom = uomOf(product.uom);
  const latest = latestBids(pool.bids);
  const med = median(latest);
  const sealed = pool.state === 'open';
  const award = pool.award;
  const rankedIds = award?.ranked ?? [];
  const rows = [...latest].sort((a, b) => {
    const ra = rankedIds.indexOf(a.id), rb = rankedIds.indexOf(b.id);
    return (ra < 0 ? 999 : ra) - (rb < 0 ? 999 : rb) || a.pricePaise - b.pricePaise;
  });
  const assignedBy = (bidId: string) => award?.assignments.filter((a) => a.bidId === bidId) ?? [];
  const members = pool.members.filter((m) => m.status !== 'pending' && m.status !== 'left');
  const memberOf = (id: string) => pool.members.find((m) => m.id === id);
  const canEdit = pool.state === 'closed';
  return (
    <>
      <PageHead eyebrow={`Award · ${pool.no}`} title={product.short} sub={`${pool.areaLabel} · ${committedCount(pool)} committed households · deliver by ${fmtDayTime(poolDeliverBy(pool))}. The published rule ranks eligible bids by seller price, then delivery date, then rating. POOL’s margin is never a factor.`} right={queue.length > 1 ? <select className={cn(inputCls, 'h-10 w-auto text-[13.5px]')} value={pool.id} onChange={(e) => nav(`/ops/awards/${e.target.value}`)}>{s.pools.filter((p) => p.bids.length).map((p) => <option key={p.id} value={p.id}>{productOf(s, p.productId).short} · {poolStageLabel(p)}</option>)}</select> : undefined} />
      {sealed ? (
        <Card className="flex flex-col items-center p-10 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-[20px] bg-brand-soft text-brand"><Lock className="h-8 w-8" /></div>
          <div className="mt-4 text-[20px] font-bold text-ink">{latest.length} sealed bids · prices hidden from everyone, including you</div>
          <p className="mt-2 max-w-[520px] text-[14px] text-ink-2">They open automatically when the pool closes at the time its starter chose: <b>{fmtDayTime(pool.closesAt)}</b> (<Countdown to={pool.closesAt} compact />). The team can see who bid, but never a price before close.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">{latest.map((b) => <Chip key={b.id} icon={<Lock className="h-3 w-3" />}>{sellerOf(s, b.sellerId).name} · rev {b.revision}</Chip>)}</div>
          <div className="mt-6 rounded-[16px] border border-dashed border-sim/50 bg-sim-soft p-4"><SimTag>Demo shortcut</SimTag><p className="mt-1.5 text-[13px] text-ink-2">In real use the pool closes only at its chosen time.</p><Button className="mt-3" variant="dark" icon={<Zap className="h-4 w-4" />} onClick={() => { const r = demoClosePoolNow(pool.id); r.ok ? toast('Pool closed · bids opened') : toast(r.error, 'err'); }}>Close this pool now</Button></div>
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Kpi label="Eligible bids" value={`${rankedIds.length}/${latest.length}`} />
            <Kpi label="Median seller price" value={inr(med)} />
            <Kpi label="Flagged for a check" value={award?.flagged.length ?? 0} sub={`> ${INDIA.bidAnomalyBps / 100}% below median`} tone={award?.flagged.length ? 'warn' : 'save'} />
            <Kpi label="Households served" value={`${award?.assignments.length ?? 0}/${members.length}`} tone="save" />
            <Kpi label="Pricing deadline" value={pool.pricingDeadline ? <Countdown to={pool.pricingDeadline} compact /> : '—'} sub="then no deal, full refunds" tone="warn" />
          </div>
          <div className="overflow-x-auto rounded-[18px] border border-line bg-surface">
            <table className="w-full min-w-[980px] text-[13px]">
              <thead className="bg-surface-2 text-left text-[12px] text-ink-3"><tr><th className="px-4 py-2.5 font-semibold">Rank</th><th className="px-3 py-2.5 font-semibold">Seller</th><th className="px-3 py-2.5 text-right font-semibold">Price/{uom.label}</th><th className="px-3 py-2.5 font-semibold">Deliver by</th><th className="px-3 py-2.5 text-right font-semibold">Capacity</th><th className="px-3 py-2.5 font-semibold">Wave Drop</th><th className="px-3 py-2.5 font-semibold">Assigned</th><th className="px-3 py-2.5 font-semibold">Check</th></tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map((b) => {
                  const sl = sellerOf(s, b.sellerId);
                  const rank = rankedIds.indexOf(b.id) + 1;
                  const inel = award?.ineligible.find((x) => x.bidId === b.id);
                  const flagged = award?.flagged.includes(b.id);
                  const asg = assignedBy(b.id);
                  const blocked = pool.blocked[b.id];
                  return (
                    <tr key={b.id} className={cn(inel && 'bg-surface-2/60', flagged && !blocked && 'bg-warn-soft/40')}>
                      <td className="px-4 py-3">{rank ? <span className={cn('num grid h-7 w-7 place-items-center rounded-full text-[12.5px] font-bold', rank === 1 ? 'bg-save text-white' : 'bg-surface-3 text-ink')}>{rank}</span> : <Chip tone={blocked ? 'danger' : 'neutral'}>{blocked ? 'Held' : 'Ineligible'}</Chip>}</td>
                      <td className="px-3 py-3"><div className="font-semibold text-ink">{sl.name}</div><div className="text-[11.5px] text-ink-3">{sl.rating ? `★ ${sl.rating.toFixed(1)} · ${sl.settledOrders} orders` : 'New · no completed orders'} · {sl.city}{b.revision > 1 ? ` · rev ${b.revision}` : ''}</div>{inel && <div className="mt-1 text-[11.5px] text-danger">{inel.reasons.join(' · ')}</div>}</td>
                      <td className="num px-3 py-3 text-right font-bold text-ink">{inr(b.pricePaise)}{flagged && <div className="text-[11px] font-semibold text-warn">{Math.round((1 - b.pricePaise / med) * 100)}% below median</div>}</td>
                      <td className="px-3 py-3 text-ink-2">{fmtDay(b.deliverBy)}</td>
                      <td className="num px-3 py-3 text-right">{qtyLabel(b.capacityBase, uom)}</td>
                      <td className="px-3 py-3 text-ink-2">{b.slabs.length ? b.slabs.map((x) => `#${x.fromUnit} ${inr(x.perUnitPaise)}`).join(', ') : '—'}</td>
                      <td className="px-3 py-3">{asg.length ? <span className="font-semibold text-save">{asg.length} households</span> : <span className="text-ink-3">—</span>}</td>
                      <td className="px-3 py-3">{canEdit && (blocked ? <Button size="sm" variant="ghost" icon={<Undo2 className="h-4 w-4" />} onClick={() => { setBidBlocked(pool.id, b.id, null); toast('Bid allowed back in'); }}>Allow</Button> : <Button size="sm" variant={flagged ? 'outline' : 'ghost'} icon={<Ban className="h-4 w-4" />} onClick={() => { setHold(b.id); setReason(flagged ? 'Price far below the market; dealer authorisation not on file' : ''); }}>Hold back</Button>)}{blocked && <div className="mt-1 max-w-[180px] text-[11px] text-ink-3">{blocked}</div>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[15px] font-bold text-ink"><Users className="h-5 w-5 text-brand" />Assignment (join order, with backups)</div>
              <div className="mt-3 space-y-2">
                {[...new Set(award?.assignments.map((a) => a.sellerId))].map((sid) => {
                  const as = award!.assignments.filter((a) => a.sellerId === sid);
                  return <div key={sid} className="flex items-center justify-between rounded-[12px] bg-surface-2 px-3 py-2 text-[13px]"><span className="font-semibold text-ink">{sellerOf(s, sid).name}</span><span className="text-ink-2">{as.length} households · {qtyLabel(as.reduce((a, x) => a + x.qtyBase, 0), uom)} · {as.filter((x) => x.backupBidId).length} with backup</span></div>;
                })}
              </div>
              {award && award.unserved.length > 0 && (
                <div className="mt-4">
                  <div className="text-[13px] font-semibold text-warn">{award.unserved.length} households can’t be served (refunded in full when offers publish)</div>
                  <ul className="mt-2 space-y-1 text-[12.5px] text-ink-2">{award.unserved.slice(0, 6).map((u) => <li key={u.memberId}>• {memberOf(u.memberId)?.name ?? 'Buyer'} ({memberOf(u.memberId)?.area}): {unservedText[u.reason]}</li>)}</ul>
                </div>
              )}
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-[15px] font-bold text-ink"><Eye className="h-5 w-5 text-brand" />Access to these bids</div>
              <p className="mt-1 text-[12.5px] text-ink-3">Opening this page was logged against every bid. Sellers can see this log.</p>
              <div className="mt-3 max-h-[180px] space-y-1.5 overflow-y-auto text-[12.5px]">
                {latest.flatMap((b) => b.accessLog.map((x) => ({ ...x, seller: sellerOf(s, b.sellerId).name }))).sort((a, b) => b.at - a.at).slice(0, 12).map((x, i) => <div key={i} className="flex justify-between gap-3"><span className="text-ink-2"><b className="text-ink">{x.who}</b> viewed {x.seller} · {x.why}</span><span className="shrink-0 text-ink-3">{fmtWhen(x.at, t)}</span></div>)}
              </div>
            </Card>
          </div>

          <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-line bg-surface/95 p-4 shadow-[var(--shadow-pop)] backdrop-blur">
            <div className="text-[13.5px] text-ink-2">{pool.state === 'closed' ? <>Confirming locks the assignment. Next: set buyer prices before <b className="text-ink">{fmtWhen(pool.pricingDeadline!, t)}</b>.</> : <>Award confirmed by {award?.confirmedBy} · {award?.confirmedAt ? fmtWhen(award.confirmedAt, t) : ''}.</>}</div>
            {pool.state === 'closed' ? <Button icon={<CheckCircle2 className="h-4.5 w-4.5" />} onClick={() => { const r = confirmAward(pool.id); if (r.ok) { toast('Award confirmed'); nav(`/ops/pricing/${pool.id}`); } else toast(r.error, 'err'); }}>Confirm award</Button> : pool.state === 'pricing' ? <Button icon={<Tag className="h-4.5 w-4.5" />} onClick={() => nav(`/ops/pricing/${pool.id}`)}>Go to pricing</Button> : <Chip tone="save">{poolStageLabel(pool)}</Chip>}
          </div>
        </>
      )}
      <Sheet open={!!hold} onClose={() => setHold(null)} title="Hold back this bid?" footer={<div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setHold(null)}>Cancel</Button><Button variant="danger" disabled={reason.trim().length < 8} onClick={() => { setBidBlocked(pool.id, hold!, reason.trim()); setHold(null); toast('Bid held back · award recomputed'); }}>Hold back</Button></div>}>
        <div className="space-y-3">
          <p className="text-[13.5px] text-ink-2">The award is recomputed without it. The reason is logged and shown to the seller. Flags never punish automatically; a person decides.</p>
          <textarea className={cn(inputCls, 'h-24 py-3')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (at least a sentence)" />
        </div>
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------- Pricing
export function Pricing() {
  const { poolId } = useParams();
  const s = useSim();
  const t = useNow(1000);
  const nav = useNavigate();
  const toast = useToast();
  const pool = s.pools.find((p) => p.id === poolId) ?? s.pools.find((p) => p.state === 'pricing');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const winners = useMemo(() => (pool?.award ? [...new Set(pool.award.assignments.map((a) => a.bidId))] : []), [pool]);
  if (!pool || !pool.award) return <><PageHead title="Pricing" /><EmptyState icon={<Tag className="h-6 w-6" />} title="Nothing to price" body="Confirm an award first. Pools waiting for prices appear here." action={<Button size="sm" onClick={() => nav('/ops/awards')}>Awards</Button>} /></>;
  const product = productOf(s, pool.productId);
  const uom = uomOf(product.uom);
  const prof = profileOf(s, pool.profileId);
  const best = outsideBest(product, []);
  const cardQuotes = product.outside.filter((q) => q.cardOffer).map((q) => ({ q, eff: effectiveOutside(q, [{ id: 'x', bank: q.cardOffer!.bank, type: q.cardOffer!.cardType, network: '' }]) }));
  const bestCard = cardQuotes.sort((a, b) => a.eff.price - b.eff.price)[0];
  const minSave = minSavingFor(best.plainBest);
  const editable = pool.state === 'pricing';
  const missing = winners.filter((b) => !pool.prices[b]);
  let totalMargin = 0;
  let totalGmv = 0;
  return (
    <>
      <PageHead eyebrow={`Pricing · ${pool.no}`} title={product.short} sub="The seller bid its price. You decide what buyers pay, per pool. POOL keeps the difference as its fee (GST-inclusive). Prices below the seller’s are blocked; the saving guide is shown, never enforced." right={pool.pricingDeadline && editable ? <div className="rounded-[14px] border border-warn/30 bg-warn-soft px-4 py-2 text-right"><div className="text-[11.5px] font-semibold text-warn">Publish by {fmtWhen(pool.pricingDeadline, t)}</div><Countdown to={pool.pricingDeadline} className="text-[18px]" /></div> : <Chip tone="save">{poolStageLabel(pool)}</Chip>} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Plain best outside" value={inr(best.plainBest)} sub={best.quote.source} />
        <Kpi label="Best with a card offer" value={bestCard ? inr(bestCard.eff.price) : '—'} sub={bestCard ? `${bestCard.q.source} · ${bestCard.q.cardOffer!.label.split('·')[0]}` : 'No card offers'} tone="warn" />
        <Kpi label="Guide: minimum saving" value={inr(minSave)} sub="₹1,000 or 2%, whichever is higher" tone="save" />
        <Kpi label="Units assigned" value={qtyLabel(pool.award.assignments.reduce((a, x) => a + x.qtyBase, 0), uom)} sub={`${pool.award.assignments.length} households`} />
      </div>
      <div className="space-y-4">
        {winners.map((bidId) => {
          const bid = pool.bids.find((b) => b.id === bidId)!;
          const seller = sellerOf(s, bid.sellerId);
          const as = pool.award!.assignments.filter((a) => a.bidId === bidId);
          const units = as.reduce((a, x) => a + x.qtyBase, 0);
          const cur = pool.prices[bidId];
          const val = drafts[bidId] ?? (cur ? String(cur.buyerPricePaise / 100) : '');
          const price = Math.round(Number(val) * 100) || 0;
          const margin = price - bid.pricePaise;
          const gstM = gstInMargin(Math.max(0, margin));
          const saving = best.plainBest - price;
          const lineBuyer = Math.round((price * units) / uom.baseScale);
          const lineSeller = Math.round((bid.pricePaise * units) / uom.baseScale);
          totalMargin += lineBuyer - lineSeller;
          totalGmv += lineBuyer;
          const split = price > 0 ? splitOrder({ buyerTotal: price, sellerTotal: bid.pricePaise, gstBps: product.gstBps, profile: prof, waveHold: 0 }) : undefined;
          const suggested = Math.max(bid.pricePaise + 100, Math.floor((best.plainBest - minSave) / 100) * 100);
          const below = price > 0 && price < bid.pricePaise;
          const thin = price > 0 && saving < minSave;
          const cardBeats = bestCard && price > bestCard.eff.price;
          return (
            <Card key={bidId} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3"><ProductArt art={product.art} size={44} /><div><div className="text-[16px] font-bold text-ink">{seller.name}</div><div className="text-[12.5px] text-ink-3">Seller price {inr(bid.pricePaise)}/{uom.label} · {as.length} households · {qtyLabel(units, uom)} · by {fmtDay(bid.deliverBy)}</div></div></div>
                {cur && <Chip tone="save" icon={<Check className="h-3 w-3" />}>Set by {cur.decidedBy} · {fmtWhen(cur.decidedAt, t)}</Chip>}
              </div>
              <div className="mt-4 grid gap-5 lg:grid-cols-[320px_1fr]">
                <div>
                  <label className="text-[12.5px] font-semibold text-ink-2" htmlFor={`bp-${bidId}`}>Buyer price per {uom.label}</label>
                  <div className="relative mt-1"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] font-bold text-ink-3">₹</span><input id={`bp-${bidId}`} disabled={!editable} inputMode="decimal" className={cn(inputCls, 'h-14 pl-9 text-[22px] font-bold num', below && 'border-danger')} value={val} onChange={(e) => setDrafts({ ...drafts, [bidId]: e.target.value.replace(/[^0-9.]/g, '') })} /></div>
                  {editable && <button onClick={() => setDrafts({ ...drafts, [bidId]: String(suggested / 100) })} className="mt-2 text-[12.5px] font-semibold text-brand">Use guide price {inr(suggested)} (keeps the minimum saving)</button>}
                  {s.tour.active && editable && pool.id === 'pool-tv' && <button onClick={() => setDrafts({ ...drafts, [bidId]: '43000' })} className="ml-3 text-[12.5px] font-semibold text-sim">Walkthrough: ₹43,000</button>}
                  {below && <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-danger"><AlertTriangle className="h-4 w-4" />Below the seller’s price. POOL-funded discounts are switched off.</p>}
                  {thin && !below && <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-warn"><Info className="h-4 w-4" />Saving {inr(Math.max(0, saving))} is under the guide of {inr(minSave)}. Allowed, but buyers may walk away.</p>}
                  {cardBeats && !below && <p className="mt-2 text-[12px] text-ink-3">Buyers with the {bestCard!.q.cardOffer!.bank} offer will see {bestCard!.q.source} at {inr(bestCard!.eff.price)}. Their offer will tell them it’s cheaper.</p>}
                  {editable && <Button className="mt-3" disabled={!price || below || (cur && cur.buyerPricePaise === price)} onClick={() => { const r = setBuyerPrice(pool.id, bidId, price); r.ok ? toast(`Price set: ${inr(price)}`) : toast(r.error, 'err'); }}>{cur ? 'Update price' : 'Set price'}</Button>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[14px] bg-surface-2 p-4">
                    <div className="eyebrow text-ink-3">Per {uom.label}</div>
                    <KV k="Buyer pays" v={price ? inr(price) : '—'} strong />
                    <KV k="Seller gets (bid)" v={inr(bid.pricePaise)} />
                    <KV k="POOL margin" v={price ? inr(margin) : '—'} tone={margin > 0 ? 'save' : margin < 0 ? 'danger' : undefined} hint={price ? `${((margin / price) * 100).toFixed(2)}% take rate` : undefined} />
                    <KV k="GST inside margin (18%)" v={price ? inr(gstM, { exact: true }) : '—'} tone="muted" />
                    <KV k="Net margin" v={price ? inr(margin - gstM, { exact: true }) : '—'} strong />
                  </div>
                  <div className="rounded-[14px] bg-surface-2 p-4">
                    <div className="eyebrow text-ink-3">What the buyer sees</div>
                    <KV k="Saving vs plain outside" v={price ? inr(saving) : '—'} tone={saving >= minSave ? 'save' : 'danger'} />
                    <KV k={`For ${as.length} households`} v={price ? inr(lineBuyer) : '—'} />
                    <KV k="Pool margin, this seller" v={price ? inr(lineBuyer - lineSeller) : '—'} tone="save" />
                    {split && <KV k="TCS + TDS (from seller)" v={inr(split.tcs + split.tds, { exact: true })} tone="muted" hint="per unit, at this price" />}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-line bg-surface/95 p-4 shadow-[var(--shadow-pop)] backdrop-blur">
        <div className="text-[13.5px] text-ink-2">{editable ? (missing.length ? <><Flag className="mr-1 inline h-4 w-4 text-warn" />{missing.length} winning {missing.length === 1 ? 'bid needs' : 'bids need'} a price.</> : <>All set. Pool margin <b className="text-ink">{inr(totalMargin)}</b> on {inr(totalGmv)} ({totalGmv ? ((totalMargin / totalGmv) * 100).toFixed(2) : 0}%). Publishing sends {pool.award.assignments.length} personal offers with a 24-hour decide window.</>) : <>Offers published {pool.offersAt ? fmtWhen(pool.offersAt, t) : ''}.</>}</div>
        {editable && <Button disabled={missing.length > 0} icon={<Send className="h-4.5 w-4.5" />} onClick={() => { const r = publishOffers(pool.id); r.ok ? (toast('Offers published'), nav('/ops')) : toast(r.error, 'err'); }}>Publish offers</Button>}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-3"><ShieldCheck className="h-4 w-4" />Every price decision is logged with who set it and when. Prices can’t go up after offers are published.</p>
    </>
  );
}
