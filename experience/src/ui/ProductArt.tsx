import { useId, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import type { ArtKey } from '../sim/types';

/**
 * Studio renders for the demo's sample products. No real product photos or brand marks are used.
 * One light (top left), one floor shadow, real depth (front, side and top faces) so every product reads as an object.
 */
const HUE: Record<ArtKey, string> = {
  tv: '#3b5bff', ac: '#0ea5b7', washer: '#5b6cff', fridge: '#5d7590', mixer: '#e8553d', rice: '#c98a10', oil: '#d69a00', mutton: '#c8463f', cement: '#7a7f8c',
  books: '#7c5cf0', cleaning: '#12a37a', laptop: '#5468ff', fan: '#0f9d8f', purifier: '#2da0c9', geyser: '#e07a1f', chimney: '#5b6b82', waterpurifier: '#1e9bd7',
  scooter: '#ff5a36', solar: '#f5a400', phone: '#7a5cff',
};

export function artHue(a: ArtKey) {
  return HUE[a];
}

// ---------------------------------------------------------------- colour helpers (plain hex math: works in every browser and in SVG)
function hex2rgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hex2rgb(a);
  const [r2, g2, b2] = hex2rgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}
const L = (h: string, t: number) => mix(h, '#ffffff', t);
const D = (h: string, t: number) => mix(h, '#000000', t);

export function ProductArt({ art, size = 64, className, rounded = 18, stage = 'soft' }: { art: ArtKey; size?: number | string; className?: string; rounded?: number; stage?: 'soft' | 'none' | 'night' }) {
  const h = HUE[art];
  const uid = useId().replace(/:/g, '');
  const bg =
    stage === 'none'
      ? undefined
      : stage === 'night'
        ? `radial-gradient(110% 90% at 30% 10%, ${D(h, 0.35)} 0%, ${D(h, 0.78)} 70%)`
        : `radial-gradient(120% 100% at 28% 8%, color-mix(in oklab, ${h} 24%, var(--surface)) 0%, color-mix(in oklab, ${h} 9%, var(--surface)) 72%)`;
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden', className)}
      style={{ width: size, height: size, borderRadius: rounded, background: bg, boxShadow: stage === 'soft' ? `inset 0 1px 0 rgb(255 255 255 / 0.55), inset 0 0 0 1px color-mix(in oklab, ${h} 12%, transparent)` : undefined }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={`${uid}sh`}>
            <stop offset="0" stopColor="#0b0f1a" stopOpacity=".34" />
            <stop offset="1" stopColor="#0b0f1a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}gloss`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".55" />
            <stop offset=".45" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <Art art={art} h={h} p={uid} />
      </svg>
    </div>
  );
}

/** Linear gradient from a list of [offset, colour]. Vertical unless told otherwise. */
function G({ id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1 }: { id: string; stops: Array<[number, string, number?]>; x1?: number; y1?: number; x2?: number; y2?: number }) {
  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
      {stops.map(([o, c, a], i) => (
        <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />
      ))}
    </linearGradient>
  );
}
const Floor = ({ p, cx = 60, cy = 106, rx = 38, ry = 6 }: { p: string; cx?: number; cy?: number; rx?: number; ry?: number }) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${p}sh)`} />;

function Art({ art, h, p }: { art: ArtKey; h: string; p: string }): ReactNode {
  const id = (k: string) => `${p}${k}`;
  const u = (k: string) => `url(#${p}${k})`;
  switch (art) {
    // ------------------------------------------------------------------------------------ TV
    case 'tv':
      return (
        <g>
          <defs>
            <G id={id('scr')} stops={[[0, D(h, 0.55)], [0.55, h], [1, '#ff6fb1']]} x2={1} y2={1} />
            <G id={id('hill')} stops={[[0, L(h, 0.35)], [1, D(h, 0.35)]]} />
            <G id={id('stand')} stops={[[0, '#d5dae3'], [1, '#7d8696']]} />
          </defs>
          <Floor p={p} cy={101} rx={34} ry={5} />
          <rect x="12" y="20" width="96" height="60" rx="3.5" fill="#0c0f16" />
          <rect x="14" y="22" width="92" height="56" rx="2" fill={u('scr')} />
          <circle cx="84" cy="38" r="7" fill="#ffd6a8" opacity=".95" />
          <path d="M14 66 C30 52 42 56 54 62 S80 50 106 60 V78 H14Z" fill={u('hill')} opacity=".9" />
          <path d="M14 72 C34 64 50 70 66 70 S92 64 106 70 V78 H14Z" fill={D(h, 0.55)} opacity=".85" />
          <path d="M14 22 L58 22 L32 78 L14 78Z" fill="#fff" opacity=".09" />
          <rect x="12" y="20" width="96" height="60" rx="3.5" fill="none" stroke="#2a2f3b" strokeWidth=".8" />
          <path d="M50 80 h20 l3 14 h-26z" fill={u('stand')} />
          <rect x="34" y="93" width="52" height="4" rx="2" fill={u('stand')} />
        </g>
      );
    // ------------------------------------------------------------------------------------ AC
    case 'ac':
      return (
        <g>
          <defs>
            <G id={id('body')} stops={[[0, '#ffffff'], [0.7, '#eef1f6'], [1, '#c9d0db']]} />
            <G id={id('air')} stops={[[0, h, 0.9], [1, h, 0]]} />
          </defs>
          <rect x="10" y="34" width="100" height="38" rx="13" fill="#0b0f1a" opacity=".07" transform="translate(2 3)" />
          <rect x="10" y="32" width="100" height="38" rx="13" fill={u('body')} />
          <rect x="10" y="32" width="100" height="38" rx="13" fill="none" stroke="#b8c1cf" strokeWidth=".8" />
          <path d="M16 40 Q60 34 104 40" stroke="#fff" strokeWidth="2" fill="none" opacity=".9" />
          <rect x="20" y="58" width="80" height="7" rx="3.5" fill="#202633" />
          <rect x="22" y="59.5" width="76" height="3" rx="1.5" fill="#3a4152" />
          <text x="94" y="50" textAnchor="end" fontSize="7.5" fontWeight="700" fill={h} fontFamily="Google Sans Flex, sans-serif">24°</text>
          <circle cx="98" cy="47.5" r="1.4" fill={h} />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${30 + i * 18} 72 q-5 9 2 16 q6 6 0 14`} stroke={u('air')} strokeWidth="3" fill="none" strokeLinecap="round" />
          ))}
        </g>
      );
    // ------------------------------------------------------------------------------------ Washer
    case 'washer':
      return (
        <g>
          <defs>
            <G id={id('fr')} stops={[[0, '#ffffff'], [1, '#e3e7ee']]} />
            <G id={id('sd')} stops={[[0, '#c9cfd9'], [1, '#aab2bf']]} />
            <G id={id('ring')} stops={[[0, '#f4f6f9'], [0.5, '#9aa3b2'], [1, '#e8ebf0']]} x2={1} y2={1} />
            <G id={id('water')} stops={[[0, L(h, 0.55)], [1, D(h, 0.25)]]} />
          </defs>
          <Floor p={p} cy={107} rx={40} />
          <path d="M86 24 L96 18 V96 L86 103Z" fill={u('sd')} />
          <path d="M26 24 L36 18 H96 L86 24Z" fill="#f7f9fb" />
          <rect x="26" y="24" width="60" height="79" rx="3" fill={u('fr')} />
          <rect x="26" y="24" width="60" height="16" fill="#eef1f5" />
          <rect x="31" y="28.5" width="20" height="7" rx="2" fill="#141925" />
          <text x="41" y="34" textAnchor="middle" fontSize="5" fontWeight="700" fill="#3eead9" fontFamily="Google Sans Flex, sans-serif">0:45</text>
          <circle cx="76" cy="32" r="4.6" fill={u('ring')} stroke="#9aa3b2" strokeWidth=".6" />
          <circle cx="56" cy="70" r="22" fill={u('ring')} />
          <circle cx="56" cy="70" r="17.5" fill="#262c38" />
          <circle cx="56" cy="70" r="15.5" fill={u('water')} />
          <path d="M42 74 q7 -9 14 -2 t14 -3 v16 h-28z" fill={D(h, 0.3)} opacity=".55" />
          <circle cx="50" cy="64" r="2" fill="#fff" opacity=".7" />
          <circle cx="62" cy="61" r="1.3" fill="#fff" opacity=".6" />
          <circle cx="58" cy="77" r="1.6" fill="#fff" opacity=".5" />
          <path d="M44 60 A15.5 15.5 0 0 1 64 56" stroke="#fff" strokeWidth="2.2" fill="none" opacity=".55" strokeLinecap="round" />
        </g>
      );
    // ------------------------------------------------------------------------------------ Fridge
    case 'fridge': {
      const steel = L(h, 0.72);
      return (
        <g>
          <defs>
            <G id={id('fr')} stops={[[0, L(h, 0.86)], [0.5, steel], [1, L(h, 0.6)]]} x2={1} y2={0} />
            <G id={id('sd')} stops={[[0, L(h, 0.45)], [1, L(h, 0.3)]]} />
            <G id={id('hd')} stops={[[0, '#ffffff'], [1, '#8d97a6']]} x2={1} y2={0} />
          </defs>
          <Floor p={p} cy={109} rx={32} />
          <path d="M82 13 L91 8 V100 L82 106Z" fill={u('sd')} />
          <path d="M33 13 L42 8 H91 L82 13Z" fill={L(h, 0.9)} />
          <rect x="33" y="13" width="49" height="93" rx="3" fill={u('fr')} />
          <rect x="33" y="45" width="49" height="1.6" fill={D(h, 0.25)} opacity=".5" />
          <rect x="73" y="19" width="3.2" height="20" rx="1.6" fill={u('hd')} />
          <rect x="73" y="51" width="3.2" height="30" rx="1.6" fill={u('hd')} />
          <rect x="39" y="22" width="14" height="8" rx="2" fill="#141925" />
          <text x="46" y="28" textAnchor="middle" fontSize="5.4" fontWeight="700" fill="#3eead9" fontFamily="Google Sans Flex, sans-serif">4°</text>
          <path d="M36 16 L48 16 L40 104 L36 104Z" fill="#fff" opacity=".22" />
        </g>
      );
    }
    // ------------------------------------------------------------------------------------ Mixer grinder
    case 'mixer':
      return (
        <g>
          <defs>
            <G id={id('base')} stops={[[0, L(h, 0.25)], [0.6, h], [1, D(h, 0.3)]]} x2={1} y2={1} />
            <G id={id('jar')} stops={[[0, '#ffffff', 0.75], [1, '#dfe7f0', 0.5]]} x2={1} y2={0} />
            <G id={id('knob')} stops={[[0, '#ffffff'], [1, '#9aa3b2']]} x2={1} y2={1} />
          </defs>
          <Floor p={p} cy={107} rx={32} />
          <path d="M34 74 H86 L92 103 H28Z" fill={u('base')} />
          <path d="M34 74 H86 L87 79 H33Z" fill="#fff" opacity=".25" />
          <circle cx="60" cy="90" r="8" fill={u('knob')} />
          <path d="M60 85 v4" stroke={D(h, 0.4)} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M42 24 H78 L72 72 H48Z" fill={u('jar')} stroke="#c7d1de" strokeWidth="1" />
          <path d="M45 52 H75 L72 72 H48Z" fill="#f2dcae" opacity=".95" />
          <path d="M78 32 q10 2 9 14 q-1 10 -11 12" fill="none" stroke="#c7d1de" strokeWidth="3" />
          <rect x="39" y="17" width="42" height="9" rx="3" fill="#232937" />
          <path d="M47 28 L50 66" stroke="#fff" strokeWidth="2.4" opacity=".8" strokeLinecap="round" />
        </g>
      );
    // ------------------------------------------------------------------------------------ Rice sack (26 kg)
    case 'rice':
      return (
        <g>
          <defs>
            <G id={id('sack')} stops={[[0, '#fbf3e1'], [1, '#e2cfa6']]} x2={1} y2={1} />
            <G id={id('lab')} stops={[[0, L(h, 0.1)], [1, D(h, 0.25)]]} />
          </defs>
          <Floor p={p} cy={107} rx={40} />
          <path d="M26 30 Q60 18 94 30 L100 96 Q60 110 20 96Z" fill={u('sack')} />
          {Array.from({ length: 9 }).map((_, i) => (
            <path key={i} d={`M${24 + i * 0.3} ${38 + i * 7} Q60 ${30 + i * 7} ${96 - i * 0.2} ${38 + i * 7}`} stroke="#b89c66" strokeWidth=".5" fill="none" opacity=".35" />
          ))}
          <path d="M28 32 Q60 21 92 32" stroke="#8a6d3b" strokeWidth="1.4" strokeDasharray="2.5 2" fill="none" />
          <rect x="30" y="46" width="60" height="38" rx="5" fill={u('lab')} />
          <text x="60" y="57.5" textAnchor="middle" fontSize="5.2" fontWeight="700" letterSpacing=".5" fill="#fff" fontFamily="Google Sans Flex, sans-serif">SONA MASOORI</text>
          <text x="60" y="76" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" fontFamily="Google Sans Flex, sans-serif">26 kg</text>
          {[[28, 102], [36, 105], [46, 103], [86, 103], [93, 101], [78, 106]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx="2.4" ry="1.1" fill="#fffaf0" stroke="#d8c6a0" strokeWidth=".4" transform={`rotate(${i * 37} ${x} ${y})`} />
          ))}
        </g>
      );
    // ------------------------------------------------------------------------------------ Oil tin (15 L)
    case 'oil':
      return (
        <g>
          <defs>
            <G id={id('fr')} stops={[[0, L(h, 0.45)], [0.5, h], [1, D(h, 0.15)]]} x2={1} y2={0} />
            <G id={id('sd')} stops={[[0, D(h, 0.2)], [1, D(h, 0.38)]]} />
          </defs>
          <Floor p={p} cy={107} rx={34} />
          <path d="M80 32 L90 26 V98 L80 104Z" fill={u('sd')} />
          <path d="M32 32 L42 26 H90 L80 32Z" fill={L(h, 0.55)} />
          <rect x="32" y="32" width="48" height="72" rx="2" fill={u('fr')} />
          <path d="M44 26 q12 -16 26 -4" stroke="#3b4150" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <ellipse cx="74" cy="27" rx="5" ry="2.2" fill="#2b303c" />
          <rect x="69" y="21" width="10" height="6" rx="1.5" fill="#3b4150" />
          <rect x="37" y="50" width="38" height="38" rx="4" fill="#fffaf0" />
          <path d="M56 56 c-7 9 -7 14 0 18 c7 -4 7 -9 0 -18z" fill={h} />
          <text x="56" y="84" textAnchor="middle" fontSize="7" fontWeight="800" fill={D(h, 0.45)} fontFamily="Google Sans Flex, sans-serif">15 L</text>
          <path d="M35 34 H44 L38 102 H35Z" fill="#fff" opacity=".25" />
        </g>
      );
    // ------------------------------------------------------------------------------------ Meat parcel (butcher paper, tied)
    case 'mutton':
      return (
        <g>
          <Floor p={p} cy={102} rx={40} />
          <path d="M20 58 L60 42 L100 58 L60 74Z" fill="#e7c79d" />
          <path d="M20 58 L60 74 V96 L20 80Z" fill="#c99d6b" />
          <path d="M60 74 L100 58 V80 L60 96Z" fill="#b28554" />
          <path d="M40 50 L80 66 M80 50 L40 66" stroke={h} strokeWidth="2" />
          <path d="M40 66 V88 M80 66 V88" stroke={D(h, 0.15)} strokeWidth="2" />
          <path d="M60 58 q-9 -9 -14 -3 q2 6 14 3 q9 -9 14 -3 q-2 6 -14 3" fill={h} />
          <rect x="66" y="66" width="20" height="12" rx="2" fill="#fffaf0" transform="rotate(-21 76 72)" />
          <path d="M70 71 h12 M70 74.5 h8" stroke="#8d97a6" strokeWidth="1" transform="rotate(-21 76 72)" />
          <path d="M26 40 q6 -10 16 -8 q-4 8 -16 8z" fill="#2fae6b" />
          <path d="M26 40 q8 -4 14 -7" stroke="#1f7a4a" strokeWidth=".8" fill="none" />
        </g>
      );
    // ------------------------------------------------------------------------------------ Cement bags
    case 'cement':
      return (
        <g>
          <defs>
            <G id={id('bag')} stops={[[0, '#eceef2'], [1, '#c4c8d0']]} />
          </defs>
          <Floor p={p} cy={106} rx={42} />
          <path d="M30 30 Q60 24 94 30 L98 66 Q62 72 26 66Z" fill={u('bag')} opacity=".85" />
          <path d="M20 52 Q58 46 92 52 L96 98 Q58 106 16 98Z" fill={u('bag')} />
          <rect x="18" y="66" width="76" height="16" fill={h} />
          <text x="56" y="77.5" textAnchor="middle" fontSize="9" fontWeight="800" letterSpacing=".6" fill="#fff" fontFamily="Google Sans Flex, sans-serif">OPC 53</text>
          <path d="M22 54 Q58 48 90 54" stroke="#fff" strokeWidth="1.5" fill="none" opacity=".8" />
          <text x="56" y="94" textAnchor="middle" fontSize="5.5" fontWeight="700" fill="#6b7387" fontFamily="Google Sans Flex, sans-serif">50 kg</text>
        </g>
      );
    // ------------------------------------------------------------------------------------ Books
    case 'books': {
      const book = (y: number, x: number, c: string, w = 66) => (
        <g>
          <path d={`M${x} ${y} L${x + w} ${y} L${x + w + 10} ${y - 8} L${x + 10} ${y - 8}Z`} fill={L(c, 0.15)} />
          <rect x={x} y={y} width={w} height="11" fill="#fbfaf6" />
          <path d={`M${x} ${y + 3.5} H${x + w} M${x} ${y + 7} H${x + w}`} stroke="#d9d4c6" strokeWidth=".6" />
          <rect x={x} y={y} width="6" height="11" fill={c} />
          <path d={`M${x + w} ${y} L${x + w + 10} ${y - 8} V${y + 3} L${x + w} ${y + 11}Z`} fill={D(c, 0.25)} />
        </g>
      );
      return (
        <g>
          <Floor p={p} cy={102} rx={42} />
          {book(88, 18, '#2fae6b')}
          {book(77, 24, '#f5a400', 62)}
          {book(66, 16, h, 68)}
          {book(55, 22, '#ff5a36', 62)}
          <circle cx="72" cy="42" r="10" fill={h} />
          <text x="72" y="45.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" fontFamily="Google Sans Flex, sans-serif">10</text>
        </g>
      );
    }
    // ------------------------------------------------------------------------------------ Cleaning
    case 'cleaning':
      return (
        <g>
          <defs>
            <G id={id('bot')} stops={[[0, L(h, 0.5), 0.9], [1, h, 0.95]]} x2={1} y2={0} />
          </defs>
          <Floor p={p} cy={106} rx={30} />
          <path d="M28 98 q4 -10 18 -8 l30 0 q12 0 14 8 z" fill="#3eead9" />
          <path d="M34 96 q14 -4 50 -2" stroke="#fff" strokeWidth="1" opacity=".6" fill="none" />
          <path d="M48 48 H70 Q76 52 76 62 V96 Q76 100 72 100 H46 Q42 100 42 96 V62 Q42 52 48 48Z" fill={u('bot')} />
          <path d="M44 74 H74 V96 Q74 98 72 98 H46 Q44 98 44 96Z" fill={D(h, 0.15)} opacity=".55" />
          <rect x="50" y="36" width="18" height="13" rx="3" fill="#f4f6f9" />
          <path d="M66 36 H84 L88 42 H66Z" fill="#f4f6f9" />
          <path d="M60 44 L56 60 L62 60" fill="#e3e7ee" />
          <rect x="49" y="62" width="20" height="14" rx="3" fill="#fff" opacity=".9" />
          <path d="M46 52 L48 94" stroke="#fff" strokeWidth="2" opacity=".55" strokeLinecap="round" />
          <path d="M96 26 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4z" fill="#ffb21e" />
          <path d="M24 44 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="#ffb21e" />
          <path d="M100 58 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2z" fill="#ffb21e" opacity=".8" />
        </g>
      );
    // ------------------------------------------------------------------------------------ Laptop
    case 'laptop':
      return (
        <g>
          <defs>
            <G id={id('scr')} stops={[[0, D(h, 0.4)], [0.6, h], [1, '#3eead9']]} x2={1} y2={1} />
            <G id={id('deck')} stops={[[0, '#eef1f5'], [1, '#b7bfcc']]} />
          </defs>
          <Floor p={p} cy={103} rx={46} ry={5} />
          <path d="M28 22 H92 L95 72 H25Z" fill="#141925" />
          <path d="M31 25 H89 L91.5 69 H28.5Z" fill={u('scr')} />
          <rect x="37" y="33" width="26" height="16" rx="2.5" fill="#fff" opacity=".85" />
          <rect x="66" y="33" width="20" height="30" rx="2.5" fill="#fff" opacity=".25" />
          <rect x="37" y="52" width="26" height="11" rx="2.5" fill="#fff" opacity=".35" />
          <path d="M31 25 H56 L40 69 H28.5Z" fill="#fff" opacity=".08" />
          <path d="M22 72 H98 L110 92 H10Z" fill={u('deck')} />
          {Array.from({ length: 4 }).map((_, r) => (
            <path key={r} d={`M${26 - r * 2.6} ${75.5 + r * 3.4} H${94 + r * 2.6}`} stroke="#8f98a8" strokeWidth="1.6" strokeDasharray="4.2 1.4" opacity=".55" />
          ))}
          <path d="M50 88 H70 L71 91 H49Z" fill="#a5adbb" />
          <path d="M10 92 H110 L108 95 H12Z" fill="#8f98a8" />
        </g>
      );
    // ------------------------------------------------------------------------------------ BLDC ceiling fan with remote
    case 'fan':
      return (
        <g>
          <defs>
            <G id={id('bl')} stops={[[0, L(h, 0.35)], [1, D(h, 0.25)]]} x2={1} y2={0} />
            <G id={id('mt')} stops={[[0, '#ffffff'], [1, '#aeb6c3']]} />
          </defs>
          <Floor p={p} cy={104} rx={40} ry={4} />
          <rect x="54" y="8" width="12" height="5" rx="2.5" fill={u('mt')} />
          <rect x="58.6" y="13" width="2.8" height="18" fill="#9aa3b2" />
          <path d="M60 44 C44 42 22 46 8 54 C26 56 46 52 60 48Z" fill={u('bl')} />
          <path d="M60 44 C76 40 98 40 112 44 C96 50 74 50 60 48Z" fill={u('bl')} opacity=".85" />
          <path d="M60 48 C66 56 72 68 74 80 C64 74 58 62 56 50Z" fill={u('bl')} />
          <ellipse cx="60" cy="44" rx="14" ry="5" fill={u('mt')} />
          <path d="M46 44 Q46 52 60 52 Q74 52 74 44" fill="#c3cad5" />
          <ellipse cx="60" cy="52" rx="5" ry="1.8" fill="#3eead9" opacity=".9" />
          <rect x="86" y="74" width="12" height="24" rx="4" fill="#1d2230" transform="rotate(12 92 86)" />
          <circle cx="91" cy="81" r="2" fill="#3eead9" transform="rotate(12 92 86)" />
          <path d="M88 88 h6 M88 92 h6" stroke="#5b6478" strokeWidth="1.6" strokeLinecap="round" transform="rotate(12 92 86)" />
        </g>
      );
    // ------------------------------------------------------------------------------------ Air purifier tower
    case 'purifier':
      return (
        <g>
          <defs>
            <G id={id('b')} stops={[[0, '#ffffff'], [0.65, '#eef1f5'], [1, '#c4ccd8']]} x2={1} y2={0} />
          </defs>
          <Floor p={p} cy={108} rx={26} />
          <rect x="38" y="14" width="44" height="92" rx="16" fill={u('b')} stroke="#ccd3dd" strokeWidth=".8" />
          <ellipse cx="60" cy="22" rx="16" ry="4.5" fill="#262c38" />
          <path d="M48 22 h24 M50 20 h20 M50 24 h20" stroke="#4a5265" strokeWidth=".7" />
          {Array.from({ length: 7 }).map((_, r) =>
            Array.from({ length: 6 }).map((__, c) => <circle key={`${r}-${c}`} cx={45 + c * 6} cy={58 + r * 6} r="1.15" fill="#9aa3b2" />),
          )}
          <circle cx="60" cy="40" r="7" fill="none" stroke={h} strokeWidth="2.2" />
          <circle cx="60" cy="40" r="3" fill={h} />
          <path d="M42 30 Q44 70 44 98" stroke="#fff" strokeWidth="2.4" opacity=".9" fill="none" strokeLinecap="round" />
        </g>
      );
    // ------------------------------------------------------------------------------------ Geyser (storage water heater)
    case 'geyser':
      return (
        <g>
          <defs>
            <G id={id('b')} stops={[[0, '#c7ced8'], [0.35, '#ffffff'], [1, '#bcc4cf']]} x2={1} y2={0} />
          </defs>
          <Floor p={p} cy={110} rx={26} />
          <rect x="36" y="12" width="48" height="84" rx="22" fill={u('b')} />
          <rect x="36" y="58" width="48" height="6" fill={h} />
          <circle cx="60" cy="40" r="11" fill="#f4f6f9" stroke="#c7ced8" />
          <path d="M60 33 c-5 7 -5 11 0 15 c5 -4 5 -8 0 -15z" fill={h} />
          <circle cx="60" cy="76" r="5" fill="#ffffff" stroke="#aeb6c3" />
          <path d="M60 72.5 v3" stroke="#4a5265" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="72" cy="76" r="1.6" fill="#2fae6b" />
          <path d="M50 96 v12 M70 96 v12" stroke="#8d97a6" strokeWidth="3.6" strokeLinecap="round" />
          <rect x="47.5" y="100" width="5" height="3" fill="#ff5a36" />
          <rect x="67.5" y="100" width="5" height="3" fill="#1f57ff" />
        </g>
      );
    // ------------------------------------------------------------------------------------ Kitchen chimney
    case 'chimney':
      return (
        <g>
          <defs>
            <G id={id('st')} stops={[[0, '#f2f4f7'], [0.5, '#b9c1cc'], [1, '#e7eaef']]} x2={1} y2={0} />
          </defs>
          <Floor p={p} cy={106} rx={36} ry={4} />
          <rect x="50" y="8" width="20" height="40" fill={u('st')} />
          <path d="M24 76 L36 48 H84 L96 76Z" fill={u('st')} />
          <path d="M30 74 L40 52 H80 L90 74Z" fill="#1d2230" opacity=".85" />
          <path d="M40 52 H58 L44 74 H30Z" fill="#fff" opacity=".12" />
          <rect x="22" y="76" width="76" height="6" rx="2" fill="#3a4152" />
          <circle cx="42" cy="85" r="2" fill="#ffd27a" />
          <circle cx="78" cy="85" r="2" fill="#ffd27a" />
          <path d="M36 90 l6 14 M84 90 l-6 14" stroke="#ffd27a" strokeWidth="6" opacity=".18" strokeLinecap="round" />
          <circle cx="70" cy="64" r="1.4" fill="#3eead9" />
          <circle cx="75" cy="64" r="1.4" fill="#fff" opacity=".6" />
        </g>
      );
    // ------------------------------------------------------------------------------------ RO water purifier
    case 'waterpurifier':
      return (
        <g>
          <defs>
            <G id={id('b')} stops={[[0, '#ffffff'], [1, '#d7dde6']]} x2={1} y2={0} />
            <G id={id('w')} stops={[[0, L(h, 0.45)], [1, h]]} />
          </defs>
          <Floor p={p} cy={110} rx={28} />
          <rect x="30" y="12" width="60" height="86" rx="14" fill={u('b')} stroke="#ccd3dd" strokeWidth=".8" />
          <rect x="38" y="24" width="44" height="44" rx="9" fill="#eaf4fb" />
          <path d="M38 46 q11 -4 22 0 t22 0 V59 Q82 68 73 68 H47 Q38 68 38 59Z" fill={u('w')} />
          <circle cx="50" cy="56" r="1.6" fill="#fff" opacity=".8" />
          <circle cx="66" cy="52" r="1.1" fill="#fff" opacity=".7" />
          <path d="M60 30 c-4 6 -4 9 0 12 c4 -3 4 -6 0 -12z" fill={h} opacity=".85" />
          <rect x="48" y="76" width="24" height="8" rx="4" fill="#232937" />
          <circle cx="54" cy="80" r="1.4" fill="#3eead9" />
          <circle cx="60" cy="80" r="1.4" fill="#fff" opacity=".6" />
          <path d="M58 98 h8 v6 h-4" stroke="#8d97a6" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    // ------------------------------------------------------------------------------------ Electric scooter
    case 'scooter':
      return (
        <g>
          <defs>
            <G id={id('bd')} stops={[[0, L(h, 0.3)], [0.55, h], [1, D(h, 0.3)]]} x2={1} y2={1} />
            <G id={id('rim')} stops={[[0, '#f4f6f9'], [1, '#8d97a6']]} x2={1} y2={1} />
          </defs>
          <Floor p={p} cy={102} rx={50} ry={5} />
          {[30, 92].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="86" r="14" fill="#151922" />
              <circle cx={cx} cy="86" r="9" fill={u('rim')} />
              <circle cx={cx} cy="86" r="3.4" fill="#3a4152" />
              {[0, 72, 144, 216, 288].map((a) => (
                <path key={a} d={`M${cx} 86 L${cx + 8.5 * Math.cos((a * Math.PI) / 180)} ${86 + 8.5 * Math.sin((a * Math.PI) / 180)}`} stroke="#a5adbb" strokeWidth="1.6" />
              ))}
            </g>
          ))}
          <path d="M16 72 Q16 56 32 52 L64 50 Q70 50 70 58 L68 74 Q48 80 22 78 Q16 77 16 72Z" fill={u('bd')} />
          <path d="M22 56 Q30 50 64 48 Q68 48 68 52 L24 60Z" fill="#fff" opacity=".28" />
          <path d="M26 50 Q28 43 38 43 H62 Q68 43 66 50Z" fill="#20242f" />
          <rect x="44" y="74" width="34" height="6" rx="3" fill="#2a2f3b" />
          <path d="M76 78 L84 40 L92 40 L86 80Z" fill={u('bd')} />
          <path d="M78 84 Q84 66 104 74 L104 80 Q90 74 82 86Z" fill={D(h, 0.15)} />
          <path d="M78 30 L98 26" stroke="#20242f" strokeWidth="4" strokeLinecap="round" />
          <path d="M86 30 L84 40" stroke="#20242f" strokeWidth="3.5" />
          <ellipse cx="93" cy="44" rx="5" ry="6.5" fill="#fff" />
          <ellipse cx="93" cy="44" rx="11" ry="9" fill="#fff" opacity=".18" />
          <path d="M44 60 l-4 7 h4 l-2 7 7 -10 h-4 l2 -4z" fill="#ffb21e" />
        </g>
      );
    // ------------------------------------------------------------------------------------ Rooftop solar
    case 'solar': {
      const cells: ReactNode[] = [];
      // 3 x 2 panels on a tilted frame (front edge y=88, back edge y=48)
      const fx = (t: number, y: number) => {
        // horizontal position along a row at depth y (perspective: back edge narrower)
        const k = (88 - y) / 40;
        const left = 16 + 10 * k;
        const right = 104 - 10 * k;
        return left + (right - left) * t;
      };
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const y1 = 88 - r * 20 - 1;
          const y2 = y1 - 18;
          const t1 = c / 3 + 0.008;
          const t2 = (c + 1) / 3 - 0.008;
          cells.push(<path key={`${r}${c}`} d={`M${fx(t1, y1)} ${y1} L${fx(t2, y1)} ${y1} L${fx(t2, y2)} ${y2} L${fx(t1, y2)} ${y2}Z`} fill={u('pv')} stroke="#dfe5ee" strokeWidth=".9" />);
          for (let k = 1; k < 4; k++) {
            const yy = y1 - (18 * k) / 4;
            cells.push(<path key={`h${r}${c}${k}`} d={`M${fx(t1, yy)} ${yy} L${fx(t2, yy)} ${yy}`} stroke="#5b8cff" strokeWidth=".4" opacity=".7" />);
          }
          for (let k = 1; k < 3; k++) {
            const tt = t1 + ((t2 - t1) * k) / 3;
            cells.push(<path key={`v${r}${c}${k}`} d={`M${fx(tt, y1)} ${y1} L${fx(tt, y2)} ${y2}`} stroke="#5b8cff" strokeWidth=".4" opacity=".7" />);
          }
        }
      }
      return (
        <g>
          <defs>
            <G id={id('pv')} stops={[[0, '#2a4fd6'], [1, '#0c1a5c']]} />
            <G id={id('roof')} stops={[[0, '#d98a6a'], [1, '#a95a3e']]} />
          </defs>
          <circle cx="94" cy="20" r="9" fill={h} />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * Math.PI) / 4;
            return <path key={i} d={`M${94 + 12 * Math.cos(a)} ${20 + 12 * Math.sin(a)} L${94 + 16 * Math.cos(a)} ${20 + 16 * Math.sin(a)}`} stroke={h} strokeWidth="2.2" strokeLinecap="round" />;
          })}
          <path d="M6 96 L114 96 L114 108 L6 108Z" fill={u('roof')} />
          <path d="M6 96 H114" stroke="#f2c2a8" strokeWidth="1.2" />
          <path d="M22 88 v8 M98 88 v8 M34 50 v46 M86 50 v46" stroke="#9aa3b2" strokeWidth="2" />
          {cells}
          <path d={`M${fx(0.05, 87)} 87 L${fx(0.32, 87)} 87 L${fx(0.62, 49)} 49 L${fx(0.38, 49)} 49Z`} fill="#fff" opacity=".1" />
        </g>
      );
    }
    // ------------------------------------------------------------------------------------ Smartphone (3/4 view, camera bump)
    case 'phone':
      return (
        <g>
          <defs>
            <G id={id('scr')} stops={[[0, '#ff8a5b'], [0.45, h], [1, D(h, 0.55)]]} x2={1} y2={1} />
            <G id={id('edge')} stops={[[0, '#e9ecf2'], [1, '#8d97a6']]} x2={1} y2={0} />
            <G id={id('back')} stops={[[0, L(h, 0.35)], [1, D(h, 0.35)]]} x2={1} y2={1} />
          </defs>
          <Floor p={p} cy={108} rx={36} ry={5} />
          <g transform="rotate(-10 72 60)">
            <rect x="62" y="18" width="40" height="80" rx="9" fill={u('back')} />
            <rect x="68" y="24" width="18" height="24" rx="6" fill={D(h, 0.5)} />
            <circle cx="77" cy="31" r="4.2" fill="#0b0f1a" stroke="#c7ced8" strokeWidth="1" />
            <circle cx="77" cy="42" r="4.2" fill="#0b0f1a" stroke="#c7ced8" strokeWidth="1" />
          </g>
          <g transform="rotate(8 46 60)">
            <rect x="24" y="14" width="44" height="90" rx="10" fill={u('edge')} />
            <rect x="26" y="16" width="40" height="86" rx="8.5" fill="#0b0f1a" />
            <rect x="28" y="18" width="36" height="82" rx="7" fill={u('scr')} />
            <rect x="40" y="21" width="12" height="3.6" rx="1.8" fill="#0b0f1a" />
            <text x="46" y="44" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="Google Sans Flex, sans-serif">9:41</text>
            <rect x="33" y="72" width="26" height="9" rx="4.5" fill="#fff" opacity=".28" />
            <rect x="33" y="84" width="26" height="9" rx="4.5" fill="#fff" opacity=".18" />
            <path d="M28 18 H50 L36 100 H28Z" fill="#fff" opacity=".1" />
          </g>
        </g>
      );
    default:
      return <circle cx="60" cy="60" r="30" fill={h} />;
  }
}
