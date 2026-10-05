import Link from 'next/link';
import { AlertOctagon, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Empty state in the ledger language: no box, no illustration — a headline, one sentence and one
 * useful action, sitting between hairline rules where the rows would be.
 */
export function EmptyState({ title, description, action, className, compact }: {
  /** Accepted for older call sites; empty states no longer draw an icon. */
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: { label: string; href: string } | React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('border-y border-line', compact ? 'py-6' : 'py-10 md:py-12', className)}>
      <div className="max-w-reading space-y-2">
        <h3 className={cn('font-display font-medium leading-tight', compact ? 'text-lg' : 'text-2xl')}>{title}</h3>
        {description && <p className="text-sm text-ink-secondary">{description}</p>}
      </div>
      {action && (
        <div className="mt-5">
          {typeof action === 'object' && action !== null && 'href' in action && 'label' in action ? (
            <Button asChild variant="secondary">
              <Link href={(action as { href: string }).href}>{(action as { label: string }).label}</Link>
            </Button>
          ) : (
            (action as React.ReactNode)
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorState({ title = 'This could not be loaded', description, retry, className }: {
  title?: string;
  description?: React.ReactNode;
  retry?: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" className={cn('border-l-2 border-danger py-2 pl-5', className)}>
      <p className="t-label-caps flex items-center gap-1.5 text-danger-strong"><AlertOctagon className="size-3.5" aria-hidden /> Something went wrong</p>
      <h3 className="mt-2 font-display text-2xl font-medium leading-tight">{title}</h3>
      <p className="mt-1.5 max-w-reading text-sm text-ink-secondary">
        {description ?? 'We could not reach TrustLance just now. Nothing was changed. Try again in a moment.'}
      </p>
      {retry && <div className="mt-5 flex flex-wrap items-center gap-3">{retry}</div>}
    </div>
  );
}
