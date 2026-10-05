'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ALL_ITEMS, mobileTabs, sectionFor, type NavContext } from './nav';
import { NavIcon } from './nav-icon';
import { useSectionOverride } from './section';

/** Phone and tablet tab bar. Everything else is in the account menu. */
export function MobileNav({ ctx }: { ctx: NavContext }) {
  const pathname = usePathname();
  const override = useSectionOverride();
  const active = override ?? sectionFor(pathname, ALL_ITEMS(ctx));
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface/95 backdrop-blur safe-bottom lg:hidden">
      <ul className="mx-auto grid h-bottombar max-w-xl grid-cols-5">
        {mobileTabs(ctx).map((item) => {
          const on = item.id === active;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={on ? 'page' : undefined}
                className={cn('flex h-full flex-col items-center justify-center gap-1 text-2xs font-medium', on ? 'text-brand' : 'text-ink-muted')}
              >
                <NavIcon name={item.icon} className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
