import { ArrowDownToLine, BadgeCheck, Banknote, Bell, CalendarDays, Check, Download, FileText, HelpCircle, Landmark, Lock, LogOut, Phone, Receipt, ShieldCheck, Store, Truck, UserPlus, Waves } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { checkGstin } from '../lib/gstin';
import { inr } from '../lib/money';
import { DAY, fmtDay, fmtWhen } from '../lib/time';
import { sellerOf } from '../sim/engine';
import { sellerPayouts, type PayoutLine } from '../sim/selectors';
import { sellerSplit, useNow, useSim } from '../sim/store';
import { Avatar, Button, Card, Chip, EmptyState, ErrorState, Field, inputCls, KV, ListSkeleton, Row, Section, Segmented, Sheet, SimTag, useToast } from '../ui/core';
import { AppBar, BellButton, useLoadState } from '../buyer/parts';
import { NotificationList } from '../buyer/Account';

// ---------------------------------------------------------------- Payouts & holds
export function Payouts() {
  const s = useSim();
  const t = useNow(30000);
  const load = useLoadState('seller-payouts');
  const me = sellerOf(s, s.sellerMeId);
  const p = useMemo(() => sellerPayouts(s, me.id, t), [s, me.id, t]);
  const [f, setF] = useState<'all' | 'scheduled' | 'paid'>('all');
  const lines = p.lines.filter((l) => f === 'all' || l.status === f);
  const done = s.orders.filter((o) => o.sellerId === me.id && o.handedOverAt && o.status !== 'returned');
  const tcs = done.reduce((a, o) => a + sellerSplit(s, o).tcs, 0);
  const tds = done.reduce((a, o) => a + sellerSplit(s, o).tds, 0);
  const held = p.onHoldPA + p.onHoldHolds + p.onHoldWave;
  const total = Math.max(1, p.paid + p.scheduled + held);
  const toast = useToast();
  return (
    <div className="pb-6">
      <AppBar title="Payouts" sub={`${me.bank.name} ••${me.bank.last4} · settles T+2 working days`} right={<BellButton to="/seller/notifications" />} />
      {load.state === 'loading' ? <div className="p-4"><ListSkeleton rows={4} /></div> : load.state === 'error' ? <div className="p-4"><ErrorState onRetry={load.retry} /></div> : (
        <div className="space-y-5 px-4 pt-3">
          <div className="overflow-hidden rounded-[22px] bg-night p-4 text-white">
            <div className="flex items-center justify-between"><div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-white/55">Coming to your bank</div><SimTag className="border-white/25 bg-white/10 text-white">Simulated</SimTag></div>
            <div className="num mt-1 text-[34px] font-bold leading-none">{inr(p.scheduled, { exact: p.scheduled % 100 !== 0 })}</div>
            <div className="mt-1 text-[12.5px] text-white/60">in the next 2 working days · {inr(p.paid, { exact: p.paid % 100 !== 0 })} paid so far</div>
            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-white/10">
              <span className="bg-[#7ff0e6]" style={{ width: `${(p.paid / total) * 100}%` }} />
              <span className="bg-[#8aa4ff]" style={{ width: `${(p.scheduled / total) * 100}%` }} />
              <span className="bg-[#ffb547]" style={{ width: `${(p.onHoldPA / total) * 100}%` }} />
              <span className="bg-white/40" style={{ width: `${((p.onHoldHolds + p.onHoldWave) / total) * 100}%` }} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px] text-white/65">
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#7ff0e6]" />Paid</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#8aa4ff]" />Scheduled</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#ffb547]" />Waiting for buyer codes</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-white/40" />Installation & Wave holds</span>
            </div>
          </div>

          <Section title="Held, and why">
            <Card className="divide-y divide-line">
              <HoldRow icon={<Lock className="h-5 w-5" />} t="Waiting for buyer codes" sub="Paid by buyers, held by the payment company until each code is verified" v={p.onHoldPA} />
              <HoldRow icon={<Truck className="h-5 w-5" />} t="Installation holds (10%)" sub="Released when you add the job number, or 5 days after delivery with no issue" v={p.onHoldHolds} />
              <HoldRow icon={<Waves className="h-5 w-5" />} t="Wave Drop holds" sub="Largest slab per unit. The unused part comes back when the wave closes" v={p.onHoldWave} />
            </Card>
          </Section>

          <Section title="Tax credits" sub="Deducted by POOL as the e-commerce operator and deposited in your name.">
            <div className="grid grid-cols-2 gap-2">
              <Card className="p-3.5"><div className="text-[12px] text-ink-3">GST TCS (0.5%)</div><div className="num mt-0.5 text-[18px] font-bold text-ink">{inr(tcs, { exact: true })}</div><div className="mt-1 text-[11px] text-ink-3">Accept it on the GST portal to use as credit</div></Card>
              <Card className="p-3.5"><div className="text-[12px] text-ink-3">Income-tax TDS (0.1%)</div><div className="num mt-0.5 text-[18px] font-bold text-ink">{inr(tds, { exact: true })}</div><div className="mt-1 text-[11px] text-ink-3">Shows in Form 26AS; claim in your return</div></Card>
            </div>
          </Section>

          <Section title="Every payout line" action={<Button size="sm" variant="ghost" icon={<Download className="h-4 w-4" />} onClick={() => toast('Statement emailed as CSV (simulated)', 'info')}>Statement</Button>}>
            <Segmented value={f} onChange={setF} options={[{ value: 'all', label: 'All' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'paid', label: 'Paid' }]} />
            {lines.length === 0 ? <EmptyState icon={<Banknote className="h-6 w-6" />} title="No payouts yet" body="Money is released when buyers give their codes." /> : (
              <div className="divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-surface">
                {lines.slice(0, 40).map((l) => <PayLine key={l.id} l={l} t={t} />)}
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
const HoldRow = ({ icon, t, sub, v }: { icon: React.ReactNode; t: string; sub: string; v: number }) => <div className="flex items-center gap-3 px-4 py-3"><span className="text-ink-3">{icon}</span><div className="min-w-0 flex-1"><div className="text-[14px] font-semibold text-ink">{t}</div><div className="text-[12px] leading-snug text-ink-3">{sub}</div></div><div className="num text-[14.5px] font-bold text-ink">{inr(v)}</div></div>;

function PayLine({ l, t }: { l: PayoutLine; t: number }) {
  const tone = l.status === 'paid' ? 'save' : l.status === 'scheduled' ? 'brand' : l.status === 'reversed' ? 'danger' : 'neutral';
  return (
    <Link to={l.orderId ? `/seller/order/${l.orderId}` : '/seller/payouts'} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
      <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-[10px]', l.id.startsWith('wv') ? 'bg-wave-soft text-wave' : l.id.startsWith('hr') ? 'bg-brand-soft text-brand' : 'bg-save-soft text-save')}>{l.id.startsWith('wv') ? <Waves className="h-4.5 w-4.5" /> : l.id.startsWith('hr') ? <Truck className="h-4.5 w-4.5" /> : <ArrowDownToLine className="h-4.5 w-4.5" />}</span>
      <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold text-ink">{l.label}</div><div className="truncate text-[11.5px] text-ink-3">{l.note} · {fmtWhen(l.at, t)}</div></div>
      <div className="text-right"><div className={cn('num text-[14px] font-bold', l.status === 'reversed' ? 'text-danger line-through' : 'text-ink')}>{inr(l.amount, { exact: l.amount % 100 !== 0 })}</div><Chip tone={tone}>{l.status === 'scheduled' ? `on ${fmtDay(l.at + 2 * DAY)}` : l.status}</Chip></div>
    </Link>
  );
}

// ---------------------------------------------------------------- Business account (KYB, team, bank, coverage)
export function SellerAccount() {
  const s = useSim();
  const nav = useNavigate();
  const toast = useToast();
  const me = sellerOf(s, s.sellerMeId);
  const g = checkGstin(me.gstin);
  const [bank, setBank] = useState(false);
  const [invite, setInvite] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Dispatch' | 'Delivery' | 'Accounts'>('Delivery');
  const won = s.pools.filter((p) => p.award?.assignments.some((a) => a.sellerId === me.id)).length;
  return (
    <div className="pb-8">
      <AppBar title="Business" right={<BellButton to="/seller/notifications" />} />
      <div className="space-y-5 px-4 pt-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-wave-soft text-wave"><Store className="h-7 w-7" /></div>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5 text-[17px] font-bold text-ink">{me.name}<BadgeCheck className="h-4.5 w-4.5 text-brand" /></div><div className="text-[12.5px] text-ink-3">{me.owner} · {me.area}, {me.city}</div></div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-[12px] bg-surface-2 p-2"><div className="num text-[16px] font-bold text-ink">{me.settledOrders}</div><div className="text-[10.5px] text-ink-3">orders done</div></div>
            <div className="rounded-[12px] bg-surface-2 p-2"><div className="num text-[16px] font-bold text-ink">{won}</div><div className="text-[10.5px] text-ink-3">pools won</div></div>
            <div className="rounded-[12px] bg-surface-2 p-2"><div className="num text-[16px] font-bold text-ink">{inr(me.depositPaise)}</div><div className="text-[10.5px] text-ink-3">deposit</div></div>
          </div>
          <Link to={`/buyer/seller/${me.id}`} className="mt-3 block text-[12.5px] font-semibold text-wave">See your public scorecard →</Link>
        </Card>

        <Section title="Verification">
          <Card className="divide-y divide-line">
            <Check2 t="GSTIN" v={<span className="font-mono">{me.gstin}</span>} ok={g.ok} sub={g.ok ? `${g.message} · checksum verified` : g.message} />
            <Check2 t="PAN" v={<span className="font-mono">{me.pan}</span>} ok sub="Matches the GSTIN" />
            <Check2 t="Bank account" v={`${me.bank.name} ••${me.bank.last4}`} ok sub={`IFSC ${me.bank.ifsc} · name matched by penny-drop`} />
            <Check2 t="Authorised-dealer letters" v="On file" ok sub="Required for brand electronics" />
            <Check2 t="Shop photo with signboard" v="Verified" ok sub="Geo-tagged at the registered address" />
          </Card>
        </Section>

        <Section title="Team" action={<Button size="sm" variant="ghost" icon={<UserPlus className="h-4 w-4" />} onClick={() => setInvite(true)}>Add</Button>}>
          <Card className="divide-y divide-line">
            {me.team.map((m) => <div key={m.name} className="flex items-center gap-3 px-4 py-3"><Avatar name={m.name} size={36} tone="wave" /><div className="flex-1"><div className="text-[14px] font-semibold text-ink">{m.name}</div><div className="text-[12px] text-ink-3">{m.role === 'Owner' ? 'Everything, including bank and bids' : m.role === 'Dispatch' ? 'Orders and proof photos; no payouts' : 'Staff mode: today’s deliveries and codes only'}</div></div><Chip>{m.role}</Chip></div>)}
          </Card>
          <Row icon={<Truck className="h-5 w-5" />} title="Open delivery staff mode" sub="Big buttons, Telugu or English, no prices" to="/seller/staff" className="rounded-[18px] border border-line bg-surface" />
        </Section>

        <Section title="Where and what you sell">
          <Card className="space-y-3 p-4">
            <div><div className="text-[12px] text-ink-3">Categories</div><div className="mt-1 flex flex-wrap gap-1.5">{me.categories.map((c) => <Chip key={c} tone="wave">{c}</Chip>)}</div></div>
            <div><div className="text-[12px] text-ink-3">Pincodes you deliver to ({me.pincodes.length})</div><div className="mt-1 flex flex-wrap gap-1.5">{me.pincodes.map((p) => <span key={p} className="num rounded-full bg-surface-3 px-2 py-0.5 text-[12px] text-ink-2">{p}</span>)}</div></div>
            <KV k="Hours" v={me.hours} />
            <KV k="Return terms" v={<span className="text-right text-[12.5px]">{me.returnTerms}</span>} />
          </Card>
        </Section>

        <Section title="Money settings">
          <div className="divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-surface">
            <Row icon={<Landmark className="h-5 w-5" />} title="Payout bank account" sub={`${me.bank.name} ••${me.bank.last4}`} onClick={() => setBank(true)} />
            <Row icon={<ShieldCheck className="h-5 w-5" />} title="Security deposit" sub={`${inr(me.depositPaise)} · covers buyer credits if you can’t deliver`} />
            <Row icon={<Receipt className="h-5 w-5" />} title="GST invoices" sub="Issued from your GSTIN at each handover; e-invoice ready" />
          </div>
        </Section>

        <div className="divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-surface">
          <Row icon={<CalendarDays className="h-5 w-5" />} title="Forward demand" to="/seller/forward" />
          <Row icon={<Bell className="h-5 w-5" />} title="Notifications" to="/seller/notifications" />
          <Row icon={<HelpCircle className="h-5 w-5" />} title="Seller help & ranking rule" to="/buyer/help/ranking" />
          <Row icon={<FileText className="h-5 w-5" />} title="Seller agreement" to="/buyer/help/legal/terms" />
        </div>
        <Button variant="ghost" full icon={<LogOut className="h-4 w-4" />} onClick={() => nav('/')}>Sign out</Button>
      </div>

      <Sheet open={bank} onClose={() => setBank(false)} title="Change payout account" footer={<Button full variant="wave" icon={<Phone className="h-4 w-4" />} onClick={() => { setBank(false); toast('Call-back booked. Payouts continue to the current account until verified.', 'info'); }}>Request change</Button>}>
        <div className="space-y-3 text-[13.5px] text-ink-2">
          <p>Bank changes are the top fraud target, so we never change them in the app alone:</p>
          <ol className="list-decimal space-y-1 pl-5"><li>POOL calls the owner on the number registered with GST.</li><li>Penny-drop checks the new account name against your GSTIN.</li><li>A 48-hour cooling period; payouts keep going to the old account meanwhile.</li></ol>
          <SimTag>Simulated</SimTag>
        </div>
      </Sheet>
      <Sheet open={invite} onClose={() => setInvite(false)} title="Add a team member" footer={<Button full variant="wave" disabled={name.trim().length < 2} onClick={() => { setInvite(false); setName(''); toast(`Invite sent to ${name} on WhatsApp (simulated)`); }}>Send invite</Button>}>
        <div className="space-y-3">
          <Field label="Name" htmlFor="tm-name"><input id="tm-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Segmented value={role} onChange={setRole} options={[{ value: 'Delivery', label: 'Delivery' }, { value: 'Dispatch', label: 'Dispatch' }, { value: 'Accounts', label: 'Accounts' }]} />
          <p className="text-[12.5px] text-ink-3">{role === 'Delivery' ? 'Sees only today’s deliveries and can enter codes. No prices or payouts.' : role === 'Dispatch' ? 'Confirms orders and adds proof photos.' : 'Sees payouts and statements. Can’t bid or change the bank.'}</p>
        </div>
      </Sheet>
    </div>
  );
}
const Check2 = ({ t, v, ok, sub }: { t: string; v: React.ReactNode; ok: boolean; sub: string }) => <div className="flex items-start gap-3 px-4 py-3"><span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full', ok ? 'bg-save text-white' : 'bg-danger text-white')}>{ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : '!'}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-[13.5px]"><span className="font-semibold text-ink">{t}</span><span className="truncate text-ink-2">{v}</span></div><div className="text-[12px] text-ink-3">{sub}</div></div></div>;

export function SellerNotifications() {
  return (
    <div className="pb-8">
      <AppBar back="/seller" title="Notifications" />
      <div className="px-4 pt-3"><NotificationList to="seller" base="/seller" /></div>
    </div>
  );
}

