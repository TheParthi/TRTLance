import { cn } from '@/lib/utils';

/** TrustLance mark: a seal formed by two interlocking arcs (client and freelancer) around a keyhole. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-brand" />
      <path d="M9 17.5a7 7 0 0 1 12.2-4.7" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M23 14.5a7 7 0 0 1-12.2 4.7" fill="none" stroke="white" strokeOpacity=".7" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="15" r="2" fill="white" />
      <path d="M15.1 16.4h1.8l.5 3.1h-2.8z" fill="white" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="font-display text-lg font-semibold tracking-tight" style={{ fontVariationSettings: "'opsz' 48" }}>
        TrustLance
      </span>
    </span>
  );
}
