import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Compact step indicator for wizards; the full list is available to screen readers. */
export function StepProgress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Progress">
      <p className="mb-2 text-xs font-medium text-ink-muted">
        Step {current + 1} of {steps.length} · <span className="text-ink">{steps[current]}</span>
      </p>
      <ol className="flex gap-1">
        {steps.map((s, i) => (
          <li key={s} className="flex-1">
            <span
              className={cn('block h-1 rounded-full', i < current ? 'bg-brand' : i === current ? 'bg-brand/60' : 'bg-surface-sunken')}
              aria-current={i === current ? 'step' : undefined}
            >
              <span className="sr-only">{s}{i < current ? ' (done)' : i === current ? ' (current)' : ''}</span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function StepList({ steps, current, onSelect }: { steps: string[]; current: number; onSelect?: (i: number) => void }) {
  return (
    <ol className="space-y-1">
      {steps.map((s, i) => {
        const done = i < current;
        return (
          <li key={s}>
            <button
              type="button"
              disabled={!onSelect || i > current}
              onClick={() => onSelect?.(i)}
              aria-current={i === current ? 'step' : undefined}
              className={cn('flex w-full items-center gap-3 rounded px-2 py-1.5 text-left text-sm disabled:cursor-default',
                i === current ? 'bg-surface-subtle font-semibold text-ink' : done ? 'text-ink-secondary hover:bg-surface-subtle' : 'text-ink-muted')}
            >
              <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border text-2xs',
                done ? 'border-brand bg-brand text-brand-foreground' : i === current ? 'border-brand text-brand' : 'border-line-strong')}>
                {done ? <Check className="size-3" aria-hidden /> : i + 1}
              </span>
              {s}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
