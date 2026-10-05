'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { EscrowRing, type RingMoment } from './escrow-ring';

/**
 * The landing ring with its instrument readout: a live caption that follows the example contract as
 * the ring plays it (and is announced politely to screen readers once, not on every change).
 */
export function HeroRing({ className }: { className?: string }) {
  const [moment, setMoment] = React.useState<RingMoment>({ milestone: 0, state: 'Signed by both sides', amount: 600 });
  const [tick, setTick] = React.useState(0);
  const onMoment = React.useCallback((m: RingMoment) => {
    setMoment(m);
    setTick((t) => t + 1);
  }, []);
  return (
    <div className={cn('relative', className)}>
      <EscrowRing demo onMoment={onMoment} className="absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute left-[6%] top-[9%] hidden w-56 sm:block">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-signal opacity-60 motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-signal" />
          </span>
          <span className="text-2xs font-semibold uppercase tracking-[0.18em]">Example contract</span>
        </div>
        <div className="ml-[3px] mt-2 h-10 w-px bg-ink/30" />
        <div key={tick} className="inline-block animate-rise space-y-0.5 rounded-lg bg-canvas/75 px-3 py-2 backdrop-blur-sm">
          <p className="t-mono text-xs text-ink-muted">{moment.milestone ? `MILESTONE 0${moment.milestone}` : 'CONTRACT · 3 MILESTONES'}</p>
          <p className="text-sm font-semibold">{moment.state}</p>
          <p className="t-money text-2xl">{moment.amount} <span className="text-xs uppercase tracking-[0.08em] text-ink-muted">SHM</span></p>
        </div>
      </div>
    </div>
  );
}
