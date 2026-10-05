import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, Lock, OctagonAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const styles = {
  info: { box: 'border-info/25 bg-info-soft text-info-strong', Icon: Info },
  success: { box: 'border-success/25 bg-success-soft text-success-strong', Icon: CheckCircle2 },
  warning: { box: 'border-warning/30 bg-warning-soft text-warning-strong', Icon: AlertTriangle },
  danger: { box: 'border-danger/25 bg-danger-soft text-danger-strong', Icon: OctagonAlert },
  secure: { box: 'border-brand/25 bg-brand-soft text-brand-strong', Icon: Lock },
};

/** Inline banner for state the user must notice. */
export function Callout({ tone = 'info', title, children, action, className, role }: {
  tone?: keyof typeof styles;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  role?: 'status' | 'alert';
}) {
  const { box, Icon } = styles[tone];
  return (
    <div role={role} className={cn('flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start', box, className)}>
      <Icon className="size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-ink-secondary [&_a]:font-medium [&_a]:text-current [&_a]:underline">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
