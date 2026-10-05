import Link from 'next/link';
import { AlertOctagon, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function EmptyState({ icon: Icon, title, description, action, className, compact }: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: { label: string; href: string } | React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center rounded-lg border border-dashed bg-surface px-6 text-center', compact ? 'py-8' : 'py-14', className)}>
      {Icon && (
        <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-surface-subtle text-ink-muted">
          <Icon className="size-5" aria-hidden />
        </span>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-ink-secondary">{description}</p>}
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
    <div role="alert" className={cn('flex flex-col items-center rounded-lg border border-danger/25 bg-danger-soft/50 px-6 py-12 text-center', className)}>
      <AlertOctagon className="mb-3 size-6 text-danger" aria-hidden />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-ink-secondary">
        {description ?? 'We could not reach TrustLance just now. Nothing was changed. Try again in a moment.'}
      </p>
      {retry && <div className="mt-5">{retry}</div>}
    </div>
  );
}
