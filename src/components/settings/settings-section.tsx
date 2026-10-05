import { cn } from '@/lib/utils';

/**
 * One group of settings: a label column (title and a short explanation) beside the controls on
 * large screens, stacked on smaller ones. Groups are separated by hairline rules, not boxed —
 * place them inside `SettingsSections`.
 */
export function SettingsSection({ id, title, description, action, children, className }: {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** A small action for the whole group (e.g. "Add item"), shown under the label. */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn('grid grid-cols-1 gap-4 py-8 first:pt-0 last:pb-0 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10', className)}>
      <div className="space-y-1.5">
        <h2 id={`${id}-title`} className="text-base font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-ink-secondary">{description}</p>}
        {action && <div className="pt-2">{action}</div>}
      </div>
      <div className="min-w-0 space-y-5">{children}</div>
    </section>
  );
}

/** A stack of settings groups separated by rules. */
export function SettingsSections({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('divide-y divide-line', className)}>{children}</div>;
}
