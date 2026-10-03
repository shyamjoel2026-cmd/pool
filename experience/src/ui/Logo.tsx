import { useId } from 'react';
import { cn } from '../lib/cn';

/** POOL mark: a pool filling with water, and one more drop (a household) falling in. */
export function Mark({ size = 32, className, mono }: { size?: number; className?: string; mono?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const ink = mono ? 'var(--bg)' : '#fff';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`mk-g-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a74ff" />
          <stop offset="1" stopColor="#1235b8" />
        </linearGradient>
        <linearGradient id={`mk-w-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3eead9" />
          <stop offset="1" stopColor="#14b8c9" />
        </linearGradient>
        <clipPath id={`mk-c-${uid}`}>
          <circle cx="20" cy="22.5" r="9.4" />
        </clipPath>
      </defs>
      <rect width="40" height="40" rx="12" fill={mono ? 'currentColor' : `url(#mk-g-${uid})`} />
      <g clipPath={`url(#mk-c-${uid})`}>
        <path d="M6 23.6 q3.5 -2.6 7 0 t7 0 t7 0 t7 0 V36 H6Z" fill={mono ? ink : `url(#mk-w-${uid})`} />
      </g>
      <circle cx="20" cy="22.5" r="10.4" fill="none" stroke={ink} strokeWidth="2.4" />
      <path d="M20 3.6 c1.9 2.5 2.8 3.8 2.8 5 a2.8 2.8 0 0 1 -5.6 0 c0 -1.2 .9 -2.5 2.8 -5z" fill={mono ? ink : '#3eead9'} />
    </svg>
  );
}

export function Logo({ size = 28, className, tagline }: { size?: number; className?: string; tagline?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Mark size={size} />
      <span className="leading-none">
        <span className="block font-[800] tracking-[0.02em] [font-stretch:118%]" style={{ fontSize: size * 0.66 }}>POOL</span>
        {tagline && <span className="mt-0.5 block text-[10.5px] font-medium tracking-[0.01em] text-ink-3">Before you buy it, POOL it.</span>}
      </span>
    </span>
  );
}
