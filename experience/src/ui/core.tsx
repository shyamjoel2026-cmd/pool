import { AlertTriangle, Check, ChevronRight, Loader2, Minus, Plus, RefreshCw, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { cn } from '../lib/cn';
import { inr } from '../lib/money';
import { countdown } from '../lib/time';
import { useNow } from '../sim/store';
import { useT } from '../lib/i18n';

// ---------------------------------------------------------------- Buttons
type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'wave' | 'dark' | 'save' | 'gold';
const variants: Record<Variant, string> = {
  primary: 'btn-lit bg-brand text-on-brand hover:bg-brand-strong',
  secondary: 'bg-surface-3 text-ink hover:bg-line',
  ghost: 'text-ink-2 hover:bg-surface-3',
  outline: 'border-[1.5px] border-line-2 text-ink bg-surface hover:border-ink-3 hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90',
  wave: 'bg-wave text-[#04211e] hover:opacity-90 shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]',
  dark: 'bg-ink text-surface hover:opacity-90 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]',
  save: 'bg-save text-white hover:opacity-90',
  gold: 'bg-gold text-[#1d1300] hover:brightness-105 shadow-[inset_0_1px_0_rgb(255_255_255/0.45)]',
};
const sizes = { sm: 'h-9 px-3.5 text-[13px] rounded-full gap-1.5', md: 'h-11 px-5 text-[14.5px] rounded-full gap-2', lg: 'h-[54px] px-6 text-[16px] rounded-full gap-2' };

export function Button({ variant = 'primary', size = 'md', full, loading, icon, iconRight, className, children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof sizes; full?: boolean; loading?: boolean; icon?: ReactNode; iconRight?: ReactNode }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn('inline-flex select-none items-center justify-center font-semibold tracking-[-0.005em] transition-[background,transform,opacity,border-color] duration-200 active:scale-[0.97] disabled:opacity-45 disabled:active:scale-100', variants[variant], sizes[size], full && 'w-full', className)}
    >
      {loading ? <Loader2 className="spin h-4 w-4" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  );
}

export function LinkButton({ to, variant = 'primary', size = 'md', full, icon, iconRight, className, children }: { to: string; variant?: Variant; size?: keyof typeof sizes; full?: boolean; icon?: ReactNode; iconRight?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={cn('inline-flex items-center justify-center font-semibold tracking-[-0.005em] transition duration-200 active:scale-[0.97]', variants[variant], sizes[size], full && 'w-full', className)}>
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}

export function IconButton({ label, children, className, badge, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; badge?: number }) {
  return (
    <button aria-label={label} title={label} {...rest} className={cn('relative grid h-10 w-10 place-items-center rounded-full text-ink-2 transition hover:bg-surface-3 active:scale-95', className)}>
      {children}
      {badge ? <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10.5px] font-bold text-white num">{badge > 9 ? '9+' : badge}</span> : null}
    </button>
  );
}

// ---------------------------------------------------------------- Surfaces
export function Card({ className, children, onClick, to, tone }: { className?: string; children: ReactNode; onClick?: () => void; to?: string; tone?: 'plain' | 'brand' | 'wave' | 'warn' | 'save' | 'night' | 'sim' }) {
  const toneCls = {
    plain: 'bg-surface border border-line',
    brand: 'bg-brand-soft border border-brand/15',
    wave: 'bg-wave-soft border border-wave/20',
    warn: 'bg-warn-soft border border-warn/25',
    save: 'bg-save-soft border border-save/20',
    night: 'bg-night text-white border border-white/8',
    sim: 'bg-sim-soft border border-sim/25',
  }[tone ?? 'plain'];
  const cls = cn('rounded-[24px] shadow-[var(--shadow-card)]', toneCls, (onClick || to) && 'transition hover:border-line-2 active:scale-[0.995] cursor-pointer text-left', className);
  if (to) return <Link to={to} className={cn('block', cls)}>{children}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cn('block w-full', cls)}>{children}</button>;
  return <div className={cls}>{children}</div>;
}

type Tone = 'neutral' | 'brand' | 'wave' | 'save' | 'warn' | 'danger' | 'sim' | 'dark';
const toneChip: Record<Tone, string> = {
  neutral: 'bg-surface-3 text-ink-2',
  brand: 'bg-brand-soft text-brand-ink',
  wave: 'bg-wave-soft text-wave-ink',
  save: 'bg-save-soft text-save',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  sim: 'bg-sim-soft text-sim',
  dark: 'bg-ink text-surface',
};
export function Chip({ tone = 'neutral', children, icon, className, dot }: { tone?: Tone; children: ReactNode; icon?: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-[4px] text-[11.5px] font-semibold leading-none', toneChip[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {icon}
      {children}
    </span>
  );
}

/** Marks anything that would be real money or a real message in production. */
export function SimTag({ children = 'Simulated', className }: { children?: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border border-dashed border-sim/50 bg-sim-soft px-2 py-[2px] text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sim', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-sim" />
      {children}
    </span>
  );
}

export function Money({ p, className, exact, sign }: { p: number; className?: string; exact?: boolean; sign?: boolean }) {
  return <span className={cn('num', className)}>{inr(p, { exact, sign })}</span>;
}

export function Section({ title, action, children, className, sub }: { title?: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-3', className)}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-3 px-0.5">
          <div className="min-w-0">
            {title && <h2 className="display-tight text-[19px] text-ink">{title}</h2>}
            {sub && <p className="mt-0.5 text-[13px] text-ink-3">{sub}</p>}
          </div>
          {action && <div className="shrink-0 whitespace-nowrap">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Row({ icon, title, sub, right, to, onClick, chevron = true, className }: { icon?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode; to?: string; onClick?: () => void; chevron?: boolean; className?: string }) {
  const inner = (
    <div className={cn('flex min-h-[56px] items-center gap-3 px-4 py-3', className)}>
      {icon && <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-surface-3 text-ink-2">{icon}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold text-ink">{title}</div>
        {sub && <div className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{sub}</div>}
      </div>
      {right}
      {chevron && (to || onClick) && <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />}
    </div>
  );
  if (to) return <Link to={to} className="block transition hover:bg-surface-2">{inner}</Link>;
  if (onClick) return <button onClick={onClick} className="block w-full text-left transition hover:bg-surface-2">{inner}</button>;
  return inner;
}

export function KV({ k, v, strong, tone, hint }: { k: ReactNode; v: ReactNode; strong?: boolean; tone?: 'save' | 'wave' | 'danger' | 'muted'; hint?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <div className={cn('text-[13.5px]', strong ? 'font-semibold text-ink' : 'text-ink-2')}>{k}</div>
        {hint && <div className="text-[11.5px] text-ink-3">{hint}</div>}
      </div>
      <div className={cn('num shrink-0 text-right text-[13.5px]', strong ? 'text-[15px] font-bold text-ink' : 'font-medium text-ink', tone === 'save' && 'text-save', tone === 'wave' && 'text-wave', tone === 'danger' && 'text-danger', tone === 'muted' && 'text-ink-3')}>{v}</div>
    </div>
  );
}

export const Divider = ({ className }: { className?: string }) => <div className={cn('h-px bg-line', className)} />;

export function Progress({ value, tone = 'brand', className, height = 6 }: { value: number; tone?: 'brand' | 'wave' | 'save' | 'warn'; className?: string; height?: number }) {
  const c = { brand: 'bg-[linear-gradient(90deg,var(--brand),color-mix(in_oklab,var(--brand)_55%,var(--wave)))]', wave: 'bg-wave', save: 'bg-save', warn: 'bg-warn' }[tone];
  return (
    <div className={cn('overflow-hidden rounded-full bg-surface-3', className)} style={{ height }}>
      <div className={cn('h-full rounded-full transition-[width] duration-700', c)} style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export function Avatar({ name, size = 36, tone = 'brand' }: { name: string; size?: number; tone?: 'brand' | 'wave' | 'warn' | 'neutral' }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const c = { brand: 'bg-brand-soft text-brand-ink', wave: 'bg-wave-soft text-wave-ink', warn: 'bg-warn-soft text-warn', neutral: 'bg-surface-3 text-ink-2' }[tone];
  return <span className={cn('grid shrink-0 place-items-center rounded-full font-bold', c)} style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</span>;
}

// ---------------------------------------------------------------- States
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-[24px] border border-line bg-surface p-4">
          <Skeleton className="h-16 w-16 shrink-0 rounded-[14px]" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, body, action, className }: { icon?: ReactNode; title: string; body?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center rounded-[24px] border border-dashed border-line-2 bg-surface/60 px-6 py-10 text-center', className)}>
      {icon && <div className="relative mb-4 grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand ring-8 ring-brand-soft/40">{icon}</div>}
      <div className="display-tight text-[17px] text-ink">{title}</div>
      {body && <p className="mt-1.5 max-w-[290px] text-[13.5px] leading-relaxed text-ink-3">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "This didn't load", body = 'Your connection dropped while loading. Nothing you did was lost.', onRetry }: { title?: string; body?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[24px] border border-danger/20 bg-danger-soft/60 px-6 py-9 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-danger-soft text-danger"><AlertTriangle className="h-6 w-6" /></div>
      <div className="text-[15.5px] font-bold text-ink">{title}</div>
      <p className="mt-1 max-w-[280px] text-[13.5px] text-ink-2">{body}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" icon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>Try again</Button>}
    </div>
  );
}

// ---------------------------------------------------------------- Time
export function Countdown({ to, compact, className, warnUnderMs = 6 * 3600_000 }: { to: number; compact?: boolean; className?: string; warnUnderMs?: number }) {
  const t = useNow(1000);
  const tr = useT();
  const c = countdown(to, t);
  if (c.past) return <span className={cn('num font-semibold text-ink-3', className)}>{tr('closed')}</span>;
  const warn = c.total < warnUnderMs;
  const parts = c.d > 0 ? [`${c.d}d`, `${c.h}h`, `${String(c.m).padStart(2, '0')}m`] : c.h > 0 ? [`${c.h}h`, `${String(c.m).padStart(2, '0')}m`, `${String(c.s).padStart(2, '0')}s`] : [`${c.m}m`, `${String(c.s).padStart(2, '0')}s`];
  return <span className={cn('num font-semibold', warn ? 'text-warn' : 'text-ink', className)}>{compact ? parts.slice(0, 2).join(' ') : parts.join(' ')}</span>;
}

// ---------------------------------------------------------------- Inputs
export function Stepper({ value, onChange, min, max, step, format }: { value: number; onChange: (v: number) => void; min: number; max?: number; step: number; format: (v: number) => string }) {
  const canDown = value - step >= min;
  const canUp = max === undefined || value + step <= max;
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line-2 bg-surface p-1">
      <button aria-label="Less" disabled={!canDown} onClick={() => onChange(value - step)} className="grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-surface-3 active:scale-90 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
      <span className="num min-w-[86px] text-center text-[15.5px] font-bold">{format(value)}</span>
      <button aria-label="More" disabled={!canUp} onClick={() => onChange(value + step)} className="grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-surface-3 active:scale-90 disabled:opacity-30"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <button id={id} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn('relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors duration-300', checked ? 'bg-brand' : 'bg-line-2')}>
      <span className={cn('absolute top-[3px] h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.2)] transition-all duration-300 [transition-timing-function:var(--ease-spring)]', checked ? 'left-[25px]' : 'left-[3px]')} />
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: ReactNode; count?: number }>; className?: string }) {
  return (
    <div className={cn('no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-surface-3 p-1', className)} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)} className={cn('flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition', value === o.value ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06),0_4px_10px_-4px_rgb(0_0_0/0.12)]' : 'text-ink-3 hover:text-ink-2')}>
          {o.label}
          {o.count !== undefined && <span className={cn('num rounded-full px-1.5 text-[11px]', value === o.value ? 'bg-brand-soft text-brand-ink' : 'bg-line text-ink-3')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink-2">{label}</label>
      {children}
      {error ? <p className="text-[12.5px] font-medium text-danger">{error}</p> : hint ? <p className="text-[12px] text-ink-3">{hint}</p> : null}
    </div>
  );
}

export const inputCls = 'h-[52px] w-full rounded-[16px] border-[1.5px] border-line-2 bg-surface px-4 text-[15.5px] text-ink outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/15';

export function CheckRow({ checked, onChange, label, sub, id }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; sub?: ReactNode; id: string }) {
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-3 rounded-[22px] border-[1.5px] p-4 transition', checked ? 'border-save/50 bg-save-soft' : 'border-line bg-surface hover:border-line-2')}>
      <input id={id} type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[8px] border-2 transition', checked ? 'border-save bg-save text-white' : 'border-line-2 bg-surface')}>{checked && <CheckIcon />}</span>
      <span className="min-w-0">
        <span className="block text-[14.5px] font-semibold text-ink">{label}</span>
        {sub && <span className="mt-0.5 block text-[12.5px] text-ink-3">{sub}</span>}
      </span>
    </label>
  );
}
const CheckIcon = () => <Check className="h-4 w-4" strokeWidth={3} />;

export function Radio({ checked, onSelect, title, sub, right, id, disabled }: { checked: boolean; onSelect: () => void; title: ReactNode; sub?: ReactNode; right?: ReactNode; id: string; disabled?: boolean }) {
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-3 rounded-[22px] border-[1.5px] p-4 transition', checked ? 'border-brand bg-brand-soft/60 ring-4 ring-brand/10' : 'border-line bg-surface hover:border-line-2', disabled && 'cursor-not-allowed opacity-50')}>
      <input id={id} type="radio" className="sr-only" checked={checked} disabled={disabled} onChange={onSelect} />
      <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', checked ? 'border-brand' : 'border-line-2')}>{checked && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold text-ink">{title}</span>
        {sub && <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">{sub}</span>}
      </span>
      {right}
    </label>
  );
}

// ---------------------------------------------------------------- Timeline
export interface TimelineItem {
  title: ReactNode;
  sub?: ReactNode;
  state: 'done' | 'current' | 'todo' | 'bad';
  proof?: ReactNode;
}
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative">
      {items.map((it, i) => (
        <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
          {i < items.length - 1 && <span className={cn('absolute left-[11px] top-6 bottom-0 w-[2px]', it.state === 'done' ? 'bg-save/50' : 'bg-line')} />}
          <span className={cn('relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2', it.state === 'done' && 'border-save bg-save text-white', it.state === 'current' && 'border-brand bg-surface', it.state === 'todo' && 'border-line-2 bg-surface', it.state === 'bad' && 'border-danger bg-danger text-white')}>
            {it.state === 'done' && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            {it.state === 'current' && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
            {it.state === 'bad' && <X className="h-3.5 w-3.5" strokeWidth={3} />}
            {it.state === 'current' && <span className="pulse-ring absolute inset-0 rounded-full border-2 border-brand" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className={cn('text-[14px] font-semibold', it.state === 'todo' ? 'text-ink-3' : 'text-ink')}>{it.title}</div>
            {it.sub && <div className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{it.sub}</div>}
            {it.proof && <div className="mt-1.5">{it.proof}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------- Portals: sheets & toasts live inside the current screen
const PortalCtx = createContext<HTMLElement | null>(null);
export function PortalHost({ children, className }: { children: ReactNode; className?: string }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  return (
    <PortalCtx.Provider value={el}>
      {children}
      <div ref={setEl} className={className} />
    </PortalCtx.Provider>
  );
}
function usePortal() {
  return useContext(PortalCtx) ?? (typeof document !== 'undefined' ? document.body : null);
}

export function Sheet({ open, onClose, title, children, footer, size = 'auto', dismissible = true }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'auto' | 'tall'; dismissible?: boolean }) {
  const el = usePortal();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismissible && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, dismissible]);
  if (!open || !el) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="fade-enter absolute inset-0 bg-[rgb(5_7_15/0.5)] backdrop-blur-[2px]" onClick={() => dismissible && onClose()} />
      <div ref={ref} tabIndex={-1} className={cn('sheet-enter relative flex max-h-[92%] w-full max-w-[520px] flex-col rounded-t-[32px] bg-surface shadow-[var(--shadow-pop)] outline-none sm:rounded-[32px]', size === 'tall' && 'h-[88%]')}>
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
          <div className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-line-2 sm:hidden" />
        </div>
        {(title || dismissible) && (
          <div className="flex items-start justify-between gap-3 px-5 pb-3">
            <div className="display-tight text-[21px] leading-tight text-ink">{title}</div>
            {dismissible && <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1 h-9 w-9"><X className="h-5 w-5" /></IconButton>}
          </div>
        )}
        <div className="scroll-y min-h-0 flex-1 px-5 pb-5">{children}</div>
        {footer && <div className="border-t border-line px-5 py-3.5" style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}>{footer}</div>}
      </div>
    </div>,
    el,
  );
}

type ToastT = { id: number; text: ReactNode; tone: 'ok' | 'err' | 'info' };
const ToastCtx = createContext<(text: ReactNode, tone?: ToastT['tone']) => void>(() => {});
export function ToastHost({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastT[]>([]);
  const el = usePortal();
  const push = useCallback((text: ReactNode, tone: ToastT['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {el &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
            {toasts.map((t) => (
              <div key={t.id} className={cn('pop pointer-events-auto flex max-w-[440px] items-center gap-2.5 rounded-full py-2.5 pl-3 pr-4 text-[13.5px] font-semibold shadow-[var(--shadow-pop)] backdrop-blur-xl', t.tone === 'err' ? 'bg-danger text-white' : 'bg-[rgb(11_15_26/0.88)] text-white')}>
                {t.tone === 'ok' && <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-aqua text-[#04211e]"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>}
                {t.tone === 'err' && <AlertTriangle className="h-4 w-4" />}
                <span>{t.text}</span>
              </div>
            ))}
          </div>,
          el,
        )}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/** Shows a short loading skeleton on first view (and honours the demo's slow-network / failure switches). */
export function useLoad(key: string, opts: { slow?: boolean; fail?: boolean; onFailConsumed?: () => void } = {}) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [n, setN] = useState(0);
  useEffect(() => {
    setState('loading');
    const t = setTimeout(() => {
      if (opts.fail) {
        setState('error');
        opts.onFailConsumed?.();
      } else setState('ready');
    }, opts.slow ? 1600 : 380);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, n]);
  return { state, retry: () => setN((x) => x + 1) };
}
