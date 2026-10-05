import Link from 'next/link';
import type { NotificationCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CATEGORIES, CATEGORY_META } from './meta';

export function CategoryTabs({ active, unread }: { active: NotificationCategory | null; unread: Partial<Record<NotificationCategory | 'all', number>> }) {
  const tabs: { key: NotificationCategory | 'all'; label: string; href: string }[] = [
    { key: 'all', label: 'All', href: '/notifications' },
    ...CATEGORIES.map((c) => ({ key: c, label: CATEGORY_META[c].label, href: `/notifications?category=${c}` })),
  ];
  return (
    <nav aria-label="Notification categories" className="scrollbar-none mb-6 flex gap-1 overflow-x-auto border-b">
      {tabs.map((t) => {
        const current = (active ?? 'all') === t.key;
        const count = unread[t.key] ?? 0;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              '-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium',
              current ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {t.label}
            {count > 0 && (
              <span className="rounded-full bg-brand-soft px-1.5 text-2xs font-semibold text-brand-strong">
                {count > 99 ? '99+' : count}
                <span className="sr-only"> unread</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
