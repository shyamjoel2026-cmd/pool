import { BatteryFull, BookOpen, Check, ChevronLeft, ChevronRight, Clock3, FlaskConical, Languages, RotateCcw, Signal, Wifi, X, Zap } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { LANGS } from '../lib/i18n';
import { fmtDayTime, fmtTime, HOUR, DAY } from '../lib/time';
import { advanceClock, resetDemo, setDemo, setPrefs, setTour, useNow, useSim } from '../sim/store';
import { Button, PortalHost, Sheet, SimTag, Toggle, ToastHost } from '../ui/core';
import { Mark } from '../ui/Logo';
import { GUIDE, type Role } from './guide';

const ROLES: Array<{ id: Role; label: string; to: string }> = [
  { id: 'buyer', label: 'Buyer app', to: '/buyer' },
  { id: 'seller', label: 'Seller app', to: '/seller' },
  { id: 'ops', label: 'POOL team', to: '/ops' },
];

export function DemoBar({ role }: { role: Role }) {
  const s = useSim();
  const [controls, setControls] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-[70] flex h-[52px] items-center gap-2 border-b border-white/10 bg-night px-3 text-white sm:px-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="POOL home">
          <Mark size={28} />
          <span className="hidden text-[15px] font-bold tracking-[0.06em] sm:inline">POOL</span>
        </Link>
        <span className="hidden items-center gap-1.5 rounded-full border border-dashed border-[#b6a2ff]/60 bg-[#b6a2ff]/10 px-2.5 py-1 text-[11px] font-semibold text-[#cfc2ff] md:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#b6a2ff]" /> Demo · simulated money, sample data · build {__POOL_BUILD__}
        </span>
        <nav className="mx-auto flex rounded-[12px] bg-white/8 p-1" aria-label="Switch app">
          {ROLES.map((r) => (
            <Link key={r.id} to={r.to} className={cn('rounded-[9px] px-2.5 py-1.5 text-[12.5px] font-semibold transition sm:px-3.5', role === r.id ? 'bg-white text-night' : 'text-white/70 hover:text-white')}>
              {r.label}
            </Link>
          ))}
        </nav>
        <button onClick={() => setTour({ active: !s.tour.active })} className={cn('hidden h-9 items-center gap-1.5 rounded-[10px] px-3 text-[12.5px] font-semibold transition lg:inline-flex', s.tour.active ? 'bg-aqua text-night' : 'bg-white/10 text-white hover:bg-white/15')}>
          <BookOpen className="h-4 w-4" /> Walkthrough
        </button>
        <button onClick={() => setControls(true)} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-white/10 px-2.5 text-[12.5px] font-semibold text-white hover:bg-white/15" aria-label="Demo controls">
          <FlaskConical className="h-4 w-4" /> <span className="hidden sm:inline">Demo controls</span>
        </button>
      </header>
      <PortalHost>
        <DemoControls open={controls} onClose={() => setControls(false)} />
      </PortalHost>
    </>
  );
}

function DemoControls({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSim();
  const t = useNow(1000);
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <Sheet open={open} onClose={onClose} title="Demo controls">
      <div className="space-y-5">
        <div className="rounded-[14px] bg-sim-soft p-3.5 text-[13px] text-ink-2">
          <SimTag className="mb-1.5">Simulation</SimTag>
          <p>Everything here runs in your browser on sample data. No real money moves and no message is sent. These switches let you see the app's error and edge states.</p>
          <p className="mt-1.5 text-[12px] text-ink-3">Version: Deep End · build {__POOL_BUILD__}</p>
        </div>
        <div className="space-y-1">
          <div className="eyebrow text-ink-3">Simulated time</div>
          <div className="flex items-center justify-between rounded-[14px] border border-line p-3.5">
            <div>
              <div className="text-[14px] font-semibold text-ink">{fmtDayTime(t)} IST</div>
              <div className="text-[12px] text-ink-3">{s.offset ? `Moved forward by ${Math.round(s.offset / HOUR)} h` : 'Real time'}</div>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" icon={<Clock3 className="h-4 w-4" />} onClick={() => advanceClock(HOUR)}>+1 h</Button>
              <Button size="sm" variant="outline" onClick={() => advanceClock(DAY)}>+1 day</Button>
            </div>
          </div>
          <p className="px-1 text-[11.5px] text-ink-3">Moving time runs every rule: pools close, offers expire with refunds, holds release, orders complete and waves pay out.</p>
        </div>
        <div className="space-y-2">
          <div className="eyebrow text-ink-3">Edge states</div>
          {(
            [
              ['failNextPayment', 'Make the next payment fail', 'See the payment-failed state and retry.'],
              ['failNextLoad', 'Make the next screen fail to load', 'See the error state with retry.'],
              ['slowNetwork', 'Slow network', 'Longer loading skeletons on every screen.'],
              ['offline', 'Offline', 'Shows the offline banner; actions wait.'],
            ] as const
          ).map(([k, label, sub]) => (
            <div key={k} className="flex items-center justify-between gap-3 rounded-[14px] border border-line p-3.5">
              <div>
                <div className="text-[14px] font-semibold text-ink">{label}</div>
                <div className="text-[12px] text-ink-3">{sub}</div>
              </div>
              <Toggle label={label} checked={s.demo[k]} onChange={(v) => setDemo({ [k]: v })} />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="eyebrow text-ink-3">Language</div>
          <div className="grid grid-cols-3 gap-2">
            {LANGS.map((l) => (
              <button key={l.id} onClick={() => setPrefs({ lang: l.id })} className={cn('rounded-[12px] border px-3 py-2.5 text-[14px] font-semibold', s.prefs.lang === l.id ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line text-ink-2')}>
                {l.native}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-[14px] border border-danger/25 p-3.5">
          <div className="text-[14px] font-semibold text-ink">Reset the demo</div>
          <p className="mt-0.5 text-[12px] text-ink-3">Puts every pool, order and payment back to the starting story.</p>
          {confirmReset ? (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="danger" icon={<RotateCcw className="h-4 w-4" />} onClick={() => { resetDemo(); setConfirmReset(false); onClose(); }}>Yes, reset everything</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>Keep my progress</Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="mt-3" icon={<RotateCcw className="h-4 w-4" />} onClick={() => setConfirmReset(true)}>Reset demo</Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/** Phone on the left, the walkthrough on the right (desktop). Full-screen app on phones. */
export function PhoneStage({ role, children }: { role: Role; children: ReactNode }) {
  const s = useSim();
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 900);
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= 900);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  if (!wide) {
    return (
      <div className="device-screen relative bg-bg" style={{ height: 'calc(100dvh - 52px)' }}>
        <PortalHost>
          <ToastHost>{children}</ToastHost>
        </PortalHost>
        {s.tour.active && <GuideDock role={role} />}
      </div>
    );
  }
  return (
    <div className="flex justify-center gap-8 bg-[radial-gradient(1200px_600px_at_30%_0%,color-mix(in_oklab,var(--brand)_10%,var(--bg)),var(--bg))] px-6 py-6" style={{ minHeight: 'calc(100dvh - 52px)' }}>
      <div className="flex shrink-0 flex-col items-center">
        <div className="relative rounded-[54px] bg-[#0b0e16] p-[11px] shadow-[0_40px_80px_-30px_rgba(5,8,18,.6),inset_0_0_0_1.5px_rgba(255,255,255,.08)]" style={{ width: 412, height: 'min(866px, calc(100dvh - 100px))' }}>
          <div className="device-screen relative h-full w-full overflow-hidden rounded-[44px] bg-bg">
            <StatusBar />
            <div className="absolute inset-x-0 bottom-0 top-[34px]">
              <PortalHost>
                <ToastHost>{children}</ToastHost>
              </PortalHost>
            </div>
            <div className="pointer-events-none absolute left-1/2 top-[9px] z-[90] h-[26px] w-[104px] -translate-x-1/2 rounded-full bg-black" />
          </div>
        </div>
        <div className="mt-3 text-[11.5px] text-ink-3">{role === 'buyer' ? 'Buyer app · Ananya Reddy, Gachibowli' : 'Seller app · Lakshmi Home Appliances, Kukatpally'}</div>
      </div>
      <aside className="w-[380px] shrink-0">
        <GuidePanel role={role} />
      </aside>
    </div>
  );
}

function StatusBar() {
  const t = useNow(15000);
  return (
    <div className="absolute inset-x-0 top-0 z-[85] flex h-[34px] items-center justify-between px-7 pt-1 text-[12.5px] font-semibold text-ink">
      <span className="num">{fmtTime(t).replace(' AM', '').replace(' PM', '')}</span>
      <span className="flex items-center gap-1">
        <Signal className="h-3.5 w-3.5" />
        <Wifi className="h-3.5 w-3.5" />
        <BatteryFull className="h-4 w-4" />
      </span>
    </div>
  );
}

function stepIndexFor(s: ReturnType<typeof useSim>) {
  const i = GUIDE.findIndex((g) => g.done && !g.done(s));
  return i;
}

export function GuidePanel({ role }: { role: Role }) {
  const s = useSim();
  const nav = useNavigate();
  const loc = useLocation();
  const [i, setI] = useState(() => Math.max(0, Math.min(GUIDE.length - 1, s.tour.step)));
  useEffect(() => {
    setTour({ step: i });
  }, [i]);
  const step = GUIDE[i];
  const next = stepIndexFor(s);
  if (!s.tour.active) return <AboutPanel role={role} onStart={() => setTour({ active: true })} />;
  const go = () => nav(step.path(s));
  const here = loc.pathname === step.path(s).split('?')[0];
  return (
    <div className="sticky top-[76px] space-y-3">
      <div className="rounded-[28px] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div className="eyebrow text-brand">{step.chapter}</div>
          <button onClick={() => setTour({ active: false })} className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-surface-3" aria-label="Close walkthrough"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="num text-[13px] font-bold text-ink-3">{i + 1}/{GUIDE.length}</span>
          <h3 className="text-[19px] font-bold leading-tight text-ink">{step.title}</h3>
        </div>
        <div className="mt-3 rounded-[14px] bg-brand-soft p-3.5 text-[13.5px] leading-relaxed text-brand-ink">
          <span className="font-bold">Do this: </span>
          {step.doThis}
        </div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">
          <span className="font-semibold text-ink">Why it matters: </span>
          {step.why}
        </p>
        {step.shortcut && step.shortcut.available(s) && (
          <div className="mt-3 rounded-[14px] border border-dashed border-sim/50 bg-sim-soft p-3">
            <div className="flex items-center gap-2">
              <SimTag>Demo shortcut</SimTag>
            </div>
            <p className="mt-1.5 text-[12.5px] text-ink-2">{step.shortcut.explain}</p>
            <Button size="sm" variant="dark" className="mt-2" icon={<Zap className="h-4 w-4" />} onClick={() => { step.shortcut!.run(s); nav(step.path(useSimSnapshot())); }}>{step.shortcut.label}</Button>
          </div>
        )}
        <div className="mt-4 flex items-center gap-2">
          {!here && <Button size="sm" onClick={go} iconRight={<ChevronRight className="h-4 w-4" />}>Take me there</Button>}
          {step.done?.(s) && <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-save"><Check className="h-4 w-4" /> Done</span>}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
          <Button size="sm" variant="ghost" disabled={i === 0} icon={<ChevronLeft className="h-4 w-4" />} onClick={() => { setI(i - 1); nav(GUIDE[i - 1].path(s)); }}>Back</Button>
          <Button size="sm" variant="outline" disabled={i === GUIDE.length - 1} iconRight={<ChevronRight className="h-4 w-4" />} onClick={() => { setI(i + 1); nav(GUIDE[i + 1].path(useSimSnapshot())); }}>Next step</Button>
        </div>
      </div>
      <div className="rounded-[28px] border border-line bg-surface p-4">
        <div className="eyebrow mb-2 text-ink-3">The whole story</div>
        <ol className="space-y-0.5">
          {GUIDE.map((g, k) => (
            <li key={g.id}>
              <button onClick={() => { setI(k); nav(g.path(s)); }} className={cn('flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left text-[12.5px] transition hover:bg-surface-2', k === i && 'bg-surface-3')}>
                <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold', g.done?.(s) ? 'bg-save text-white' : k === next ? 'bg-brand text-white' : 'bg-surface-3 text-ink-3')}>{g.done?.(s) ? <Check className="h-3 w-3" strokeWidth={3} /> : k + 1}</span>
                <span className={cn('min-w-0 flex-1 truncate', k === i ? 'font-semibold text-ink' : 'text-ink-2')}>{g.title}</span>
                <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">{g.role === 'ops' ? 'POOL' : g.role}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

import { getState } from '../sim/store';
const useSimSnapshot = () => getState();

function AboutPanel({ role, onStart }: { role: Role; onStart: () => void }) {
  const s = useSim();
  return (
    <div className="sticky top-[76px] space-y-3">
      <div className="overflow-hidden rounded-[28px] bg-night p-5 text-white">
        <div className="eyebrow text-aqua">Investor walkthrough</div>
        <h3 className="mt-1 text-[22px] font-bold leading-tight">See the whole business in 15 steps</h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">One live story across the buyer, a seller and the POOL team: a 55″ TV pool from link to Wave Drop, with the money tracked at every step.</p>
        <Button className="mt-4" variant="wave" icon={<BookOpen className="h-4 w-4" />} onClick={onStart}>Start the walkthrough</Button>
      </div>
      <div className="rounded-[28px] border border-line bg-surface p-5">
        <div className="eyebrow text-ink-3">{role === 'buyer' ? 'You are Ananya, a buyer in Gachibowli' : 'You are Lakshmi Home Appliances, a verified dealer'}</div>
        <ul className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-ink-2">
          {role === 'buyer' ? (
            <>
              <li>• Two offers are waiting for a decision. With Ananya’s SBI card, one of them is cheaper outside POOL, and the app says so.</li>
              <li>• A mixer grinder is out for delivery. Ananya chose to pay at the door, so the code unlocks after paying.</li>
              <li>• Ananya is moving into Lakeview Heights in about two weeks and joined the community's move-in pools.</li>
              <li>• A completed washing-machine wave paid a Wave Drop back.</li>
            </>
          ) : (
            <>
              <li>• New demand to bid on: a 55″ TV pool (closing Friday) and a fridge pool with no bids yet.</li>
              <li>• Mixer orders to confirm and dispatch, and a buyer code to verify at the door.</li>
              <li>• Payouts show every hold: installation, Wave Drop and TCS/TDS credits.</li>
            </>
          )}
        </ul>
        <p className="mt-3 text-[11.5px] text-ink-3">{s.offset ? 'Simulated clock moved forward.' : 'Times are live, in IST.'} People, shops and brands are samples.</p>
      </div>
      <div className="flex items-center gap-2 rounded-[16px] border border-line bg-surface px-4 py-3 text-[12.5px] text-ink-2">
        <Languages className="h-4 w-4 text-ink-3" /> Try the buyer app in తెలుగు or हिन्दी from Demo controls.
      </div>
    </div>
  );
}

/** Mobile: a small dock at the bottom of the screen for the walkthrough. */
function GuideDock({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-[88px] right-3 z-[75] flex h-11 items-center gap-1.5 rounded-full bg-night px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-pop)]">
        <BookOpen className="h-4 w-4" /> Walkthrough
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Walkthrough" size="tall">
        <GuidePanel role={role} />
      </Sheet>
    </>
  );
}
