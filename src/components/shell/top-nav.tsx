'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { primaryNav, sectionFor, ALL_ITEMS, type NavContext } from './nav';
import { useSectionOverride } from './section';

/** Desktop primary navigation: text tabs with an underline for the current section. */
export function TopNav({ ctx }: { ctx: NavContext }) {
  const pathname = usePathname();
  const override = useSectionOverride();
  const active = override ?? sectionFor(pathname, ALL_ITEMS(ctx));
  return (
    <nav aria-label="Main" className="hidden h-full lg:block">
      <ul className="flex h-full items-stretch gap-1">
        {primaryNav(ctx).map((item) => {
          const on = item.id === active;
          return (
            <li key={item.id} className="flex">
              <Link
                href={item.href}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'relative flex items-center px-3 text-sm font-medium transition-colors',
                  'after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full',
                  on ? 'text-ink after:bg-brand' : 'text-ink-muted hover:text-ink after:bg-transparent',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
