import { cn } from '@/lib/utils';

/**
 * The seal: two counter-turning rings of ledger ticks around a closed centre.
 *
 * It is the escrow ring from the marketing page read as a lock instead of a balance — money held
 * inside a boundary. While the console is sealed the rings turn slowly and the centre is a single
 * closed bar. On `state="opening"` the rings settle, the boundary ring draws itself shut and a
 * vertical stroke completes a cross: the half-second of feedback that makes unsealing feel like
 * opening something rather than submitting a form.
 *
 * One inline SVG and a few keyframes in globals.css — nothing to download before the page works,
 * and the animation classes are plain names so reduced motion can switch them off in one place.
 */
export function Seal({ state = 'sealed', className }: { state?: 'sealed' | 'opening'; className?: string }) {
  const opening = state === 'opening';
  // 24 ticks with every sixth one long, so the ring reads as a measure rather than a texture.
  const ticks = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div data-seal={opening ? 'opening' : 'sealed'} className={cn('relative aspect-square w-full', className)} aria-hidden>
      {/* A halo, so the mark sits in light rather than on a flat field. */}
      <div
        className={cn(
          'absolute inset-[14%] rounded-full blur-2xl transition-[background-color,opacity] duration-slow ease-ledger',
          opening ? 'bg-signal/30 opacity-100' : 'bg-brand/20 opacity-70',
        )}
      />
      <svg viewBox="0 0 200 200" className="relative size-full">
        <defs>
          <linearGradient id="seal-edge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity="0.9" />
            <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        <g className="seal-ring-outer">
          {ticks.map((i) => {
            const long = i % 6 === 0;
            return (
              <rect
                key={i}
                x="99.25"
                y={long ? 6 : 9}
                width="1.5"
                height={long ? 13 : 7}
                rx="0.75"
                transform={`rotate(${i * 15} 100 100)`}
                className={long ? 'fill-brass' : 'fill-brand'}
                opacity={long ? 0.95 : 0.5}
              />
            );
          })}
        </g>

        <g className="seal-ring-inner">
          <circle cx="100" cy="100" r="72" fill="none" stroke="url(#seal-edge)" strokeWidth="1" strokeDasharray="2 7" />
        </g>

        <circle cx="100" cy="100" r="58" fill="none" className="stroke-line-strong" strokeWidth="1" />

        {/* The boundary that closes as the console opens. */}
        <circle
          cx="100" cy="100" r="47"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          pathLength={100}
          className={cn('seal-boundary', opening ? 'stroke-signal' : 'stroke-brand/40')}
        />

        <circle
          cx="100" cy="100" r="34"
          className={cn('transition-colors duration-slow ease-ledger', opening ? 'fill-signal/15' : 'fill-surface-subtle')}
        />
        <rect x="84" y="97.5" width="32" height="5" rx="2.5" className={cn('transition-colors duration-slow ease-ledger', opening ? 'fill-signal' : 'fill-ink/70')} />
        <rect x="97.5" y="84" width="5" height="32" rx="2.5" className="seal-cross fill-signal" />
      </svg>
    </div>
  );
}
