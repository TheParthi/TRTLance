import Link from 'next/link';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NextAction } from '@/lib/next-action';
import { cn } from '@/lib/utils';
import { StickyNextAction } from './sticky-next-action';

const style = {
  action: { rule: 'border-brand', label: 'Next step', labelTone: 'text-brand-strong' },
  alert: { rule: 'border-danger', label: 'Needs attention', labelTone: 'text-danger-strong' },
  waiting: { rule: 'border-line-strong', label: 'Waiting', labelTone: 'text-ink-muted' },
  done: { rule: 'border-success', label: 'Done', labelTone: 'text-success-strong' },
};

/** The one control for a next action: in-page steps scroll down quietly, steps elsewhere are the primary button. */
export function NextActionControl({ action, size }: { action: NextAction; size?: 'sm' }) {
  if (!action.target || action.tone === 'done') return null;
  const inPage = action.target.startsWith('#') || action.target.startsWith('?');
  const label = action.cta ?? (action.tone === 'waiting' ? 'View' : 'Open');
  if (action.tone === 'waiting') {
    return (
      <Link href={action.target} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline">
        {label} {inPage ? <ArrowDown className="size-4" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
      </Link>
    );
  }
  return (
    <Button asChild size={size} variant={inPage ? 'secondary' : action.tone === 'alert' ? 'danger' : 'primary'} className="shrink-0">
      <Link href={action.target}>{label} {inPage ? <ArrowDown aria-hidden /> : <ArrowRight aria-hidden />}</Link>
    </Button>
  );
}

/**
 * "What do I need to do next?" — said once, as a headline with one control. `control` replaces the
 * default link when the step happens in place (e.g. funding escrow). On phones the same step follows
 * the reader in a bar at the bottom once the headline has scrolled away.
 */
export function NextActionBanner({ action, control, feature }: { action: NextAction; control?: React.ReactNode; feature?: boolean }) {
  const s = style[action.tone];
  const own = control ?? <NextActionControl action={action} />;
  const loud = feature && (action.tone === 'action' || action.tone === 'alert');
  if (loud) {
    const inPage = action.target?.startsWith('#') || action.target?.startsWith('?');
    return (
      <>
        <section
          id={action.target === '#fund' ? 'fund' : 'next-step'}
          data-next-step
          aria-labelledby="next-step-title"
          className="relative grid scroll-mt-24 gap-6 overflow-hidden rounded-2xl bg-surface-inverse px-6 py-8 text-ink-inverse sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end md:px-10 md:py-11"
        >
          <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', action.tone === 'alert' ? 'bg-danger' : 'bg-signal')} />
          <div className="min-w-0 space-y-3">
            <p className={cn('text-2xs font-semibold uppercase tracking-[0.18em]', action.tone === 'alert' ? 'text-danger-soft' : 'text-signal')}>{s.label}</p>
            <h2 id="next-step-title" className="font-display text-[clamp(1.9rem,3.6vw,3.1rem)] font-medium leading-[1.02] tracking-[-0.03em] text-ink-inverse">{action.title}</h2>
            <p className="max-w-xl text-sm text-ink-inverse/70 md:text-base">{action.detail}</p>
          </div>
          {control ?? (action.target && (
            <Button asChild size="lg" variant={action.tone === 'alert' ? 'danger' : 'signal'} className="shrink-0 justify-self-start">
              <Link href={action.target}>{action.cta ?? 'Open'} {inPage ? <ArrowDown aria-hidden /> : <ArrowRight aria-hidden />}</Link>
            </Button>
          ))}
        </section>
        <StickyNextAction title={action.title}>{control ?? <NextActionControl action={action} size="sm" />}</StickyNextAction>
      </>
    );
  }
  return (
    <>
      <section
        id={action.target === '#fund' ? 'fund' : 'next-step'}
        data-next-step
        aria-labelledby="next-step-title"
        className={cn('grid scroll-mt-24 gap-4 border-l-2 py-1 pl-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8', s.rule)}
      >
        <div className="min-w-0 space-y-1.5">
          <p className={cn('t-label-caps', s.labelTone)}>{s.label}</p>
          <h2 id="next-step-title" className="font-display text-xl font-medium leading-tight md:text-2xl">{action.title}</h2>
          <p className="max-w-reading text-sm text-ink-secondary">{action.detail}</p>
        </div>
        {own}
      </section>
      {(action.tone === 'action' || action.tone === 'alert') && (control || action.target) && (
        <StickyNextAction title={action.title}>{control ?? <NextActionControl action={action} size="sm" />}</StickyNextAction>
      )}
    </>
  );
}
