'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, FolderOpen, ShieldCheck, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/settings', label: 'Profile', icon: UserRound },
  { href: '/settings/portfolio', label: 'Portfolio & credentials', icon: FolderOpen },
  { href: '/settings/account', label: 'Account & security', icon: ShieldCheck },
  { href: '/settings/notifications', label: 'Notifications', icon: Bell },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="-mx-4 min-w-0 md:mx-0">
      <ul className="scrollbar-none flex gap-1 overflow-x-auto border-b px-4 md:flex-col md:border-b-0 md:px-0">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors md:rounded md:border-b-0',
                  active
                    ? 'border-brand text-ink md:bg-surface-subtle'
                    : 'border-transparent text-ink-muted hover:text-ink md:hover:bg-surface-subtle',
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
