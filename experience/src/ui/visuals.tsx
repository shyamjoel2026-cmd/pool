import { Lock, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/cn';
import { useT } from '../lib/i18n';
import { inr } from '../lib/money';

/** Wave Drop pot as water: the level rises with every completed purchase. Real numbers only. */
export function WaveMeter({ level, title, value, caption, height = 132, className }: { level: number; title: string; value: string; caption?: string; height?: number; className?: string }) {
  const pct = Math.max(0.06, Math.min(1, level));
  return (
    <div className={cn('relative overflow-hidden rounded-[18px] border border-wave/25 bg-wave-soft', className)} style={{ height }}>
      <div className="absolute inset-x-0 bottom-0 transition-[height] duration-1000" style={{ height: `${pct * 100}%` }}>
        <svg className="wave-move absolute -top-[10px] left-0 h-[12px] w-[200%]" viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 6 Q25 0 50 6 T100 6 T150 6 T200 6 T250 6 T300 6 T350 6 T400 6 V12 H0Z" fill="var(--wave)" opacity=".35" />
        </svg>
        <div className="h-full w-full" style={{ background: 'linear-gradient(180deg, color-mix(in oklab, var(--wave) 45%, transparent), color-mix(in oklab, var(--wave) 70%, transparent))' }} />
      </div>
      <div className="relative z-10 flex h-full flex-col justify-between p-4">
        <div className="eyebrow text-wave-ink">{title}</div>
        <div>
          <div className="num text-[28px] font-bold leading-none tracking-[-0.02em] text-ink">{value}</div>
          {caption && <div className="mt-1.5 max-w-[95%] text-[12.5px] font-medium text-ink-2">{caption}</div>}
        </div>
      </div>
    </div>
  );
}

/** Sealed bids: envelopes arrive, prices stay hidden until close, every view is logged. */
export function SealedVault({ count, closesText, className, dark }: { count: number; closesText: string; className?: string; dark?: boolean }) {
  const tr = useT();
  const shown = Math.min(count, 7);
  return (
    <div className={cn('rounded-[18px] p-4', dark ? 'bg-night-2 text-white' : 'border border-line bg-surface', className)}>
      <div className="flex items-center gap-3">
        <div className={cn('grid h-11 w-11 place-items-center rounded-[14px]', dark ? 'bg-white/10' : 'bg-brand-soft text-brand')}><Lock className="h-5 w-5" /></div>
        <div className="min-w-0">
          <div className="text-[15px] font-bold">{count === 0 ? tr('No sealed bids yet') : count === 1 ? tr('1 sealed bid') : tr('{n} sealed bids', { n: count })}</div>
          <div className={cn('text-[12.5px]', dark ? 'text-white/60' : 'text-ink-3')}>{tr('Prices hidden from everyone until {t}', { t: closesText })}</div>
        </div>
      </div>
      {count > 0 && (
        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: shown }).map((_, i) => (
            <div key={i} className={cn('rise relative h-10 flex-1 rounded-[8px]', dark ? 'bg-white/10' : 'bg-surface-3')} style={{ animationDelay: `${i * 70}ms` }}>
              <svg viewBox="0 0 40 26" className="absolute inset-0 h-full w-full p-1.5" aria-hidden="true">
                <path d="M2 4 L20 15 L38 4" fill="none" stroke={dark ? 'rgba(255,255,255,.55)' : 'var(--ink-3)'} strokeWidth="2" />
              </svg>
              <span className={cn('absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full', dark ? 'bg-[#7ff0e6]' : 'bg-brand')} />
            </div>
          ))}
          {count > shown && <div className={cn('grid h-10 w-10 place-items-center rounded-[8px] text-[12px] font-bold', dark ? 'bg-white/10' : 'bg-surface-3 text-ink-2')}>+{count - shown}</div>}
        </div>
      )}
      <div className={cn('mt-3 flex items-center gap-1.5 text-[11.5px] font-medium', dark ? 'text-white/55' : 'text-ink-3')}>
        <ShieldCheck className="h-3.5 w-3.5" /> {tr('Sellers never see each other’s bids. Every view is logged.')}
      </div>
    </div>
  );
}

export interface RibbonStep {
  label: string;
  sub: string;
  amount?: number;
  state: 'done' | 'current' | 'todo';
}
/** Where the buyer's money is right now. */
export function MoneyRibbon({ steps, className }: { steps: RibbonStep[]; className?: string }) {
  return (
    <div className={cn('grid gap-1.5', className)} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0,1fr))` }}>
      {steps.map((s, i) => (
        <div key={i} className="min-w-0">
          <div className={cn('h-1.5 rounded-full', s.state === 'done' ? 'bg-save' : s.state === 'current' ? 'bg-brand' : 'bg-line')} />
          <div className={cn('mt-2 text-[11.5px] font-bold leading-tight', s.state === 'todo' ? 'text-ink-3' : 'text-ink')}>{s.label}</div>
          <div className="mt-0.5 text-[10.5px] leading-tight text-ink-3">{s.sub}</div>
          {s.amount !== undefined && <div className="num mt-1 text-[12px] font-bold text-ink-2">{inr(s.amount)}</div>}
        </div>
      ))}
    </div>
  );
}

/** Schematic map of Hyderabad localities (not to scale) with pools as bubbles. */
export const LOCALITIES: Record<string, [number, number]> = {
  Medchal: [258, 22], Kompally: [236, 48], Jeedimetla: [200, 66], Miyapur: [104, 78], KPHB: [140, 96], Kukatpally: [160, 108], Chandanagar: [84, 92], Lingampally: [58, 128],
  Kondapur: [122, 150], 'Hitech City': [146, 154], Madhapur: [160, 164], Gachibowli: [100, 178], 'Lakeview Heights': [86, 196], Kokapet: [52, 196], Manikonda: [122, 212], 'Jubilee Hills': [196, 178],
  'Banjara Hills': [218, 196], Ameerpet: [222, 152], Begumpet: [252, 140], Secunderabad: [296, 128], Tolichowki: [176, 216], Mehdipatnam: [210, 222], Koti: [270, 214], Charminar: [266, 252], Dilsukhnagar: [328, 232], Uppal: [352, 168],
};
export const PIN_AREA: Record<string, string> = {
  '500032': 'Gachibowli', '500084': 'Kondapur', '500081': 'Madhapur', '500089': 'Manikonda', '500019': 'Lingampally', '500075': 'Kokapet', '500033': 'Jubilee Hills', '500072': 'Kukatpally', '500049': 'Miyapur', '500050': 'Chandanagar', '500085': 'KPHB', '500100': 'Kompally', '501401': 'Medchal', '500055': 'Jeedimetla',
};

export interface MapBubble {
  id: string;
  area: string;
  value: number;
  label: string;
  tone: 'brand' | 'wave' | 'warn';
  onClick?: () => void;
}

export function CityMap({ bubbles, className, dark, highlight }: { bubbles: MapBubble[]; className?: string; dark?: boolean; highlight?: string }) {
  const max = Math.max(1, ...bubbles.map((b) => b.value));
  const col = { brand: 'var(--brand)', wave: 'var(--wave)', warn: 'var(--warn)' };
  const fg = dark ? 'rgba(255,255,255,.55)' : 'var(--ink-3)';
  return (
    <div className={cn('relative overflow-hidden rounded-[20px]', dark ? 'bg-night-2' : 'border border-line bg-surface', className)}>
      <svg viewBox="0 0 400 280" className="block h-full w-full" role="img" aria-label="Schematic map of Hyderabad with live pools">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0H0V20" fill="none" stroke={dark ? 'rgba(255,255,255,.05)' : 'var(--line)'} strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="280" fill="url(#grid)" />
        <ellipse cx="200" cy="148" rx="168" ry="122" fill="none" stroke={dark ? 'rgba(127,240,230,.25)' : 'color-mix(in oklab, var(--wave) 40%, transparent)'} strokeWidth="3" strokeDasharray="2 6" strokeLinecap="round" />
        <text x="40" y="38" fontSize="9" fill={fg} fontFamily="Google Sans, sans-serif">Outer Ring Road</text>
        <ellipse cx="244" cy="166" rx="16" ry="10" fill={dark ? 'rgba(127,200,255,.25)' : 'color-mix(in oklab, var(--brand) 18%, transparent)'} />
        <text x="244" y="188" fontSize="8" fill={fg} textAnchor="middle" fontFamily="Google Sans, sans-serif">Hussain Sagar</text>
        <path d="M58 128 L122 150 L160 164 L222 152 L296 128" fill="none" stroke={dark ? 'rgba(255,255,255,.12)' : 'var(--line-2)'} strokeWidth="2" />
        <path d="M104 78 L160 108 L222 152 L266 252" fill="none" stroke={dark ? 'rgba(255,255,255,.12)' : 'var(--line-2)'} strokeWidth="2" />
        {Object.entries(LOCALITIES).map(([name, [x, y]]) => (
          <g key={name}>
            <circle cx={x} cy={y} r="2" fill={fg} />
            <text x={x + 5} y={y + 3} fontSize="8.5" fill={fg} fontFamily="Google Sans, sans-serif">{name}</text>
          </g>
        ))}
        {bubbles.map((b) => {
          const pos = LOCALITIES[b.area];
          if (!pos) return null;
          const r = 7 + Math.sqrt(b.value / max) * 17;
          const c = col[b.tone];
          const hl = highlight === b.id;
          return (
            <g key={b.id} onClick={b.onClick} style={{ cursor: b.onClick ? 'pointer' : 'default' }}>
              <circle cx={pos[0]} cy={pos[1]} r={r} fill={c} opacity={hl ? 0.35 : 0.18} />
              <circle cx={pos[0]} cy={pos[1]} r={Math.max(6, r * 0.55)} fill={c} opacity={0.9} />
              <text x={pos[0]} y={pos[1] + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#fff" fontFamily="Google Sans, sans-serif">{b.value}</text>
              <title>{b.label}</title>
            </g>
          );
        })}
      </svg>
      <div className={cn('absolute bottom-2 right-3 text-[10px]', dark ? 'text-white/40' : 'text-ink-3')}>Schematic · not to scale</div>
    </div>
  );
}

/** Tiny sparkline of 30 days of outside prices with the 30-day low marked. */
export function Sparkline({ values, className, height = 40 }: { values: number[]; className?: string; height?: number }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const w = 160;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, height - 4 - ((v - min) / Math.max(1, max - min)) * (height - 10)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const lowIdx = values.lastIndexOf(min);
  const [lx, ly] = pts[lowIdx];
  const [ex, ey] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cn('block w-full', className)} style={{ height }} aria-hidden="true">
      <path d={`${d} L${w} ${height} L0 ${height}Z`} fill="color-mix(in oklab, var(--brand) 10%, transparent)" />
      <path d={d} fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="3" fill="var(--save)" />
      <circle cx={ex} cy={ey} r="3.2" fill="var(--brand)" stroke="var(--surface)" strokeWidth="1.5" />
    </svg>
  );
}
