import { cn } from '../lib/cn';
import type { ArtKey } from '../sim/types';

/** Flat illustrations for sample products (no real product photos are used in the demo). */
const HUE: Record<ArtKey, string> = {
  tv: '#3b5bff', ac: '#0ea5b7', washer: '#6d5bd0', fridge: '#2f80ed', mixer: '#e8553d', rice: '#c98a10', oil: '#d69a00', mutton: '#d9485f', cement: '#7a7f8c',
  books: '#8b5cf6', cleaning: '#12a37a', laptop: '#4b5b73', fan: '#0f9d8f', purifier: '#2da0c9', geyser: '#e07a1f', chimney: '#5b6b82', waterpurifier: '#1e9bd7',
};

export function artHue(a: ArtKey) {
  return HUE[a];
}

export function ProductArt({ art, size = 64, className, rounded = 16 }: { art: ArtKey; size?: number | string; className?: string; rounded?: number }) {
  const h = HUE[art];
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden', className)}
      style={{ width: size, height: size, borderRadius: rounded, background: `linear-gradient(150deg, color-mix(in oklab, ${h} 20%, var(--surface)) 0%, color-mix(in oklab, ${h} 9%, var(--surface)) 100%)` }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <Art art={art} h={h} />
      </svg>
    </div>
  );
}

function Art({ art, h }: { art: ArtKey; h: string }) {
  const W = '#ffffff';
  const ink = '#0d1424';
  const soft = `color-mix(in oklab, ${h} 35%, white)`;
  switch (art) {
    case 'tv':
      return (
        <g>
          <rect x="16" y="26" width="88" height="54" rx="6" fill={ink} />
          <rect x="20" y="30" width="80" height="46" rx="3" fill={h} />
          <path d="M20 66 L44 48 L58 60 L72 46 L100 70 L100 76 L20 76Z" fill={soft} opacity=".8" />
          <circle cx="82" cy="42" r="5" fill={W} opacity=".85" />
          <rect x="52" y="80" width="16" height="8" fill={ink} />
          <rect x="38" y="88" width="44" height="5" rx="2.5" fill={ink} />
        </g>
      );
    case 'ac':
      return (
        <g>
          <rect x="14" y="38" width="92" height="34" rx="10" fill={W} />
          <rect x="14" y="38" width="92" height="34" rx="10" fill="none" stroke={h} strokeWidth="2.5" />
          <rect x="22" y="60" width="76" height="4" rx="2" fill={h} opacity=".5" />
          <circle cx="94" cy="47" r="2.5" fill={h} />
          <path d="M34 82 q6 6 0 12 M54 82 q6 6 0 12 M74 82 q6 6 0 12" stroke={h} strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'washer':
      return (
        <g>
          <rect x="26" y="18" width="68" height="86" rx="9" fill={W} stroke={h} strokeWidth="2.5" />
          <rect x="26" y="18" width="68" height="16" rx="8" fill={h} opacity=".18" />
          <circle cx="40" cy="26" r="3" fill={h} />
          <circle cx="50" cy="26" r="3" fill={h} opacity=".5" />
          <circle cx="60" cy="68" r="24" fill={h} />
          <circle cx="60" cy="68" r="17" fill={soft} />
          <path d="M45 72 q8 -7 15 0 t15 0" stroke={W} strokeWidth="3" fill="none" />
        </g>
      );
    case 'fridge':
      return (
        <g>
          <rect x="32" y="12" width="56" height="96" rx="9" fill={W} stroke={h} strokeWidth="2.5" />
          <line x1="32" y1="46" x2="88" y2="46" stroke={h} strokeWidth="2.5" />
          <rect x="78" y="22" width="4" height="16" rx="2" fill={h} />
          <rect x="78" y="56" width="4" height="22" rx="2" fill={h} />
          <rect x="40" y="96" width="40" height="5" rx="2.5" fill={h} opacity=".2" />
        </g>
      );
    case 'mixer':
      return (
        <g>
          <path d="M42 22 h36 l-5 46 h-26z" fill={soft} stroke={h} strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="40" y="16" width="40" height="8" rx="3" fill={h} />
          <rect x="34" y="68" width="52" height="34" rx="8" fill={h} />
          <circle cx="60" cy="85" r="7" fill={W} />
          <path d="M60 81 v4" stroke={h} strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'rice':
      return (
        <g>
          <path d="M30 30 q30 -14 60 0 l6 64 q-36 14 -72 0z" fill="#f6ead2" stroke={h} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M40 26 q20 -10 40 0" stroke={h} strokeWidth="3" fill="none" />
          <rect x="38" y="52" width="44" height="26" rx="4" fill={h} />
          <text x="60" y="70" textAnchor="middle" fontSize="12" fontWeight="700" fill={W} fontFamily="Google Sans, sans-serif">26 kg</text>
          {[0, 1, 2, 3, 4].map((i) => (
            <ellipse key={i} cx={44 + i * 8} cy={90 + (i % 2) * 3} rx="2.4" ry="1.4" fill={h} opacity=".55" />
          ))}
        </g>
      );
    case 'oil':
      return (
        <g>
          <rect x="30" y="30" width="60" height="74" rx="6" fill={h} />
          <rect x="44" y="18" width="18" height="14" rx="3" fill={ink} opacity=".8" />
          <path d="M70 24 h14 v10 h-14" fill="none" stroke={ink} strokeWidth="4" strokeLinejoin="round" opacity=".8" />
          <rect x="38" y="52" width="44" height="30" rx="4" fill={W} />
          <path d="M60 58 c-6 8 -6 12 0 16 c6 -4 6 -8 0 -16z" fill={h} />
        </g>
      );
    case 'mutton':
      return (
        <g>
          <path d="M28 62 c0 -22 22 -36 44 -30 c16 4 24 18 20 32 c-4 16 -22 24 -38 22 c-14 -2 -26 -10 -26 -24z" fill={h} />
          <path d="M40 60 c6 -10 22 -16 34 -10" stroke={soft} strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="72" cy="66" r="7" fill="#fbe4e8" />
          <rect x="84" y="78" width="22" height="8" rx="4" transform="rotate(35 84 78)" fill="#f3efe7" stroke="#d6cfc2" strokeWidth="1.5" />
        </g>
      );
    case 'cement':
      return (
        <g>
          <path d="M24 34 h72 l-4 66 h-64z" fill="#d9dbe0" stroke={h} strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="24" y="52" width="72" height="22" fill={h} />
          <text x="60" y="67" textAnchor="middle" fontSize="11" fontWeight="700" fill={W} fontFamily="Google Sans, sans-serif">OPC 53</text>
          <path d="M24 34 q36 -10 72 0" stroke={h} strokeWidth="2.5" fill="none" />
        </g>
      );
    case 'books':
      return (
        <g>
          <rect x="22" y="78" width="76" height="14" rx="3" fill={h} />
          <rect x="28" y="62" width="66" height="14" rx="3" fill={soft} stroke={h} strokeWidth="2" />
          <rect x="24" y="46" width="70" height="14" rx="3" fill="#f4b740" />
          <rect x="30" y="30" width="60" height="14" rx="3" fill={h} opacity=".7" />
          <line x1="34" y1="85" x2="60" y2="85" stroke={W} strokeWidth="2.5" />
        </g>
      );
    case 'cleaning':
      return (
        <g>
          <rect x="44" y="44" width="34" height="60" rx="9" fill={h} />
          <rect x="50" y="30" width="18" height="16" rx="3" fill={ink} opacity=".8" />
          <path d="M68 34 h16 l4 6 h-20" fill={ink} opacity=".8" />
          <rect x="50" y="62" width="22" height="22" rx="4" fill={W} />
          <path d="M28 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#f4b740" />
          <path d="M92 58 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#f4b740" />
        </g>
      );
    case 'laptop':
      return (
        <g>
          <rect x="24" y="28" width="72" height="48" rx="5" fill={ink} />
          <rect x="28" y="32" width="64" height="40" rx="2" fill={h} />
          <path d="M28 62 l18 -14 12 9 14 -12 20 17 v10 h-64z" fill={soft} opacity=".8" />
          <path d="M14 80 h92 l-6 10 h-80z" fill="#c9d1de" />
          <rect x="50" y="80" width="20" height="3" rx="1.5" fill={ink} opacity=".3" />
        </g>
      );
    case 'fan':
      return (
        <g>
          <rect x="58" y="14" width="4" height="22" fill={ink} opacity=".7" />
          <ellipse cx="60" cy="62" rx="44" ry="10" fill={h} opacity=".25" />
          <path d="M60 58 C40 52 22 54 16 60 C24 66 42 66 60 62z" fill={h} />
          <path d="M60 58 C80 52 98 54 104 60 C96 66 78 66 60 62z" fill={h} opacity=".75" />
          <circle cx="60" cy="58" r="10" fill={W} stroke={h} strokeWidth="3" />
          <rect x="52" y="34" width="16" height="16" rx="5" fill={ink} opacity=".7" />
        </g>
      );
    case 'purifier':
      return (
        <g>
          <rect x="34" y="16" width="52" height="90" rx="14" fill={W} stroke={h} strokeWidth="2.5" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={i} x1="44" y1={42 + i * 9} x2="76" y2={42 + i * 9} stroke={h} strokeWidth="3" strokeLinecap="round" opacity=".6" />
          ))}
          <circle cx="60" cy="28" r="5" fill={h} />
        </g>
      );
    case 'geyser':
      return (
        <g>
          <rect x="34" y="18" width="52" height="78" rx="22" fill={W} stroke={h} strokeWidth="2.5" />
          <circle cx="60" cy="50" r="10" fill={h} opacity=".2" />
          <path d="M60 42 c-5 7 -5 11 0 15 c5 -4 5 -8 0 -15z" fill={h} />
          <path d="M50 96 v12 M70 96 v12" stroke={ink} strokeWidth="4" strokeLinecap="round" opacity=".6" />
        </g>
      );
    case 'chimney':
      return (
        <g>
          <rect x="50" y="10" width="20" height="40" fill={W} stroke={h} strokeWidth="2.5" />
          <path d="M22 76 l20 -26 h36 l20 26z" fill={h} />
          <rect x="22" y="76" width="76" height="8" rx="2" fill={ink} opacity=".75" />
          <path d="M40 98 q4 -6 0 -10 M60 98 q4 -6 0 -10 M80 98 q4 -6 0 -10" stroke={h} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".6" />
        </g>
      );
    case 'waterpurifier':
      return (
        <g>
          <rect x="30" y="16" width="60" height="80" rx="10" fill={W} stroke={h} strokeWidth="2.5" />
          <rect x="38" y="28" width="44" height="34" rx="6" fill={h} opacity=".15" />
          <path d="M60 32 c-8 11 -8 17 0 22 c8 -5 8 -11 0 -22z" fill={h} />
          <rect x="50" y="70" width="20" height="8" rx="2" fill={ink} opacity=".7" />
          <path d="M60 78 v14" stroke={h} strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    default:
      return <circle cx="60" cy="60" r="30" fill={h} />;
  }
}
