'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * A horizontally scrolling strip of link chips (e.g. categories). The strip scrolls inside itself,
 * and the current chip is brought into view on load so a selection far down the list is never hidden.
 */
export function ChipStrip({ label, items }: { label: string; items: { key: string; href: string; label: string; current: boolean }[] }) {
  const strip = React.useRef<HTMLUListElement>(null);
  React.useEffect(() => {
    const el = strip.current;
    const active = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !active) return;
    // The strip is `relative`, so offsetLeft is measured from its own edge.
    const left = active.offsetLeft;
    if (left + active.offsetWidth > el.scrollLeft + el.clientWidth || left < el.scrollLeft) {
      el.scrollLeft = Math.max(0, left - 16);
    }
  }, [items]);
  return (
    <nav aria-label={label} className="-mx-4 min-w-0 md:mx-0">
      <ul ref={strip} className="scrollbar-none relative flex gap-2 overflow-x-auto px-4 md:px-0">
        {items.map((c) => (
          <li key={c.key} className="shrink-0">
            <Link
              href={c.href}
              aria-current={c.current ? 'page' : undefined}
              className={cn(
                'inline-flex h-10 items-center rounded-full border px-4 text-sm transition-colors md:h-9',
                c.current ? 'border-ink bg-ink font-medium text-ink-inverse' : 'border-line-strong text-ink-secondary hover:border-ink-muted hover:text-ink',
              )}
            >
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
