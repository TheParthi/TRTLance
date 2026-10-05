'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ALL_ITEMS, mobileTabs, sectionFor, type NavContext } from './nav';
import { NavIcon } from './nav-icon';
import { useSectionOverride } from './section';

/** Phones and tablets: a floating ink dock. The current section is a signal capsule with its name. */
export function MobileNav({ ctx }: { ctx: NavContext }) {
  const pathname = usePathname();
  const override = useSectionOverride();
  const active = override ?? sectionFor(pathname, ALL_ITEMS(ctx));
  return (
    <nav aria-label="Main" className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 lg:hidden">
      <ul className="mx-auto flex h-16 max-w-md items-center justify-between gap-1 rounded-full bg-surface-inverse/95 px-2 text-ink-inverse shadow-[0_18px_40px_-16px_rgb(0_0_0/0.55)] backdrop-blur-xl">
        {mobileTabs(ctx).map((item) => {
          const on = item.id === active;
          return (
            <li key={item.id} className={cn('flex transition-[flex-grow] duration-slow ease-ledger', on ? 'grow-[2.2]' : 'grow')}>
              <Link
                href={item.href}
                aria-current={on ? 'page' : undefined}
                aria-label={item.label}
                className={cn(
                  'flex h-12 w-full items-center justify-center gap-2 rounded-full text-xs font-semibold transition-colors duration-base ease-ledger',
                  on ? 'bg-signal text-signal-ink' : 'text-ink-inverse/65 hover:text-ink-inverse',
                )}
              >
                <NavIcon name={item.icon} className="size-5 shrink-0" />
                {on && <span className="truncate">{item.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
