import { Bell, BookOpen, Bot, CalendarDays, Check, ChevronRight, CreditCard, Download, Fingerprint, Globe, Heart, HelpCircle, Home, KeyRound, Languages, Lock, LogOut, Mail, MapPin, MessageCircle, MessageSquare, Moon, Package, Phone, Plus, Scale, Search, Send, Shield, ShieldCheck, Smartphone, Sparkles, Store, Trash2, Users, Wallet, Waves } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cn } from '../lib/cn';
import { checkPincode } from '../lib/gstin';
import { LANGS, useT } from '../lib/i18n';
import { inr } from '../lib/money';
import { fmtAgo, fmtDate, fmtTime, fmtWhen, startOfDayIST } from '../lib/time';
import { productOf } from '../sim/engine';
import { myMoneySummary } from '../sim/selectors';
import { deleteAddress, markNotificationsRead, markRead, now, saveAddress, setCards, setPrefs, updateProfile, useNow, useSim } from '../sim/store';
import type { Address, Notification, SavedCard } from '../sim/types';
import { Avatar, Button, Card, Chip, EmptyState, Field, inputCls, KV, LinkButton, Radio, Row, Section, Segmented, Sheet, SimTag, Toggle, useToast } from '../ui/core';
import { Logo } from '../ui/Logo';
import { AppBar, BellButton } from './parts';

// ---------------------------------------------------------------- Account hub
export function Account() {
  const s = useSim();
  const t = useNow(60000);
  const tr = useT();
  const nav = useNavigate();
  const sum = myMoneySummary(s, t);
  const orders = s.orders.filter((o) => o.isMe).length;
  const pools = s.pools.filter((p) => p.members.some((m) => m.isMe && m.bookingPaidAt)).length;
  const lang = LANGS.find((l) => l.id === s.prefs.lang)!;
  return (
    <div className="pb-6">
      <AppBar title={tr('Account')} right={<BellButton to="/buyer/notifications" />} />
      <div className="space-y-5 px-4 pt-3">
        <Link to="/buyer/account/profile" className="flex items-center gap-3 rounded-[20px] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
          <Avatar name={s.me.name} size={56} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[17px] font-bold text-ink">{s.me.name}<ShieldCheck className="h-4 w-4 text-save" /></div>
            <div className="text-[13px] text-ink-3">{s.me.phone} · {tr('since')} {fmtDate(s.me.memberSince)}</div>
          </div>
          <ChevronRight className="h-4 w-4 text-ink-3" />
        </Link>
        <div className="grid grid-cols-3 gap-2">
          <Stat n={String(pools)} l={tr('pools joined')} />
          <Stat n={String(orders)} l={tr('orders')} />
          <Stat n={inr(sum.savedTotal)} l={tr('saved')} tone="save" />
        </div>

        <Group title={tr('Your things')}>
          <Row icon={<Package className="h-5 w-5" />} title={tr('Orders')} to="/buyer/orders" />
          <Row icon={<Wallet className="h-5 w-5" />} title={tr('Money & refunds')} to="/buyer/money" />
          <Row icon={<Shield className="h-5 w-5" />} title={tr('Warranty Locker')} sub={tr('Invoices, serials, warranty dates')} to="/buyer/locker" />
          <Row icon={<Heart className="h-5 w-5" />} title={tr('Watching')} sub={tr('{n} products', { n: s.watch.length })} to="/buyer/watching" />
          <Row icon={<Users className="h-5 w-5" />} title={tr('Lakeview Heights community')} sub={tr('Move-in pools for your new flat')} to="/buyer/community" />
        </Group>

        <Group title={tr('Settings')}>
          <Row icon={<MapPin className="h-5 w-5" />} title={tr('Addresses')} sub={tr('{n} saved', { n: s.me.addresses.length })} to="/buyer/account/addresses" />
          <Row icon={<CreditCard className="h-5 w-5" />} title={tr('Cards & UPI')} sub={tr('Also used to find your card offers outside')} to="/buyer/account/cards" />
          <Row icon={<Bell className="h-5 w-5" />} title={tr('Notifications')} sub={tr('App, WhatsApp, SMS, email')} to="/buyer/account/notifications" />
          <Row icon={<Languages className="h-5 w-5" />} title={tr('Language')} right={<span className="text-[13px] text-ink-3">{lang.native}</span>} to="/buyer/account/language" />
          <Row icon={<Moon className="h-5 w-5" />} title={tr('Appearance')} right={<ThemeSwitch />} />
          <Row icon={<Lock className="h-5 w-5" />} title={tr('Privacy & data')} sub={tr('What is shared, with whom, and when')} to="/buyer/account/privacy" />
          <Row icon={<Bot className="h-5 w-5" />} title={tr('Connected apps & AI assistants')} to="/buyer/account/connectors" />
        </Group>

        <Group title={tr('Help')}>
          <Row icon={<HelpCircle className="h-5 w-5" />} title={tr('Help centre')} to="/buyer/help" />
          <Row icon={<MessageSquare className="h-5 w-5" />} title={tr('Chat with POOL')} sub={tr('Usually replies in 2 minutes')} to="/buyer/help/chat" />
          <Row icon={<ShieldCheck className="h-5 w-5" />} title={tr('The POOL Promise')} to="/buyer/help/promise" />
          <Row icon={<BookOpen className="h-5 w-5" />} title={tr('How POOL works')} to="/buyer/help/how" />
          <Row icon={<Scale className="h-5 w-5" />} title={tr('Terms, privacy & grievances')} to="/buyer/help/legal/terms" />
        </Group>

        <Card tone="brand" className="flex items-center gap-3 p-4">
          <Store className="h-6 w-6 shrink-0 text-brand" />
          <div className="flex-1"><div className="text-[14.5px] font-bold text-ink">{tr('Run a shop or dealership?')}</div><div className="text-[12.5px] text-ink-2">{tr('Bid on real, pre-paid local demand. No listing fees.')}</div></div>
          <Button size="sm" onClick={() => nav('/seller')}>{tr('Sell')}</Button>
        </Card>

        <Button variant="ghost" full icon={<LogOut className="h-4 w-4" />} onClick={() => nav('/')}>{tr('Sign out')}</Button>
        <div className="flex flex-col items-center gap-1 pb-2 text-[11.5px] text-ink-3"><Logo size={18} /><span>v1.0 · {tr('Demo build with sample data')}</span></div>
      </div>
    </div>
  );
}

const Stat = ({ n, l, tone }: { n: string; l: string; tone?: 'save' }) => (
  <div className="rounded-[16px] border border-line bg-surface p-3 text-center"><div className={cn('num text-[18px] font-bold', tone === 'save' ? 'text-save' : 'text-ink')}>{n}</div><div className="text-[11.5px] text-ink-3">{l}</div></div>
);

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="px-1 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-3">{title}</div>
      <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">{children}</div>
    </section>
  );
}

function ThemeSwitch() {
  const s = useSim();
  return (
    <div className="flex gap-1 rounded-[10px] bg-surface-3 p-0.5">
      {(['system', 'light', 'dark'] as const).map((th) => (
        <button key={th} onClick={() => setPrefs({ theme: th })} className={cn('rounded-[8px] px-2 py-1 text-[11.5px] font-semibold capitalize', s.prefs.theme === th ? 'bg-surface text-ink shadow-sm' : 'text-ink-3')}>{th === 'system' ? 'Auto' : th}</button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Profile & sign-in
export function Profile() {
  const s = useSim();
  const tr = useT();
  const toast = useToast();
  const [name, setName] = useState(s.me.name);
  const [email, setEmail] = useState(s.me.email);
  const [passkey, setPasskey] = useState(false);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return (
    <div className="pb-10">
      <AppBar back="/buyer/account" title={tr('Profile')} />
      <div className="space-y-6 px-4 pt-3">
        <div className="flex flex-col items-center py-2"><Avatar name={name || '?'} size={76} /><div className="mt-2 text-[12.5px] text-ink-3">{tr('Your name goes on GST invoices')}</div></div>
        <div className="space-y-4">
          <Field label={tr('Full name')} htmlFor="pf-name"><input id="pf-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label={tr('Mobile')} hint={tr('Verified with OTP. Changing it needs a fresh OTP on both numbers.')} htmlFor="pf-phone"><input id="pf-phone" className={cn(inputCls, 'bg-surface-2 text-ink-2')} value={s.me.phone} readOnly /></Field>
          <Field label={tr('Email (for invoices and refund receipts)')} error={email && !emailOk ? tr('That doesn’t look like an email address.') : undefined} htmlFor="pf-email"><input id="pf-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Button full disabled={!name.trim() || !emailOk || (name === s.me.name && email === s.me.email)} onClick={() => { updateProfile({ name: name.trim(), email }); toast(tr('Profile saved')); }}>{tr('Save changes')}</Button>
        </div>

        <Section title={tr('Household')} sub={tr('Pools count demand once per household, so limits are fair and sellers trust the numbers.')}>
          <Card className="p-4">
            <KV k={tr('People in your home')} v={String(s.me.household.size)} />
            <KV k={tr('Household ID')} v={<span className="font-mono text-[12px]">{s.me.household.key.toUpperCase()}</span>} />
            <p className="mt-2 text-[12px] text-ink-3">{tr('Family members can join with their own phone. Their bookings count toward the same household limit.')}</p>
          </Card>
        </Section>

        <Section title={tr('Sign-in & security')}>
          <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
            <Row icon={<Fingerprint className="h-5 w-5" />} title={tr('Passkey')} sub={s.prefs.passkey ? tr('On · sign in with your fingerprint or face, no OTP') : tr('Sign in with fingerprint or face instead of OTP')} right={<Toggle label={tr('Passkey')} checked={!!s.prefs.passkey} onChange={(v) => (v ? setPasskey(true) : setPrefs({ passkey: false }))} />} />
            <Row icon={<Smartphone className="h-5 w-5" />} title={tr('This phone')} sub={tr('Pixel 9a · Hyderabad · active now')} right={<Chip tone="save">{tr('Current')}</Chip>} />
            <Row icon={<Globe className="h-5 w-5" />} title={tr('Chrome on Windows')} sub={tr('Last used 3 days ago')} right={<Button size="sm" variant="ghost" onClick={() => toast(tr('Signed out of that device'))}>{tr('Sign out')}</Button>} />
          </div>
        </Section>
      </div>
      <Sheet open={passkey} onClose={() => setPasskey(false)} title={tr('Create a passkey')} footer={<Button full icon={<Fingerprint className="h-4 w-4" />} onClick={() => { setPrefs({ passkey: true }); setPasskey(false); toast(tr('Passkey created')); }}>{tr('Use fingerprint')}</Button>}>
        <p className="text-[13.5px] text-ink-2">{tr('Your phone keeps a private key that never leaves the device. Nothing to remember, nothing to phish. You can still use OTP as a backup.')}</p>
        <SimTag className="mt-3">{tr('Biometric prompt simulated')}</SimTag>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------- Addresses
export function Addresses() {
  const s = useSim();
  const tr = useT();
  const toast = useToast();
  const [del, setDel] = useState<Address | null>(null);
  return (
    <div className="pb-10">
      <AppBar back="/buyer/account" title={tr('Addresses')} />
      <div className="space-y-3 px-4 pt-3">
        {s.me.addresses.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-surface-3 text-ink-2">{a.label.startsWith('Home') ? <Home className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[14.5px] font-bold text-ink">{a.label}{a.isDefault && <Chip tone="brand">{tr('Default')}</Chip>}</div>
                <div className="mt-0.5 text-[13px] text-ink-2">{a.name} · {a.phone}</div>
                <div className="text-[13px] text-ink-3">{a.line1}, {a.line2}{a.landmark ? ` · ${a.landmark}` : ''}, {a.city} {a.pincode}</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <LinkButton size="sm" variant="outline" to={`/buyer/account/addresses/${a.id}`}>{tr('Edit')}</LinkButton>
              {!a.isDefault && <Button size="sm" variant="ghost" onClick={() => { saveAddress({ ...a, isDefault: true }); toast(tr('Default address updated')); }}>{tr('Make default')}</Button>}
              <Button size="sm" variant="ghost" className="ml-auto text-danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDel(a)}>{tr('Delete')}</Button>
            </div>
          </Card>
        ))}
        <LinkButton full variant="outline" to="/buyer/account/addresses/new" icon={<Plus className="h-4 w-4" />}>{tr('Add a new address')}</LinkButton>
      </div>
      <Sheet open={!!del} onClose={() => setDel(null)} title={tr('Delete this address?')} footer={<div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setDel(null)}>{tr('Keep')}</Button><Button variant="danger" onClick={() => { const r = deleteAddress(del!.id); setDel(null); r.ok ? toast(tr('Address deleted')) : toast(r.error, 'err'); }}>{tr('Delete')}</Button></div>}>
        <p className="text-[13.5px] text-ink-2">{tr('Orders already on their way keep the address they were placed with.')}</p>
      </Sheet>
    </div>
  );
}

const PIN_LOOKUP: Record<string, string> = { '500032': 'Gachibowli', '500084': 'Kondapur', '500081': 'Madhapur', '500089': 'Manikonda', '500019': 'Lingampally', '500075': 'Kokapet', '500033': 'Jubilee Hills', '500072': 'Kukatpally', '500049': 'Miyapur', '500050': 'Chandanagar', '500085': 'KPHB', '500100': 'Kompally', '500008': 'Tolichowki', '500034': 'Banjara Hills', '500016': 'Begumpet' };

export function AddressEdit() {
  const { id } = useParams();
  const s = useSim();
  const tr = useT();
  const nav = useNavigate();
  const toast = useToast();
  const existing = s.me.addresses.find((a) => a.id === id);
  const [a, setA] = useState<Address>(existing ?? { id: `addr-${Date.now().toString(36)}`, label: 'Home', name: s.me.name, line1: '', line2: '', landmark: '', city: 'Hyderabad', state: 'Telangana', stateCode: '36', pincode: '', phone: s.me.phone });
  const [touched, setTouched] = useState(false);
  const [locating, setLocating] = useState(false);
  const pinOk = checkPincode(a.pincode);
  const served = !!PIN_LOOKUP[a.pincode];
  const valid = a.name.trim() && a.line1.trim() && a.line2.trim() && pinOk && a.phone.trim();
  const set = (k: keyof Address, v: string) => setA({ ...a, [k]: v });
  const useLocation = () => {
    setLocating(true);
    setTimeout(() => { setA({ ...a, line2: 'Road No. 2, Gachibowli', pincode: '500032', landmark: a.landmark || 'Opp. DLF back gate' }); setLocating(false); }, 900);
  };
  return (
    <div className="pb-28">
      <AppBar back="/buyer/account/addresses" title={existing ? tr('Edit address') : tr('New address')} />
      <div className="space-y-4 px-4 pt-3">
        <Button variant="outline" full loading={locating} icon={<MapPin className="h-4 w-4" />} onClick={useLocation}>{tr('Use my current location')}</Button>
        <div className="flex gap-2">{['Home', 'Work', 'Parents', 'New flat'].map((l) => <button key={l} onClick={() => set('label', l)} className={cn('rounded-full border px-3 py-1.5 text-[13px] font-semibold', a.label === l ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line text-ink-2')}>{tr(l)}</button>)}</div>
        <Field label={tr('Pincode')} htmlFor="ad-pin" error={touched && !pinOk ? tr('Enter a 6-digit pincode.') : undefined} hint={pinOk ? (served ? `${PIN_LOOKUP[a.pincode]}, Hyderabad · ${tr('pools available')}` : tr('We’re not in this pincode yet. Save it and we’ll tell you when pools open.')) : undefined}>
          <input id="ad-pin" inputMode="numeric" maxLength={6} className={inputCls} value={a.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Field label={tr('Flat, house no., building')} htmlFor="ad-l1" error={touched && !a.line1.trim() ? tr('Required') : undefined}><input id="ad-l1" className={inputCls} value={a.line1} onChange={(e) => set('line1', e.target.value)} /></Field>
        <Field label={tr('Road, area')} htmlFor="ad-l2" error={touched && !a.line2.trim() ? tr('Required') : undefined}><input id="ad-l2" className={inputCls} value={a.line2} onChange={(e) => set('line2', e.target.value)} /></Field>
        <Field label={tr('Landmark (helps the delivery person)')} htmlFor="ad-lm"><input id="ad-lm" className={inputCls} value={a.landmark ?? ''} onChange={(e) => set('landmark', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr('City')} htmlFor="ad-city"><input id="ad-city" className={inputCls} value={a.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label={tr('State')} htmlFor="ad-st"><input id="ad-st" className={cn(inputCls, 'bg-surface-2')} value={a.state} readOnly /></Field>
        </div>
        <Field label={tr('Receiver’s name')} htmlFor="ad-name"><input id="ad-name" className={inputCls} value={a.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label={tr('Receiver’s phone')} htmlFor="ad-ph"><input id="ad-ph" className={inputCls} value={a.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <label className="flex items-center gap-3 text-[14px] text-ink"><input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" checked={!!a.isDefault} onChange={(e) => setA({ ...a, isDefault: e.target.checked })} />{tr('Make this my default address')}</label>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 liquid-glass rounded-t-[28px] px-4 pb-3 pt-3.5" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <Button full size="lg" onClick={() => { setTouched(true); if (!valid) return; saveAddress(a); toast(tr('Address saved')); nav(-1); }}>{tr('Save address')}</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Cards & UPI
const BANKS = ['HDFC Bank', 'SBI Card', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'IDFC FIRST Bank'];
export function Cards() {
  const s = useSim();
  const tr = useT();
  const toast = useToast();
  const [add, setAdd] = useState(false);
  const [bank, setBank] = useState(BANKS[2]);
  const [type, setType] = useState<SavedCard['type']>('credit');
  const [circle, setCircle] = useState(false);
  return (
    <div className="pb-10">
      <AppBar back="/buyer/account" title={tr('Cards & UPI')} />
      <div className="space-y-6 px-4 pt-3">
        <Section title={tr('UPI')}>
          <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
            {s.me.upi.map((u) => <Row key={u} icon={<Smartphone className="h-5 w-5" />} title={u} sub={tr('Primary · used for bookings and refunds')} right={<Chip tone="save">{tr('Verified')}</Chip>} />)}
            <Row icon={<Users className="h-5 w-5" />} title={tr('Family pays with UPI Circle')} sub={tr('Let a parent approve and pay for a pool you join, from their own UPI')} onClick={() => setCircle(true)} />
          </div>
        </Section>
        <Section title={tr('Cards')} sub={tr('Saved as tokens by the payment company, as RBI requires. POOL never sees or stores your card number.')}>
          <div className="space-y-2">
            {s.me.cards.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-[22px] border border-line bg-surface p-3.5">
                <div className={cn('grid h-11 w-16 place-items-center rounded-[10px] text-[10px] font-bold text-white', c.bank.startsWith('HDFC') ? 'bg-[#0f3b8c]' : c.bank.startsWith('SBI') ? 'bg-[#1f6fb8]' : 'bg-[#5b2a86]')}>{c.network}</div>
                <div className="min-w-0 flex-1"><div className="text-[14.5px] font-semibold text-ink">{c.bank} {c.type}</div><div className="text-[12.5px] text-ink-3">{c.last4 ? `•••• ${c.last4}` : tr('For offers only')}</div></div>
                <Button size="sm" variant="ghost" onClick={() => { setCards(s.me.cards.filter((x) => x.id !== c.id)); toast(tr('Card removed')); }}>{tr('Remove')}</Button>
              </div>
            ))}
            <Button variant="outline" full icon={<Plus className="h-4 w-4" />} onClick={() => setAdd(true)}>{tr('Add a card')}</Button>
          </div>
        </Section>
        <Card tone="brand" className="flex gap-3 p-4">
          <Sparkles className="h-5 w-5 shrink-0 text-brand" />
          <p className="text-[13px] text-ink-2">{tr('Why we ask: Amazon and Flipkart often have bank-card offers. We compare your POOL price with what you would really pay there with your own cards, and tell you when outside is cheaper.')}</p>
        </Card>
      </div>
      <Sheet open={add} onClose={() => setAdd(false)} title={tr('Add a card')} footer={<Button full onClick={() => { setCards([...s.me.cards, { id: `card-${Date.now().toString(36)}`, bank, type, network: type === 'credit' ? 'Visa' : 'RuPay' }]); setAdd(false); toast(tr('Card added for offers')); }}>{tr('Add')}</Button>}>
        <div className="space-y-3">
          <p className="text-[13px] text-ink-2">{tr('Just the bank and type, so we can find your offers. You enter the card number only at payment, inside the payment company’s secure page.')}</p>
          <div className="grid grid-cols-2 gap-2">{BANKS.map((b) => <button key={b} onClick={() => setBank(b)} className={cn('rounded-[12px] border px-3 py-2.5 text-left text-[13px] font-semibold', bank === b ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line text-ink-2')}>{b}</button>)}</div>
          <Segmented value={type} onChange={setType} options={[{ value: 'credit', label: tr('Credit') }, { value: 'debit', label: tr('Debit') }]} />
        </div>
      </Sheet>
      <Sheet open={circle} onClose={() => setCircle(false)} title={tr('UPI Circle')} footer={<Button full onClick={() => { setCircle(false); toast(tr('Invite sent to Padma Reddy (simulated)')); }}>{tr('Invite a family member')}</Button>}>
        <div className="space-y-3 text-[13.5px] text-ink-2">
          <p>{tr('UPI Circle is an NPCI feature: a trusted person can pay from another person’s UPI account, either within a limit or with approval for each payment.')}</p>
          <p>{tr('On POOL: when you join or accept, the request goes to your family member’s UPI app. They approve; the refund rules stay the same and refunds go back to their account.')}</p>
          <SimTag>{tr('Simulated')}</SimTag>
        </div>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------- Notification settings
const NOTIF_KINDS: Array<{ key: string; label: string; sub: string; critical?: boolean }> = [
  { key: 'offers', label: 'Offers to decide', sub: 'Your personal price, decide-by reminders', critical: true },
  { key: 'delivery', label: 'Delivery & codes', sub: 'Dispatch, arriving today, pickup ready', critical: true },
  { key: 'refunds', label: 'Payments & refunds', sub: 'Every rupee in and out', critical: true },
  { key: 'pools', label: 'Pools you follow', sub: 'New pools nearby, closing soon' },
  { key: 'wave', label: 'Wave Drop', sub: 'When the pot is paid' },
];
export function NotifSettings() {
  const s = useSim();
  const tr = useT();
  const toggle = (k: string, ch: 'app' | 'whatsapp' | 'sms' | 'email') => {
    const cur = s.prefs.notify[k] ?? [];
    const next = cur.includes(ch) ? cur.filter((x) => x !== ch) : [...cur, ch];
    setPrefs({ notify: { ...s.prefs.notify, [k]: next } });
  };
  return (
    <div className="pb-10">
      <AppBar back="/buyer/account" title={tr('Notifications')} />
      <div className="space-y-5 px-4 pt-3">
        <Card tone="save" className="p-4 text-[13px] text-ink-2">{tr('Offers, delivery codes and refunds always reach you in the app; you choose any extra channels. We never send promotions without your separate consent.')}</Card>
        {NOTIF_KINDS.map((k) => (
          <Card key={k.key} className="p-4">
            <div className="flex items-center justify-between"><div><div className="text-[14.5px] font-semibold text-ink">{tr(k.label)}</div><div className="text-[12.5px] text-ink-3">{tr(k.sub)}</div></div>{k.critical && <Chip tone="brand">{tr('Always in app')}</Chip>}</div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(['app', 'whatsapp', 'sms', 'email'] as const).map((ch) => {
                const on = (s.prefs.notify[k.key] ?? []).includes(ch) || (k.critical && ch === 'app');
                const Icon = { app: Bell, whatsapp: MessageCircle, sms: MessageSquare, email: Mail }[ch];
                return (
                  <button key={ch} disabled={k.critical && ch === 'app'} onClick={() => toggle(k.key, ch)} className={cn('flex flex-col items-center gap-1 rounded-[12px] border py-2 text-[11.5px] font-semibold capitalize transition', on ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line text-ink-3')}>
                    <Icon className="h-4 w-4" />{ch === 'whatsapp' ? 'WhatsApp' : ch === 'sms' ? 'SMS' : ch}
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
        <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
          <Row icon={<Moon className="h-5 w-5" />} title={tr('Quiet hours, 10 PM – 7 AM')} sub={tr('Held until morning, except a code on delivery day')} right={<Toggle label={tr('Quiet hours')} checked={!!s.prefs.quietHours} onChange={(v) => setPrefs({ quietHours: v })} />} />
          <Row icon={<Sparkles className="h-5 w-5" />} title={tr('Deals and news')} sub={tr('Off unless you turn it on')} right={<Toggle label={tr('Marketing')} checked={!!s.prefs.marketing} onChange={(v) => setPrefs({ marketing: v })} />} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Language
export function LanguagePage() {
  const s = useSim();
  const tr = useT();
  const toast = useToast();
  return (
    <div className="pb-10">
      <AppBar back="/buyer/account" title={tr('Language')} />
      <div className="space-y-5 px-4 pt-3">
        <Section title={tr('App language')}>
          <div className="space-y-2">{LANGS.map((l) => <Radio key={l.id} id={`lang-${l.id}`} checked={s.prefs.lang === l.id} onSelect={() => { setPrefs({ lang: l.id }); toast(l.id === 'te' ? 'భాష మార్చబడింది' : l.id === 'hi' ? 'भाषा बदल दी गई' : 'Language changed'); }} title={l.native} sub={l.label} />)}</div>
        </Section>
        <Section title={tr('Voice and WhatsApp')} sub={tr('Speak or send voice notes in any of these. We reply in the same language.')}>
          <Segmented value={s.prefs.voiceLang ?? s.prefs.lang} onChange={(v) => setPrefs({ voiceLang: v })} options={LANGS.map((l) => ({ value: l.id, label: l.native }))} />
        </Section>
        <p className="px-1 text-[12px] text-ink-3">{tr('Prices, dates and GST invoices follow Indian formats in every language. Legal documents are binding in English; translations are for convenience.')}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Privacy (DPDP Act, 2023)
export function Privacy() {
  const s = useSim();
  const tr = useT();
  const toast = useToast();
  const [del, setDel] = useState(false);
  const held = s.pools.some((p) => p.members.some((m) => m.isMe && ['committed', 'offered'].includes(m.status))) || s.orders.some((o) => o.isMe && ['awaiting_payment', 'confirmed', 'handed_over'].includes(o.status));
  const sharing = [
    { who: tr('Winning seller only'), what: tr('Name, phone, delivery address'), when: tr('After you accept their offer, for that order only') },
    { who: tr('Payment company'), what: tr('Amount, UPI ID or card token'), when: tr('When you pay or get a refund') },
    { who: tr('Other sellers'), what: tr('Pincode and quantity, never your name'), when: tr('While a pool is open') },
    { who: tr('Other buyers'), what: tr('Nothing. Only a count of households'), when: '—' },
  ];
  return (
    <div className="pb-10">
      <AppBar back="/buyer/account" title={tr('Privacy & data')} />
      <div className="space-y-6 px-4 pt-3">
        <Card tone="brand" className="flex gap-3 p-4"><Lock className="h-5 w-5 shrink-0 text-brand" /><p className="text-[13px] text-ink-2">{tr('Under the Digital Personal Data Protection Act, 2023, you can see, correct or erase your data, and withdraw consent at any time. You can also download a copy.')}</p></Card>
        <Section title={tr('Who sees what')}>
          <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
            {sharing.map((x) => <div key={x.who} className="px-4 py-3"><div className="text-[14px] font-semibold text-ink">{x.who}</div><div className="text-[12.5px] text-ink-2">{x.what}</div><div className="text-[12px] text-ink-3">{x.when}</div></div>)}
          </div>
        </Section>
        <Section title={tr('Your choices')}>
          <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
            <Row title={tr('Product analytics')} sub={tr('Anonymous usage to fix bugs')} right={<Toggle label={tr('Analytics')} checked={s.prefs.analytics !== false} onChange={(v) => setPrefs({ analytics: v })} />} />
            <Row title={tr('Promotions')} sub={tr('Off by default')} right={<Toggle label={tr('Promotions')} checked={!!s.prefs.marketing} onChange={(v) => setPrefs({ marketing: v })} />} />
          </div>
        </Section>
        <Section title={tr('Your data')}>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={() => toast(tr('Your data file will be emailed within 24 hours (simulated)'), 'info')}>{tr('Download')}</Button>
            <Button variant="outline" className="text-danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDel(true)}>{tr('Delete account')}</Button>
          </div>
          <p className="px-1 text-[12px] text-ink-3">{tr('Invoices and payment records are kept only as long as tax law requires, then deleted.')}</p>
        </Section>
        <Section title={tr('Grievance Officer')}>
          <Card className="p-4 text-[13px] text-ink-2"><div className="font-semibold text-ink">Meera Krishnan</div><div>grievance@pool.example · {tr('acknowledged within 48 hours, resolved within one month')}</div><SimTag className="mt-2">{tr('Sample contact')}</SimTag></Card>
        </Section>
      </div>
      <Sheet open={del} onClose={() => setDel(false)} title={tr('Delete your account?')} footer={held ? <Button full variant="outline" onClick={() => setDel(false)}>{tr('OK')}</Button> : <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setDel(false)}>{tr('Cancel')}</Button><Button variant="danger" onClick={() => { setDel(false); toast(tr('Deletion scheduled in 7 days (simulated)'), 'info'); }}>{tr('Delete')}</Button></div>}>
        <p className="text-[13.5px] text-ink-2">{held ? tr('You still have bookings or orders in progress. Finish or cancel them first, so every refund can reach you.') : tr('We erase your profile, addresses and history within 7 days. You can cancel by signing in before then.')}</p>
      </Sheet>
    </div>
  );
}

// ---------------------------------------------------------------- Notifications inbox
const NKIND_TONE: Record<Notification['kind'], string> = { offer: 'bg-warn-soft text-warn', pool: 'bg-brand-soft text-brand', payment: 'bg-brand-soft text-brand', refund: 'bg-save-soft text-save', delivery: 'bg-wave-soft text-wave', code: 'bg-wave-soft text-wave', wave: 'bg-wave-soft text-wave', issue: 'bg-danger-soft text-danger', bid: 'bg-brand-soft text-brand', award: 'bg-brand-soft text-brand', payout: 'bg-save-soft text-save', risk: 'bg-danger-soft text-danger', review: 'bg-surface-3 text-ink-2', system: 'bg-surface-3 text-ink-2' };
const NKIND_ICON: Record<Notification['kind'], typeof Bell> = { offer: Sparkles, pool: Users, payment: Wallet, refund: Wallet, delivery: Package, code: KeyRound, wave: Waves, issue: Shield, bid: Store, award: Store, payout: Wallet, risk: Shield, review: Check, system: Bell };

export function NotificationList({ to, base }: { to: Notification['to']; base: string }) {
  const s = useSim();
  const t = useNow(30000);
  const tr = useT();
  const nav = useNavigate();
  const [f, setF] = useState<'all' | 'action' | 'money'>('all');
  const all = s.notifications.filter((n) => n.to === to);
  const list = all.filter((n) => (f === 'all' ? true : f === 'action' ? ['offer', 'code', 'issue', 'award', 'bid'].includes(n.kind) : ['payment', 'refund', 'wave', 'payout'].includes(n.kind)));
  const today = startOfDayIST(t);
  const groups: Array<[string, Notification[]]> = [[tr('Today'), list.filter((n) => n.at >= today)], [tr('Earlier'), list.filter((n) => n.at < today)]];
  const unread = all.filter((n) => !n.read).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Segmented className="flex-1" value={f} onChange={setF} options={[{ value: 'all', label: tr('All') }, { value: 'action', label: tr('To do') }, { value: 'money', label: tr('Money') }]} />
        {unread > 0 && <Button size="sm" variant="ghost" onClick={() => markNotificationsRead(to)}>{tr('Mark all read')}</Button>}
      </div>
      {list.length === 0 ? <EmptyState icon={<Bell className="h-6 w-6" />} title={tr('You’re all caught up')} body={tr('Offers, codes and refunds will show up here.')} /> : groups.filter(([, xs]) => xs.length).map(([label, xs]) => (
        <div key={label} className="space-y-2">
          <div className="px-1 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-3">{label}</div>
          <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
            {xs.map((n) => {
              const Icon = NKIND_ICON[n.kind];
              return (
                <button key={n.id} onClick={() => { markRead(n.id); if (n.href) nav(n.href.startsWith('/') ? n.href : `${base}/${n.href}`); }} className={cn('flex w-full gap-3 px-4 py-3 text-left transition hover:bg-surface-2', !n.read && 'bg-brand-soft/30')}>
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-[12px]', NKIND_TONE[n.kind])}><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2"><span className={cn('text-[14px] leading-snug text-ink', !n.read ? 'font-bold' : 'font-semibold')}>{n.title}</span><span className="shrink-0 text-[11px] text-ink-3">{fmtAgo(n.at, t)}</span></span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-2">{n.body}</span>
                    <span className="mt-1 flex gap-1">{n.channels.filter((c) => c !== 'app').map((c) => <span key={c} className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-3">{c === 'whatsapp' ? 'WhatsApp' : c}</span>)}</span>
                  </span>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-center text-[11.5px] text-ink-3"><SimTag>{tr('Messages simulated: nothing is sent')}</SimTag></p>
    </div>
  );
}

export function Notifications() {
  const tr = useT();
  return (
    <div className="pb-8">
      <AppBar back="/buyer" title={tr('Notifications')} right={<Link to="/buyer/account/notifications" className="px-3 text-[13px] font-semibold text-brand">{tr('Settings')}</Link>} />
      <div className="px-4 pt-3"><NotificationList to="buyer" base="/buyer" /></div>
    </div>
  );
}

// ---------------------------------------------------------------- Help centre
const HELP: Array<{ cat: string; q: string; a: string }> = [
  { cat: 'Pools', q: 'How does a pool work?', a: 'Neighbours who want the same product join with a small refundable booking. Verified sellers bid privately. When the pool closes at the time its starter chose, POOL sets a personal price for each buyer. Accept or walk away.' },
  { cat: 'Pools', q: 'Who decides when a pool closes?', a: 'The person who starts it. It can only move later, and only if every buyer agrees. Never earlier.' },
  { cat: 'Pools', q: 'Why do I pay a booking?', a: 'Only paid bookings count as demand, so sellers bid on real buyers. It is refunded in full if you leave before close, walk away, there is no deal, or no seller can serve you.' },
  { cat: 'Offers', q: 'What if Amazon or Flipkart is cheaper?', a: 'We show it, including offers on your own cards, and say so plainly. Walking away is free.' },
  { cat: 'Offers', q: 'What happens if I don’t reply to my offer?', a: 'After 24 hours it counts as walking away and your booking is refunded. You are never charged without saying yes.' },
  { cat: 'Payments', q: 'Who holds my money?', a: 'A licensed payment company. The seller is paid only after you give your handover code. POOL never keeps a wallet balance for you.' },
  { cat: 'Payments', q: 'Can I pay cash on delivery?', a: 'No. You can pay at the door by UPI or card in the app after checking the box. Cash can’t be held safely or refunded to you.' },
  { cat: 'Payments', q: 'How long do refunds take?', a: 'UPI: usually within 30 minutes. Cards: 3–5 working days. Every refund shows its bank reference.' },
  { cat: 'Delivery', q: 'What is the handover code?', a: 'A one-time code in your app. Give it only after checking the box. It releases the money to the seller. POOL will never ask you for it.' },
  { cat: 'Delivery', q: 'What if delivery is late?', a: 'You get a ₹200 credit paid by the seller. If they can’t deliver, POOL moves your order to the backup seller at the same price.' },
  { cat: 'Returns', q: 'How do returns work?', a: 'Report a problem within the replacement window shown on your order. The seller has 24 hours to respond; then POOL decides. If you are owed money, POOL refunds first and recovers it from the seller.' },
  { cat: 'Wave Drop', q: 'What is the Wave Drop?', a: 'Each completed purchase adds a small amount, set by the seller, to a shared pot. When every order in the pool is final, the pot is split equally among buyers who completed. Real numbers only.' },
];
export function Help() {
  const tr = useT();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const shown = HELP.map((h, i) => ({ ...h, i })).filter((h) => !q || (h.q + h.a).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="pb-10">
      <AppBar back="/buyer/account" title={tr('Help centre')} />
      <div className="space-y-5 px-4 pt-3">
        <div className="relative"><Search className="absolute left-3.5 top-3.5 h-5 w-5 text-ink-3" /><input className={cn(inputCls, 'pl-11')} placeholder={tr('Search: refund, code, late…')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="grid grid-cols-3 gap-2">
          <Link to="/buyer/help/chat" className="flex flex-col items-center gap-1.5 rounded-[16px] border border-line bg-surface p-3 text-center text-[12.5px] font-semibold text-ink"><MessageSquare className="h-5 w-5 text-brand" />{tr('Chat')}</Link>
          <Link to="/buyer/whatsapp" className="flex flex-col items-center gap-1.5 rounded-[16px] border border-line bg-surface p-3 text-center text-[12.5px] font-semibold text-ink"><MessageCircle className="h-5 w-5 text-[#25a244]" />WhatsApp</Link>
          <button onClick={() => toast(tr('Call-back requested. POOL support will call you within 10 minutes (simulated).'), 'info')} className="flex flex-col items-center gap-1.5 rounded-[16px] border border-line bg-surface p-3 text-center text-[12.5px] font-semibold text-ink"><Phone className="h-5 w-5 text-wave" />{tr('Call back')}</button>
        </div>
        <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
          {shown.length === 0 && <div className="p-5 text-center text-[13.5px] text-ink-3">{tr('No answers match. Ask us in chat.')}</div>}
          {shown.map((h) => (
            <div key={h.i}>
              <button onClick={() => setOpen(open === h.i ? null : h.i)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left">
                <Chip className="mt-0.5">{tr(h.cat)}</Chip>
                <span className="flex-1 text-[14px] font-semibold text-ink">{tr(h.q)}</span>
              </button>
              {open === h.i && <p className="px-4 pb-4 text-[13.5px] leading-relaxed text-ink-2">{tr(h.a)}</p>}
            </div>
          ))}
        </div>
        <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
          <Row icon={<ShieldCheck className="h-5 w-5" />} title={tr('The POOL Promise')} to="/buyer/help/promise" />
          <Row icon={<BookOpen className="h-5 w-5" />} title={tr('How POOL works')} to="/buyer/help/how" />
          <Row icon={<Scale className="h-5 w-5" />} title={tr('How sellers are chosen')} to="/buyer/help/ranking" />
          <Row icon={<FileIcon />} title={tr('Refund & cancellation policy')} to="/buyer/help/legal/refunds" />
        </div>
      </div>
    </div>
  );
}
const FileIcon = () => <BookOpen className="h-5 w-5" />;

// ---------------------------------------------------------------- Promise
export const PROMISE: Array<{ title: string; body: string }> = [
  { title: 'Your booking is refundable', body: 'Leave before close, walk away from the offer, no deal, or no seller for you: every rupee comes back to where it came from.' },
  { title: 'We tell you when outside is cheaper', body: 'Including offers on your own cards. If Amazon or Flipkart beats us for you, we say so.' },
  { title: 'Never charged without a yes', body: 'No reply to an offer means walk away, with a full refund. No auto-buy, no silent renewals.' },
  { title: 'Money held until your code', body: 'A licensed payment company holds it. The seller is paid only after you check the box and give your code.' },
  { title: 'Late? You get ₹200', body: 'Paid by the seller. If they can’t deliver, the backup seller delivers at the same price.' },
  { title: 'Problems are decided in 48 hours', body: 'Seller replies in 24 hours, POOL decides within 48. If you’re owed money, we refund first and chase the seller later.' },
  { title: 'Fair, published rules', body: 'Sellers win on price, delivery and rating. POOL’s fee never decides who wins.' },
  { title: 'Your details stay private', body: 'Only the seller you accept sees your name and number, and only for that order.' },
];
export function Promise() {
  const tr = useT();
  return (
    <div className="pb-10">
      <AppBar back="/buyer/help" title={tr('The POOL Promise')} />
      <div className="space-y-3 px-4 pt-3">
        <div className="rounded-[28px] bg-night p-5 text-white"><ShieldCheck className="h-8 w-8 text-aqua" /><div className="mt-3 text-[22px] font-bold leading-tight">{tr('Eight things we always do.')}</div><div className="mt-1 text-[13px] text-white/60">{tr('Written into our terms, not just our ads.')}</div></div>
        {PROMISE.map((p, i) => (
          <Card key={i} className="flex gap-3 p-4"><span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-save-soft text-[13px] font-bold text-save">{i + 1}</span><div><div className="text-[14.5px] font-bold text-ink">{tr(p.title)}</div><div className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{tr(p.body)}</div></div></Card>
        ))}
        <LinkButton to="/buyer/help/legal/terms" variant="outline" full>{tr('Read the terms')}</LinkButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- How it works
export function HowItWorks() {
  const tr = useT();
  const steps = [
    { icon: Search, t: 'Find it', b: 'Paste a link from any store, scan a barcode or search. We confirm the exact model and show the best price outside, with your cards.' },
    { icon: Users, t: 'Pool it', b: 'Join a pool near you, or start one and choose when it closes. Pay a small refundable booking.' },
    { icon: Lock, t: 'Sellers bid privately', b: 'Verified local sellers bid sealed prices, capacity and delivery dates. Nobody sees anyone else’s bid.' },
    { icon: Sparkles, t: 'Your personal offer', b: 'After close, you get a guaranteed price. Accept, or walk away with your booking back.' },
    { icon: KeyRound, t: 'Check, then code', b: 'Pay now, by EMI or at the door. Check the box, then give your one-time code. Only then is the seller paid.' },
    { icon: Waves, t: 'Wave Drop', b: 'Completed purchases fill a shared pot set by the seller. When the wave closes, it is split equally among buyers.' },
  ];
  return (
    <div className="pb-10">
      <AppBar back="/buyer/help" title={tr('How POOL works')} />
      <div className="space-y-3 px-4 pt-3">
        {steps.map((st, i) => (
          <div key={i} className="flex gap-3 rounded-[22px] border border-line bg-surface p-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-brand-soft text-brand"><st.icon className="h-5 w-5" /></div>
            <div><div className="text-[12px] font-semibold text-ink-3">{tr('Step')} {i + 1}</div><div className="text-[15px] font-bold text-ink">{tr(st.t)}</div><div className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{tr(st.b)}</div></div>
          </div>
        ))}
        <Card tone="wave" className="p-4 text-[13px] text-ink-2"><b className="text-ink">{tr('How POOL earns:')}</b> {tr('the difference between your price and the seller’s bid, set openly per pool by the POOL team. No listing fees, no ads, no data sales.')}</Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Ranking rule
export function RankingRule() {
  const tr = useT();
  return (
    <div className="pb-10">
      <AppBar back="/buyer/help" title={tr('How sellers are chosen')} />
      <div className="space-y-4 px-4 pt-3 text-[13.5px] leading-relaxed text-ink-2">
        <Card className="p-4"><div className="text-[15px] font-bold text-ink">{tr('1. Only eligible bids count')}</div><p className="mt-1">{tr('Verified seller, delivers by the pool’s date, offers the required delivery mode and terms, and not held back after a check. A cheap bid that misses any of these cannot win.')}</p></Card>
        <Card className="p-4"><div className="text-[15px] font-bold text-ink">{tr('2. Then ranked, in this order')}</div><ol className="mt-1 list-decimal space-y-0.5 pl-5"><li>{tr('Lowest seller price')}</li><li>{tr('Earliest delivery date')}</li><li>{tr('Better rating from completed orders')}</li><li>{tr('Earliest bid')}</li></ol></Card>
        <Card className="p-4"><div className="text-[15px] font-bold text-ink">{tr('3. Households in join order')}</div><p className="mt-1">{tr('Earliest joiners get the best-ranked seller with capacity, the option they chose, and delivery before their need-by date. Each gets a backup seller.')}</p></Card>
        <Card className="p-4"><div className="text-[15px] font-bold text-ink">{tr('4. Checks, never silent punishment')}</div><p className="mt-1">{tr('A bid more than 15% below the median is checked by a person. Every decision and every view of a bid is logged with a reason.')}</p></Card>
        <Card tone="save" className="p-4"><b className="text-ink">{tr('POOL’s fee is never a ranking factor.')}</b> {tr('The team sets your price after the winner is chosen.')}</Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Legal
const DOCS: Record<string, { title: string; body: Array<[string, string]> }> = {
  terms: { title: 'Terms of use', body: [
    ['Who we are', 'POOL is a marketplace. Sellers sell to you directly and issue the GST invoice; POOL runs the pool, sets the buyer price per pool and keeps the difference from the seller’s price as its fee.'],
    ['Bookings', 'A booking is a refundable advance. It is refunded in full if you leave before close, walk away, don’t reply, there is no deal, or no seller can serve you. If you accept, it is credited to your price.'],
    ['Offers', 'Your personal offer is valid for 24 hours. The price cannot go up after it is published. No reply means walk away.'],
    ['Payments', 'Payments are collected and held by a licensed payment aggregator and released to the seller only after your handover code. POOL does not offer cash on delivery or keep stored balances.'],
    ['Delivery and returns', 'Delivery dates, return windows and any return cost after dispatch are shown on your offer before you accept, and never change after.'],
  ] },
  privacy: { title: 'Privacy notice', body: [
    ['What we collect', 'Name, phone, addresses, pool and order history, and payment references (never full card numbers).'],
    ['Why', 'To run pools, deliver orders, process refunds and prevent fraud. We do not sell data or show third-party ads.'],
    ['Sharing', 'Only the seller you accept sees your contact details, and only for that order. Sellers in an open pool see pincodes and quantities, never names.'],
    ['Your rights', 'Under the Digital Personal Data Protection Act, 2023 you can access, correct and erase your data and withdraw consent. Tax records are kept as the law requires.'],
  ] },
  refunds: { title: 'Refund & cancellation policy', body: [
    ['Bookings', 'Refunded in full, automatically, in every case except an accepted offer (where it is credited to your price).'],
    ['Cancelling an order', 'Free until dispatch. After dispatch, the return cost shown on your offer applies.'],
    ['Defective or wrong items', 'Report within the replacement window. If you’re owed money, POOL refunds first and recovers it from the seller.'],
    ['Timing', 'UPI refunds usually arrive within 30 minutes; cards in 3–5 working days. Every refund goes to the original payment method.'],
  ] },
  grievance: { title: 'Grievance redressal', body: [
    ['Grievance Officer', 'Meera Krishnan (sample) · grievance@pool.example.'],
    ['Timelines', 'We acknowledge every grievance within 48 hours and resolve it within one month, as the Consumer Protection (E-Commerce) Rules, 2020 require.'],
    ['Escalation', 'If you’re not satisfied, you can approach the National Consumer Helpline (1915) or the consumer commission.'],
  ] },
};
export function Legal() {
  const { doc } = useParams();
  const tr = useT();
  const d = DOCS[doc ?? 'terms'] ?? DOCS.terms;
  return (
    <div className="pb-10">
      <AppBar back="/buyer/help" title={tr(d.title)} />
      <div className="space-y-4 px-4 pt-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">{Object.entries(DOCS).map(([k, v]) => <Link key={k} to={`/buyer/help/legal/${k}`} className={cn('whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-semibold', k === (doc ?? 'terms') ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line text-ink-2')}>{tr(v.title)}</Link>)}</div>
        <Card tone="sim" className="p-3 text-[12px] text-ink-2">{tr('Plain-language summary for the demo. Not legal advice; final terms will be reviewed by counsel.')}</Card>
        {d.body.map(([h, b]) => <section key={h}><h3 className="text-[15px] font-bold text-ink">{tr(h)}</h3><p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{tr(b)}</p></section>)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Support chat (simulated, answers from your real data)
interface Msg { from: 'me' | 'pool' | 'agent'; text: string; at: number; chips?: string[] }
export function SupportChat() {
  const s = useSim();
  const tr = useT();
  const [msgs, setMsgs] = useState<Msg[]>(() => [{ from: 'pool', text: tr('Hi {n}, I’m POOL’s assistant. I can see your pools, orders and refunds. What do you need?', { n: s.me.name.split(' ')[0] }), at: now(), chips: [tr('Where is my order?'), tr('Where is my refund?'), tr('My offer'), tr('Talk to a person')] }]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [msgs, typing]);
  const answer = (q: string): Msg => {
    const l = q.toLowerCase();
    const st = s;
    const t = now();
    if (l.includes('person') || l.includes('human') || l.includes('agent')) return { from: 'agent', text: tr('This is Sneha from POOL support. I’ve read the conversation above. How can I help? (Simulated agent)'), at: t };
    if (l.includes('refund')) {
      const rf = st.pools.flatMap((p) => p.members.filter((m) => m.isMe && m.refundAt).map((m) => ({ p, m }))).sort((a, b) => b.m.refundAt! - a.m.refundAt!)[0];
      return { from: 'pool', text: rf ? tr('Your latest refund: {amt} for {prod}, started {when} to {m}. UPI refunds usually land within 30 minutes. The bank reference is in Money.', { amt: inr(rf.m.bookingPaise), prod: productOf(st, rf.p.productId).short, when: fmtWhen(rf.m.refundAt!, t), m: rf.m.bookingMethod ?? 'UPI' }) : tr('You have no refunds in progress.'), at: t, chips: [tr('Open Money')] };
    }
    if (l.includes('order') || l.includes('deliver')) {
      const o = st.orders.filter((x) => x.isMe && ['confirmed', 'awaiting_payment', 'handed_over'].includes(x.status)).sort((a, b) => b.createdAt - a.createdAt)[0];
      if (!o) return { from: 'pool', text: tr('You have no orders in progress.'), at: t };
      const prod = productOf(st, o.productId);
      const out = o.steps.some((x) => x.key === 'dispatched');
      return { from: 'pool', text: out ? tr('{prod} ({no}) is out for delivery, arriving {eta}. {pay}Check the box first, then give your code.', { prod: prod.short, no: o.no, eta: o.tracking?.etaText ?? tr('today'), pay: o.balanceDue > 0 ? tr('Pay {amt} in the app at the door. ', { amt: inr(o.balanceDue) }) : '' }) : tr('{prod} ({no}) is {st}. Promised by {d}.', { prod: prod.short, no: o.no, st: o.status.replace('_', ' '), d: fmtWhen(o.promisedBy, t) }), at: t, chips: [tr('Open order')] };
    }
    if (l.includes('offer')) {
      const m = st.pools.flatMap((p) => p.members.filter((x) => x.isMe && x.status === 'offered').map((x) => ({ p, x })))[0];
      return { from: 'pool', text: m ? tr('You have an offer for {prod}. Decide by {t}. If you don’t reply, it counts as walking away and your booking comes back.', { prod: productOf(st, m.p.productId).short, t: fmtWhen(m.p.acceptBy!, t) }) : tr('No offers waiting right now.'), at: t };
    }
    if (l.includes('code')) return { from: 'pool', text: tr('Your code appears in the order on delivery day, after you pay any balance and tick the checks. Never share it before you’ve checked the box. POOL will never ask for it.'), at: t };
    return { from: 'pool', text: tr('I can help with orders, refunds, offers and codes. For anything else, I’ll bring in a person.'), at: t, chips: [tr('Talk to a person')] };
  };
  const send = (q: string) => {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { from: 'me', text: q, at: now() }]);
    setText('');
    setTyping(true);
    setTimeout(() => { setMsgs((m) => [...m, answer(q)]); setTyping(false); }, 900);
  };
  const nav = useNavigate();
  return (
    <div className="flex h-full flex-col">
      <AppBar back="/buyer/help" title={tr('POOL support')} sub={<span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-save" />{tr('Online · replies in about 2 min')}</span>} right={<SimTag className="mr-2">{tr('Simulated')}</SimTag>} />
      <div className="flex-1 space-y-3 px-4 py-4">
        {msgs.map((m, i) => (
          <div key={i} className={cn('flex flex-col', m.from === 'me' ? 'items-end' : 'items-start')}>
            {m.from === 'agent' && <div className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-3"><Avatar name="Sneha K" size={18} tone="wave" />Sneha · POOL support</div>}
            <div className={cn('max-w-[85%] rounded-[16px] px-3.5 py-2.5 text-[14px] leading-relaxed', m.from === 'me' ? 'rounded-br-[6px] bg-brand text-on-brand' : 'rounded-bl-[6px] bg-surface text-ink shadow-sm ring-1 ring-line')}>{m.text}</div>
            <div className="mt-0.5 text-[10.5px] text-ink-3">{fmtTime(m.at)}</div>
            {m.chips && <div className="mt-1.5 flex flex-wrap gap-1.5">{m.chips.map((c) => <button key={c} onClick={() => (c === tr('Open Money') ? nav('/buyer/money') : c === tr('Open order') ? nav('/buyer/orders') : send(c))} className="rounded-full border border-brand/30 bg-brand-soft px-3 py-1.5 text-[12.5px] font-semibold text-brand-ink">{c}</button>)}</div>}
          </div>
        ))}
        {typing && <div className="flex w-16 items-center justify-center gap-1 rounded-[16px] bg-surface px-3 py-3 ring-1 ring-line">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-3" style={{ animationDelay: `${i * 120}ms` }} />)}</div>}
        <div ref={end} />
      </div>
      <div className="sticky bottom-0 flex gap-2 border-t border-line bg-surface px-3 py-2.5" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        <input className={cn(inputCls, 'h-11')} placeholder={tr('Type your question')} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(text)} />
        <Button className="h-11 w-11 shrink-0 px-0" aria-label={tr('Send')} onClick={() => send(text)}><Send className="h-4.5 w-4.5" /></Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Connected apps & AI assistants (MCP, simulated)
export function Connectors() {
  const s = useSim();
  const tr = useT();
  const toast = useToast();
  const [setup, setSetup] = useState(false);
  const on = (k: string, d = false) => s.prefs.connectors?.[k] ?? d;
  const set = (k: string, v: boolean) => setPrefs({ connectors: { ...(s.prefs.connectors ?? {}), [k]: v } });
  return (
    <div className="pb-10">
      <AppBar back="/buyer/account" title={tr('Connected apps')} />
      <div className="space-y-5 px-4 pt-3">
        <div className="overflow-hidden rounded-[28px] bg-night p-5 text-white">
          <Bot className="h-8 w-8 text-aqua" />
          <div className="mt-3 text-[19px] font-bold leading-snug">{tr('Use POOL from your AI assistant')}</div>
          <p className="mt-1 text-[13px] text-white/65">{tr('Connect POOL to any assistant that supports MCP. Ask it to find a pool, compare prices or track an order. It can never pay or accept an offer without you tapping “Yes” in POOL.')}</p>
          <Button className="mt-4" variant="wave" onClick={() => setSetup(true)}>{on('mcp') ? tr('Manage connection') : tr('Connect an assistant')}</Button>
        </div>
        {on('mcp') && (
          <Card className="p-4">
            <div className="flex items-center justify-between"><div className="text-[14.5px] font-bold text-ink">{tr('Assistant connected')}</div><Chip tone="save" dot>{tr('Active')}</Chip></div>
            <div className="mt-2 space-y-1.5 text-[13px] text-ink-2">
              <div className="flex gap-2"><Check className="h-4 w-4 text-save" />{tr('Read pools, offers and order status')}</div>
              <div className="flex gap-2"><Check className="h-4 w-4 text-save" />{tr('Prepare a join or an accept for you to confirm')}</div>
              <div className="flex gap-2"><X2 />{tr('Pay, accept or share your address on its own')}</div>
            </div>
            <div className="mt-3 rounded-[12px] bg-surface-2 p-3 text-[12px] text-ink-3">{tr('Last used {t}: “track my mixer order”', { t: fmtAgo(now() - 2 * 3600_000, now()) })}</div>
            <Button size="sm" variant="ghost" className="mt-2 text-danger" onClick={() => { set('mcp', false); toast(tr('Disconnected')); }}>{tr('Disconnect')}</Button>
          </Card>
        )}
        <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
          <Row icon={<MessageCircle className="h-5 w-5 text-[#25a244]" />} title="WhatsApp" sub={tr('Join pools by voice note, get offers and codes')} right={<Toggle label="WhatsApp" checked={on('whatsapp', true)} onChange={(v) => set('whatsapp', v)} />} />
          <Row icon={<CalendarDays className="h-5 w-5" />} title={tr('Calendar')} sub={tr('Add delivery days and pickup slots')} right={<Toggle label={tr('Calendar')} checked={on('calendar')} onChange={(v) => set('calendar', v)} />} />
          <Row icon={<Sparkles className="h-5 w-5" />} title={tr('Ask POOL (in-app assistant)')} sub={tr('Voice in English, Telugu and Hindi')} to="/buyer/assistant" />
        </div>
        <p className="text-center"><SimTag>{tr('Connections simulated')}</SimTag></p>
      </div>
      <Sheet open={setup} onClose={() => setSetup(false)} title={tr('Connect an AI assistant')} footer={<Button full onClick={() => { set('mcp', !on('mcp')); setSetup(false); toast(on('mcp') ? tr('Disconnected') : tr('Assistant connected')); }}>{on('mcp') ? tr('Disconnect') : tr('Allow')}</Button>}>
        <div className="space-y-3 text-[13.5px] text-ink-2">
          <p>{tr('Add this server address in your assistant’s connector settings, then approve here:')}</p>
          <div className="rounded-[12px] bg-surface-3 px-3 py-2.5 font-mono text-[12.5px] text-ink">https://mcp.pool.example/v1</div>
          <div className="font-semibold text-ink">{tr('It will be able to')}</div>
          <ul className="list-disc space-y-1 pl-5"><li>{tr('See your pools, offers, orders and refunds')}</li><li>{tr('Search products and compare outside prices')}</li><li>{tr('Draft a join or accept that you confirm in POOL')}</li></ul>
          <div className="font-semibold text-ink">{tr('It will never')}</div>
          <ul className="list-disc space-y-1 pl-5"><li>{tr('Pay, accept or walk away for you')}</li><li>{tr('See your handover codes')}</li></ul>
        </div>
      </Sheet>
    </div>
  );
}
const X2 = () => <span className="grid h-4 w-4 place-items-center text-danger">✕</span>;
