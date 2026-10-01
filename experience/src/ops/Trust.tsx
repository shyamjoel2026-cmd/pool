import { AlertTriangle, Check, CheckCircle2, Eye, FileCheck2, Filter, Search, ShieldAlert, ShieldCheck, Star, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/cn';
import { checkGstin, checkPan, STATE_CODES } from '../lib/gstin';
import { INDIA } from '../lib/gst';
import { inr } from '../lib/money';
import { fmtDayTime, fmtWhen } from '../lib/time';
import { productOf } from '../sim/engine';
import { reviewApplication, setSignal, useNow, useSim } from '../sim/store';
import type { RiskSignal, SellerApplication } from '../sim/types';
import { Button, Card, Chip, EmptyState, inputCls, KV, Segmented, Sheet, SimTag, useToast } from '../ui/core';
import { Kpi, PageHead } from './OpsApp';

// ---------------------------------------------------------------- Seller review (KYB)
const norm = (x: string) => x.toUpperCase().replace(/[^A-Z0-9]/g, '');
function kyb(a: SellerApplication) {
  const g = checkGstin(a.gstin);
  const panOk = checkPan(a.pan);
  const panInGst = g.format && g.pan === a.pan;
  const stateOk = g.stateCode === a.stateCode;
  const bankOk = norm(a.bankHolder) === norm(a.legalNameOnGst);
  const docs = a.documents.every((d) => d.ok);
  return [
    { k: 'GSTIN format and checksum', ok: g.ok, note: g.message },
    { k: 'PAN format', ok: panOk, note: panOk ? a.pan : 'Not a valid PAN shape' },
    { k: 'PAN inside GSTIN', ok: panInGst, note: panInGst ? 'Matches' : 'GSTIN carries a different PAN' },
    { k: 'GST state = business state', ok: stateOk, note: `${STATE_CODES[a.stateCode] ?? a.stateCode}` },
    { k: 'Bank holder = legal name on GST', ok: bankOk, note: bankOk ? 'Penny-drop name matches' : `“${a.bankHolder}” vs “${a.legalNameOnGst}”` },
    { k: 'Documents', ok: docs, note: a.documents.filter((d) => !d.ok).map((d) => `${d.name} missing`).join(', ') || 'All on file' },
  ];
}

export function SellerReview() {
  const s = useSim();
  const t = useNow(30000);
  const toast = useToast();
  const [tab, setTab] = useState<'pending' | 'decided' | 'active'>('pending');
  const [open, setOpen] = useState<SellerApplication | null>(null);
  const [decision, setDecision] = useState<'approved' | 'changes_requested' | 'rejected'>('approved');
  const [note, setNote] = useState('');
  const pending = s.applications.filter((a) => a.status === 'pending');
  const decided = s.applications.filter((a) => a.status !== 'pending');
  const list = tab === 'pending' ? pending : decided;
  return (
    <>
      <PageHead title="Seller review" sub="Know-your-business checks run automatically; a person approves. Nobody can bid until they’re verified." />
      <Segmented className="mb-4 max-w-[480px]" value={tab} onChange={setTab} options={[{ value: 'pending', label: 'Waiting', count: pending.length }, { value: 'decided', label: 'Decided', count: decided.length }, { value: 'active', label: 'Active sellers', count: s.sellers.length }]} />
      {tab === 'active' ? (
        <div className="overflow-x-auto rounded-[18px] border border-line bg-surface">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead className="bg-surface-2 text-left text-[12px] text-ink-3"><tr><th className="px-4 py-2.5 font-semibold">Seller</th><th className="px-3 py-2.5 font-semibold">GSTIN</th><th className="px-3 py-2.5 text-right font-semibold">Rating</th><th className="px-3 py-2.5 text-right font-semibold">Orders</th><th className="px-3 py-2.5 text-right font-semibold">On time</th><th className="px-3 py-2.5 text-right font-semibold">Cancelled</th><th className="px-3 py-2.5 text-right font-semibold">Deposit</th></tr></thead>
            <tbody className="divide-y divide-line">{s.sellers.map((x) => <tr key={x.id} className="hover:bg-surface-2"><td className="px-4 py-2.5"><div className="font-semibold text-ink">{x.name}{x.id === s.sellerMeId && <Chip tone="wave" className="ml-1.5">demo seller</Chip>}</div><div className="text-[11.5px] text-ink-3">{x.kind.replace('_', ' ')} · {x.area}, {x.city}</div></td><td className="px-3 py-2.5 font-mono text-[12px] text-ink-2">{x.gstin}</td><td className="num px-3 py-2.5 text-right">{x.rating ? <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warn text-warn" />{x.rating.toFixed(1)}</span> : <Chip tone="warn">New</Chip>}</td><td className="num px-3 py-2.5 text-right">{x.settledOrders}</td><td className="num px-3 py-2.5 text-right">{Math.round(x.onTimeBps / 100)}%</td><td className="num px-3 py-2.5 text-right">{(x.cancelBps / 100).toFixed(1)}%</td><td className="num px-3 py-2.5 text-right">{inr(x.depositPaise)}</td></tr>)}</tbody>
          </table>
        </div>
      ) : list.length === 0 ? <EmptyState icon={<FileCheck2 className="h-6 w-6" />} title={tab === 'pending' ? 'No applications waiting' : 'No decisions yet'} /> : (
        <div className="grid gap-4 xl:grid-cols-3">
          {list.map((a) => {
            const checks = kyb(a);
            const fails = checks.filter((c) => !c.ok).length;
            return (
              <Card key={a.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2"><div><div className="text-[16px] font-bold text-ink">{a.business}</div><div className="text-[12.5px] text-ink-3">{a.owner} · {a.kind} · {a.city} · {fmtWhen(a.submittedAt, t)}</div></div>{a.status === 'pending' ? <Chip tone={fails ? 'warn' : 'save'}>{fails ? `${fails} to check` : 'All checks pass'}</Chip> : <Chip tone={a.status === 'approved' ? 'save' : a.status === 'rejected' ? 'danger' : 'warn'}>{a.status.replace('_', ' ')}</Chip>}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{a.categories.map((c) => <Chip key={c}>{c}</Chip>)}</div>
                <ul className="mt-4 flex-1 space-y-2">{checks.map((c) => <li key={c.k} className="flex items-start gap-2 text-[12.5px]">{c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-save" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />}<span><b className="text-ink">{c.k}</b><span className="block text-ink-3">{c.note}</span></span></li>)}</ul>
                <div className="mt-3 font-mono text-[11.5px] text-ink-3">GSTIN {a.gstin}</div>
                {a.status === 'pending' ? <Button className="mt-4" onClick={() => { setOpen(a); setDecision(fails ? 'changes_requested' : 'approved'); setNote(fails ? checks.filter((c) => !c.ok).map((c) => `${c.k}: ${c.note}`).join('. ') : 'All KYB checks pass. Approved for the listed categories.'); }}>Review</Button> : a.note && <p className="mt-3 rounded-[12px] bg-surface-2 p-3 text-[12px] text-ink-2">{a.note}</p>}
              </Card>
            );
          })}
        </div>
      )}
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.business} footer={<Button full variant={decision === 'rejected' ? 'danger' : 'primary'} disabled={note.trim().length < 6} onClick={() => { reviewApplication(open!.id, decision, note.trim()); setOpen(null); toast(decision === 'approved' ? 'Seller approved and can now bid' : decision === 'rejected' ? 'Application rejected' : 'Changes requested from the seller'); }}>Send decision</Button>}>
        <div className="space-y-3">
          <Segmented value={decision} onChange={setDecision} options={[{ value: 'approved', label: 'Approve' }, { value: 'changes_requested', label: 'Ask for changes' }, { value: 'rejected', label: 'Reject' }]} />
          <textarea className={cn(inputCls, 'h-28 py-3')} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to the seller (logged)" />
          <p className="text-[12px] text-ink-3">Approved sellers start with a security deposit and appear as “New seller” to buyers until they complete orders.</p>
        </div>
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------- Risk
const KIND_LABEL: Record<RiskSignal['kind'], string> = { shared_payer: 'Shared payer', shared_device: 'Shared device', similar_bids: 'Similar bids', winner_rotation: 'Win rotation', join_burst: 'Join burst', low_bid: 'Low bid' };
export function Risk() {
  const s = useSim();
  const t = useNow(30000);
  const toast = useToast();
  const [f, setF] = useState<'open' | 'all'>('open');
  const [act, setAct] = useState<{ sig: RiskSignal; to: RiskSignal['status'] } | null>(null);
  const [note, setNote] = useState('');
  const list = s.signals.filter((x) => f === 'all' || ['new', 'watching', 'escalated', 'hold_payouts'].includes(x.status));
  return (
    <>
      <PageHead title="Risk" sub="Signals, never automatic punishment. Each one shows its evidence; a person decides and the reason is logged." />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="New" value={s.signals.filter((x) => x.status === 'new').length} tone="danger" />
        <Kpi label="Watching" value={s.signals.filter((x) => x.status === 'watching').length} tone="warn" />
        <Kpi label="Payouts on hold" value={s.signals.filter((x) => x.status === 'hold_payouts').length} />
        <Kpi label="Dismissed" value={s.signals.filter((x) => x.status === 'dismissed').length} tone="save" />
      </div>
      <Segmented className="mb-4 max-w-[300px]" value={f} onChange={setF} options={[{ value: 'open', label: 'Open' }, { value: 'all', label: 'All' }]} />
      <div className="grid gap-4 xl:grid-cols-2">
        {list.map((x) => (
          <Card key={x.id} className={cn('p-5', x.severity === 'high' && x.status === 'new' && 'border-danger/40')}>
            <div className="flex flex-wrap items-center gap-2"><Chip tone={x.severity === 'high' ? 'danger' : x.severity === 'medium' ? 'warn' : 'neutral'} dot>{x.severity}</Chip><Chip>{KIND_LABEL[x.kind]}</Chip><Chip tone={x.status === 'new' ? 'brand' : x.status === 'dismissed' ? 'save' : 'warn'}>{x.status.replace('_', ' ')}</Chip><span className="ml-auto text-[12px] text-ink-3">{fmtWhen(x.at, t)}</span></div>
            <div className="mt-2 text-[16px] font-bold text-ink">{x.title}</div>
            <p className="mt-1 text-[13px] text-ink-2">{x.detail}</p>
            <div className="mt-3 rounded-[12px] bg-surface-2 p-3"><div className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-3">Evidence</div><ul className="mt-1.5 space-y-1 text-[12.5px] text-ink-2">{x.evidence.map((e) => <li key={e} className="flex gap-2"><Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />{e}</li>)}</ul></div>
            {x.poolId && <div className="mt-2 text-[12px] text-ink-3">Pool: {productOf(s, s.pools.find((p) => p.id === x.poolId)!.productId).short}</div>}
            {x.note && <div className="mt-2 rounded-[10px] bg-warn-soft px-3 py-2 text-[12.5px] text-ink-2"><b>Note:</b> {x.note}</div>}
            <div className="mt-4 flex flex-wrap gap-2">
              {x.status !== 'watching' && <Button size="sm" variant="outline" onClick={() => setAct({ sig: x, to: 'watching' })}>Watch</Button>}
              {x.status !== 'escalated' && <Button size="sm" variant="outline" icon={<ShieldAlert className="h-4 w-4" />} onClick={() => setAct({ sig: x, to: 'escalated' })}>Escalate</Button>}
              {x.status !== 'hold_payouts' && <Button size="sm" variant="outline" onClick={() => setAct({ sig: x, to: 'hold_payouts' })}>Hold payouts</Button>}
              {x.status !== 'dismissed' && <Button size="sm" variant="ghost" icon={<X className="h-4 w-4" />} onClick={() => setAct({ sig: x, to: 'dismissed' })}>Dismiss</Button>}
            </div>
          </Card>
        ))}
        {list.length === 0 && <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="No open signals" />}
      </div>
      <Sheet open={!!act} onClose={() => setAct(null)} title={act ? `${act.to.replace('_', ' ')}: ${act.sig.title}` : ''} footer={<Button full disabled={note.trim().length < 6} onClick={() => { setSignal(act!.sig.id, act!.to, note.trim()); setAct(null); setNote(''); toast('Signal updated and logged'); }}>Save</Button>}>
        <textarea className={cn(inputCls, 'h-28 py-3')} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why? (required, goes in the audit log)" />
        {act?.to === 'hold_payouts' && <p className="mt-2 text-[12.5px] text-ink-3">Payouts are paused, not taken. The seller is told the reason and can respond.</p>}
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------- Audit
export function Audit() {
  const s = useSim();
  const t = useNow(30000);
  const [q, setQ] = useState('');
  const [who, setWho] = useState<'all' | 'team' | 'system' | 'demo'>('all');
  const list = s.audit.filter((e) => (who === 'all' || (who === 'system' ? e.actor === 'System' : who === 'demo' ? e.actor === 'Demo control' : e.actor === s.opsUser.name || e.actor.includes('POOL'))) && (!q || `${e.actor} ${e.action} ${e.detail}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <PageHead title="Audit log" sub="Append-only. Who did what, when and why: bids viewed, awards, prices, refunds, demo shortcuts." />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-3 h-4.5 w-4.5 text-ink-3" /><input className={cn(inputCls, 'h-11 pl-10')} placeholder="Search actions, people, pools" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Segmented value={who} onChange={setWho} options={[{ value: 'all', label: 'All' }, { value: 'team', label: 'POOL team' }, { value: 'system', label: 'System' }, { value: 'demo', label: 'Demo' }]} />
      </div>
      <div className="overflow-x-auto rounded-[18px] border border-line bg-surface">
        <table className="w-full min-w-[820px] text-[13px]">
          <thead className="bg-surface-2 text-left text-[12px] text-ink-3"><tr><th className="px-4 py-2.5 font-semibold">When</th><th className="px-3 py-2.5 font-semibold">Actor</th><th className="px-3 py-2.5 font-semibold">Action</th><th className="px-3 py-2.5 font-semibold">Detail</th></tr></thead>
          <tbody className="divide-y divide-line">{list.slice(0, 200).map((e) => <tr key={e.id} className="align-top hover:bg-surface-2"><td className="whitespace-nowrap px-4 py-2.5 text-ink-3">{fmtWhen(e.at, t)}</td><td className="px-3 py-2.5 font-semibold text-ink">{e.actor}{e.actor === 'Demo control' && <SimTag className="ml-1.5">demo</SimTag>}</td><td className="px-3 py-2.5 text-ink">{e.action}</td><td className="px-3 py-2.5 text-ink-2">{e.detail}</td></tr>)}</tbody>
        </table>
        {list.length === 0 && <div className="p-8 text-center text-[13.5px] text-ink-3"><Filter className="mx-auto mb-2 h-5 w-5" />No events match</div>}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Rules & settings (read-only policy)
export function Settings() {
  const s = useSim();
  const rules: Array<[string, string, string]> = [
    ['Decide window for offers', `${INDIA.acceptWindowHours} hours`, 'No reply = walk away, full refund'],
    ['Pricing deadline after close', `${INDIA.pricingWindowHours} hours`, 'Missed = no deal, every booking refunded'],
    ['Pool length', `${INDIA.minPoolMinutes} min – ${INDIA.maxPoolDays} days`, 'Chosen by the starter; can only move later with everyone’s consent'],
    ['Low-bid check', `> ${INDIA.bidAnomalyBps / 100}% below the median (3+ bids)`, 'Flag for a person, never automatic'],
    ['Wave Drop slab cap', `${INDIA.maxSlabBpsOfPrice / 100}% of the seller’s price`, 'Every extra sale stays profitable'],
    ['Saving guide', `max(${inr(INDIA.recommendedMinSavingFloor)}, ${INDIA.recommendedMinSavingBps / 100}% of outside best)`, 'Shown to the team, not enforced'],
    ['GST TCS', `${INDIA.tcsBps / 100}% of net taxable value`, 'CGST Act s.52, credited to the seller'],
    ['Income-tax TDS', `${INDIA.tdsBps / 100}% of gross`, 'E-commerce operator deduction, credited to the seller'],
    ['GST on POOL’s fee', `${INDIA.gstOnCommissionBps / 100}%`, 'Included in the margin'],
    ['Cash on delivery', 'Off', 'Pay at door by UPI or card in the app only'],
    ['POOL-funded discounts', 'Off', 'Buyer price can never be below the seller’s'],
  ];
  return (
    <>
      <PageHead title="Rules & settings" sub="The published rules the engine enforces. Changing them needs two approvers and is logged." />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Card className="divide-y divide-line">{rules.map(([k, v, h]) => <div key={k} className="flex items-start justify-between gap-4 px-5 py-3.5"><div><div className="text-[14px] font-semibold text-ink">{k}</div><div className="text-[12px] text-ink-3">{h}</div></div><div className="num shrink-0 text-right text-[13.5px] font-bold text-ink">{v}</div></div>)}</Card>
        <div className="space-y-4">
          <Card className="p-5">
            <div className="text-[15px] font-bold text-ink">Fulfilment profiles</div>
            <div className="mt-3 space-y-3">{s.profiles.map((p) => <div key={p.id} className="rounded-[12px] bg-surface-2 p-3 text-[12.5px]"><div className="font-semibold text-ink">{p.label}</div><div className="mt-1 text-ink-2">{p.steps.map((x) => x.label).join(' → ')} · {p.codeDigits}-digit code</div><div className="text-ink-3">Return window {p.returnWindowDays} d · late credit {inr(p.lateCreditPaise)} · return cost {inr(p.returnCostPaise)}{p.holds.map((h) => ` · ${h.label} ${h.bps / 100}%`).join('')}</div></div>)}</div>
            <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-warn"><AlertTriangle className="h-3.5 w-3.5" />Late credit and return costs are placeholders pending the founder’s decision.</p>
          </Card>
          <Card className="p-5">
            <div className="text-[15px] font-bold text-ink">Who can see sealed bids</div>
            <ul className="mt-2 space-y-1.5 text-[13px] text-ink-2">
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-save" />Awards & pricing team, only after close, every view logged</li>
              <li className="flex gap-2"><X className="mt-0.5 h-4 w-4 text-danger" />Other sellers, ever</li>
              <li className="flex gap-2"><X className="mt-0.5 h-4 w-4 text-danger" />Anyone before close, including founders</li>
            </ul>
            <KV k="Your role" v={s.opsUser.role} />
          </Card>
        </div>
      </div>
      <p className="mt-4 text-[12px] text-ink-3">Last reviewed {fmtDayTime(Date.now())}.</p>
    </>
  );
}
