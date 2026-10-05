'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/settings', label: 'Profile' },
  { href: '/settings/portfolio', label: 'Portfolio & credentials' },
  { href: '/settings/account', label: 'Account & security' },
  { href: '/settings/notifications', label: 'Notifications' },
];

/** Tabs that scroll inside their own strip on phones; a quiet list with a rule on the current page from md up. */
export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="scrollbar-none relative -mx-4 min-w-0 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
      <ul className="flex w-max min-w-full gap-6 border-b md:sticky md:top-24 md:w-auto md:flex-col md:gap-0 md:border-b-0 md:border-l">
        {ITEMS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  '-mb-px flex h-10 items-center whitespace-nowrap border-b-2 text-sm font-medium transition-colors duration-base ease-ledger md:-ml-px md:mb-0 md:border-b-0 md:border-l-2 md:pl-4',
                  active ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink',
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
