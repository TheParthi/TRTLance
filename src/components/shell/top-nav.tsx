'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { primaryNav, sectionFor, ALL_ITEMS, type NavContext } from './nav';
import { useSectionOverride } from './section';

/**
 * Desktop primary navigation: a capsule of sections with an ink pill that glides to the current one.
 * Before the pill is measured, the current item draws its own pill, so nothing jumps on first paint.
 */
export function TopNav({ ctx }: { ctx: NavContext }) {
  const pathname = usePathname();
  const override = useSectionOverride();
  const active = override ?? sectionFor(pathname, ALL_ITEMS(ctx));
  const listRef = React.useRef<HTMLUListElement>(null);
  const [pill, setPill] = React.useState<{ x: number; w: number } | null>(null);

  React.useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const place = () => {
      const el = list.querySelector<HTMLElement>('[aria-current="page"]');
      if (!el) return setPill(null);
      const r = el.getBoundingClientRect();
      setPill({ x: r.left - list.getBoundingClientRect().left, w: r.width });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(list);
    return () => ro.disconnect();
  }, [active]);

  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul ref={listRef} className="relative flex items-center gap-0.5 rounded-full border border-ink/10 bg-canvas/75 p-1 shadow-[0_10px_30px_-18px_rgb(0_0_0/0.35)] backdrop-blur-xl">
        {pill && (
          <li
            aria-hidden
            className="absolute inset-y-1 left-0 rounded-full bg-ink transition-[transform,width] duration-slow ease-ledger"
            style={{ width: pill.w, transform: `translateX(${pill.x}px)` }}
          />
        )}
        {primaryNav(ctx).map((item) => {
          const on = item.id === active;
          return (
            <li key={item.id} className="relative">
              <Link
                href={item.href}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'relative z-10 flex h-9 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors duration-base ease-ledger',
                  on ? 'text-canvas' : 'text-ink-secondary hover:text-ink',
                  on && !pill && 'bg-ink',
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
