import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Zap } from 'lucide-react';
import type { NextAction } from '@/lib/next-action';
import { cn } from '@/lib/utils';

const style = {
  action: { box: 'border-brand/30 bg-brand-soft/60', Icon: Zap, icon: 'text-brand', label: 'Your move' },
  waiting: { box: 'border-line bg-surface', Icon: Clock, icon: 'text-ink-muted', label: 'Waiting' },
  done: { box: 'border-success/25 bg-success-soft/60', Icon: CheckCircle2, icon: 'text-success', label: 'Done' },
  alert: { box: 'border-danger/25 bg-danger-soft/60', Icon: AlertTriangle, icon: 'text-danger', label: 'Attention' },
};

/** "What do I need to do next?" — the first thing on every contract. */
export function NextActionBanner({ action }: { action: NextAction }) {
  const s = style[action.tone];
  return (
    <section aria-label="Next step" className={cn('flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center', s.box)}>
      <s.Icon className={cn('size-5 shrink-0', s.icon)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="t-eyebrow">{s.label}</p>
        <p className="font-semibold">{action.title}</p>
        <p className="text-sm text-ink-secondary">{action.detail}</p>
      </div>
      {action.target && (
        <Link href={action.target} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          {action.tone === 'action' ? 'Go' : 'View'} <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </section>
  );
}
