'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/common/logo';
import { isActive, primaryNav, secondaryNav, type NavContext, type NavItem } from './nav';
import { NavIcon } from './nav-icon';

export function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-9 items-center gap-3 rounded px-3 text-sm font-medium transition-colors',
                active ? 'bg-brand-soft text-brand-strong' : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink',
              )}
            >
              <NavIcon name={item.icon} className={cn('size-4', active ? 'text-brand' : 'text-ink-muted')} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function SideNav({ ctx }: { ctx: NavContext }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-sidebar flex-col border-r bg-surface lg:flex">
      <div className="flex h-topbar items-center border-b px-5">
        <Link href="/dashboard" aria-label="TrustLance home">
          <Logo />
        </Link>
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col justify-between overflow-y-auto p-3">
        <NavList items={primaryNav(ctx)} />
        <div className="space-y-3 border-t pt-3">
          <NavList items={secondaryNav(ctx)} />
        </div>
      </nav>
    </aside>
  );
}
