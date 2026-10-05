'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { EscrowRail } from '@/components/common/escrow-rail';
import { proposalSegments } from '@/lib/escrow-summary';
import { formatAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

export type LiveProject = {
  id: string;
  title: string;
  category: string | null;
  budget: string | null;
  proposals: number;
  plan: { title: string; amount: string }[];
};

/**
 * Real open projects as oversized rows. On a mouse, a preview card with the project's budget and
 * suggested milestone rail follows the cursor; on touch the same facts sit under each title.
 */
export function LiveProjects({ projects }: { projects: LiveProject[] }) {
  const [active, setActive] = React.useState<number | null>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const pos = React.useRef({ x: 0, y: 0, cx: 0, cy: 0, raf: 0 });

  React.useEffect(() => {
    const p = pos.current;
    const loop = () => {
      p.cx += (p.x - p.cx) * 0.16;
      p.cy += (p.y - p.cy) * 0.16;
      if (cardRef.current) {
        // Sit above and to the right of the cursor, so the row being read stays visible.
        const x = Math.min(p.cx + 56, window.innerWidth - 280);
        cardRef.current.style.transform = `translate3d(${x}px, ${p.cy - 110}px, 0)`;
      }
      p.raf = requestAnimationFrame(loop);
    };
    p.raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(p.raf);
  }, []);

  const onMove = (e: React.PointerEvent) => {
    pos.current.x = e.clientX;
    pos.current.y = e.clientY;
  };
  const current = active !== null ? projects[active] : null;

  return (
    <div onPointerMove={onMove} onPointerLeave={() => setActive(null)}>
      <ol className="border-t border-ink/15">
        {projects.map((p, i) => (
          <li key={p.id} className="border-b border-ink/15">
            <Link
              href={`/projects/${p.id}`}
              data-cursor="View"
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="group grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 py-6 transition-colors duration-base ease-ledger focus-visible:ring-inset md:grid-cols-[3.5rem_minmax(0,1fr)_auto] md:py-8"
            >
              <span className="t-mono text-sm text-ink-muted">{String(i + 1).padStart(2, '0')}</span>
              <span className="min-w-0">
                <span className="block text-2xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{p.category ?? 'Project'} · {p.proposals} proposal{p.proposals === 1 ? '' : 's'}</span>
                <span className="mt-1 block font-display text-3xl leading-tight tracking-[-0.02em] transition-transform duration-slow ease-ledger group-hover:translate-x-3 md:text-5xl">
                  {p.title}
                </span>
                {p.plan.length > 0 && <EscrowRail segments={proposalSegments(p.plan.map((m, j) => ({ position: j + 1, title: m.title, amount: m.amount })))} size="sm" className="mt-3 max-w-sm md:hidden" label={`Suggested payment plan for ${p.title}`} />}
              </span>
              <span className="col-start-2 flex items-center gap-3 md:col-start-3">
                {p.budget && <span className="t-money text-xl md:text-2xl">{formatAmount(p.budget)}</span>}
                <ArrowUpRight className="size-6 text-ink-muted transition-[transform,color] duration-base ease-ledger group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-ink" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <div ref={cardRef} aria-hidden className="pointer-events-none fixed left-0 top-0 z-40 hidden w-64 [@media(pointer:fine)]:md:block">
        <div
          className={cn(
            'rounded-xl bg-surface-inverse p-5 text-ink-inverse shadow-lg transition-[opacity,transform] duration-base ease-ledger',
            current ? 'scale-100 opacity-100' : 'scale-90 opacity-0',
          )}
        >
        {current && (
          <>
            <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-signal">{current.category ?? 'Open project'}</p>
            <p className="mt-2 font-display text-xl leading-tight">{current.title}</p>
            <p className="t-money mt-3 text-3xl">{current.budget ? formatAmount(current.budget) : 'Budget open'}</p>
            {current.plan.length > 0 ? (
              <>
                <EscrowRail segments={proposalSegments(current.plan.map((m, j) => ({ position: j + 1, title: m.title, amount: m.amount })))} size="md" className="mt-4" />
                <p className="mt-2 text-xs text-ink-inverse/60">{current.plan.length} suggested milestone{current.plan.length === 1 ? '' : 's'} · funded in escrow before work starts</p>
              </>
            ) : (
              <p className="mt-3 text-xs text-ink-inverse/60">Freelancers propose the milestones · funded in escrow before work starts</p>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
