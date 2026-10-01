import { cn } from '../lib/cn';

/** POOL mark: many circles (buyers) meeting in one pool, with a wave for the money that comes back. */
export function Mark({ size = 32, className, mono }: { size?: number; className?: string; mono?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill={mono ? 'currentColor' : 'var(--brand)'} />
      <circle cx="20" cy="20" r="11" fill="none" stroke={mono ? 'var(--bg)' : '#fff'} strokeWidth="3" />
      <path d="M11.5 21.5 q4.2 -4 8.5 0 t8.5 0" fill="none" stroke={mono ? 'var(--bg)' : '#fff'} strokeWidth="3" strokeLinecap="round" />
      <circle cx="30.5" cy="9.5" r="3" fill={mono ? 'var(--bg)' : '#7ff0e6'} />
    </svg>
  );
}

export function Logo({ size = 28, className, tagline }: { size?: number; className?: string; tagline?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Mark size={size} />
      <span className="leading-none">
        <span className="block text-[19px] font-bold tracking-[0.06em]" style={{ fontSize: size * 0.68 }}>POOL</span>
        {tagline && <span className="mt-0.5 block text-[10.5px] font-medium tracking-[0.02em] text-ink-3">Before you buy it, POOL it.</span>}
      </span>
    </span>
  );
}
