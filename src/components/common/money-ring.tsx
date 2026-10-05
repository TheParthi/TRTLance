'use client';

import { EscrowRing, type RingState } from '@/components/marketing/escrow-ring';
import { cn } from '@/lib/utils';

export type { RingState };

/**
 * The escrow ring for any set of money: arcs sized by amount and coloured by state, with a readout that
 * says the same thing in words. Used for one contract, a project's plan, or everything a member holds.
 */
export function MoneyRing({ parts, focus = null, readout, className }: {
  parts: { amount: number; state: RingState }[];
  focus?: number | null;
  readout?: { label: string; state: string; amount: string } | null;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <EscrowRing milestones={parts} focus={focus} className="absolute inset-0" />
      {readout && (
        <div aria-hidden className="pointer-events-none absolute left-[4%] top-[6%] w-52">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-signal opacity-60 motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-signal" />
            </span>
            <span className="text-2xs font-semibold uppercase tracking-[0.18em]">{readout.label}</span>
          </div>
          <div className="ml-[3px] mt-2 h-8 w-px bg-ink/30" />
          <div className="inline-block rounded-lg bg-canvas/75 px-3 py-2 backdrop-blur-sm">
            <p className="text-sm font-semibold">{readout.state}</p>
            <p className="t-money text-xl">{readout.amount}</p>
          </div>
        </div>
      )}
    </div>
  );
}
