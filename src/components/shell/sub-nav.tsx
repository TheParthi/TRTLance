import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Secondary navigation inside a section (e.g. Contracts · Disputes). */
export function SubNav({ items, active, label }: { items: { key: string; href: string; label: string; count?: number }[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="scrollbar-none -mx-4 mb-8 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex gap-6 border-b">
        {items.map((i) => (
          <li key={i.key} className="shrink-0">
            <Link
              href={i.href}
              aria-current={i.key === active ? 'page' : undefined}
              className={cn('-mb-px inline-flex items-center gap-1.5 border-b-2 pb-2.5 text-sm font-medium', i.key === active ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink')}
            >
              {i.label}
              {typeof i.count === 'number' && <span className="rounded-full bg-surface-sunken px-1.5 text-2xs tabular-nums text-ink-secondary">{i.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
