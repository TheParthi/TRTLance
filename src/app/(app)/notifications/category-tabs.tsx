import Link from 'next/link';
import type { NotificationCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CATEGORIES, CATEGORY_META } from './meta';

/**
 * Category filter as a strip of links that scrolls inside itself on narrow screens.
 * `relative` keeps the visually hidden "unread" labels inside the scroll container; without it
 * they are positioned against the page and widen it on phones.
 */
export function CategoryTabs({ active, unread }: { active: NotificationCategory | null; unread: Partial<Record<NotificationCategory | 'all', number>> }) {
  const tabs: { key: NotificationCategory | 'all'; label: string; href: string }[] = [
    { key: 'all', label: 'All', href: '/notifications' },
    ...CATEGORIES.map((c) => ({ key: c, label: CATEGORY_META[c].label, href: `/notifications?category=${c}` })),
  ];
  return (
    <nav aria-label="Notification categories" className="scrollbar-none relative -mx-4 mb-8 min-w-0 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max min-w-full gap-6 border-b">
        {tabs.map((t) => {
          const current = (active ?? 'all') === t.key;
          const count = unread[t.key] ?? 0;
          return (
            <li key={t.key} className="shrink-0">
              <Link
                href={t.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  '-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 text-sm font-medium',
                  current ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink',
                )}
              >
                {t.label}
                {count > 0 && (
                  <span className="rounded-full bg-brand-soft px-1.5 text-2xs font-semibold tabular-nums text-brand-strong">
                    {count > 99 ? '99+' : count}
                    <span className="sr-only"> unread</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
