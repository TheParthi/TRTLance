import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Zap } from 'lucide-react';
import type { NextAction } from '@/lib/next-action';
import { cn } from '@/lib/utils';

const style = {
  action: { rule: 'before:bg-brand', Icon: Zap, icon: 'text-brand', label: 'Your move' },
  waiting: { rule: 'before:bg-line-strong', Icon: Clock, icon: 'text-ink-muted', label: 'Waiting' },
  done: { rule: 'before:bg-success', Icon: CheckCircle2, icon: 'text-success', label: 'Done' },
  alert: { rule: 'before:bg-danger', Icon: AlertTriangle, icon: 'text-danger', label: 'Attention' },
};

/**
 * "What do I need to do next?" — said once, in one line, with at most one control.
 * `action` replaces the default link when the step happens in place (e.g. funding escrow).
 */
export function NextActionBanner({ action, control }: { action: NextAction; control?: React.ReactNode }) {
  const s = style[action.tone];
  return (
    <section
      aria-label="Next step"
      className={cn(
        'relative flex flex-col gap-3 py-1 pl-5 sm:flex-row sm:items-center sm:gap-6',
        'before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-full',
        s.rule,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <s.Icon className={cn('mt-0.5 size-5 shrink-0', s.icon)} aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold"><span className="sr-only">{s.label}: </span>{action.title}</p>
          <p className="text-sm text-ink-secondary">{action.detail}</p>
        </div>
      </div>
      {control ?? (action.target && action.tone !== 'done' && (
        <Link href={action.target} className="inline-flex shrink-0 items-center gap-1 pl-8 text-sm font-semibold text-brand hover:underline sm:pl-0">
          {action.tone === 'action' ? 'Go there' : 'View'} <ArrowRight className="size-4" aria-hidden />
        </Link>
      ))}
    </section>
  );
}
