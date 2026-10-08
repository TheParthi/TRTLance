'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { sectionFor, sectionsByGroup, type ConsoleSection } from '@/lib/admin/nav';
import { ConsoleIcon } from './console-icon';

/**
 * The console's navigation, in two shapes from the same list: a grouped sidebar from lg up, and a
 * scrolling rail of the same sections below that. Both mark the current section with aria-current
 * and a solid left rule, never with colour alone.
 */

export type QueueCounts = Partial<Record<NonNullable<ConsoleSection['badge']>, number>>;

function badgeFor(section: ConsoleSection, counts: QueueCounts) {
  const count = section.badge ? counts[section.badge] ?? 0 : 0;
  return count > 0 ? count : null;
}

export function ConsoleSidebar({ counts }: { counts: QueueCounts }) {
  const pathname = usePathname();
  const active = sectionFor(pathname);

  return (
    <nav aria-label="Console" className="hidden lg:block">
      <ul className="space-y-5">
        {sectionsByGroup().map(({ group, sections }) => (
          <li key={group}>
            <p className="px-2.5 pb-1.5 text-2xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{group}</p>
            <ul className="space-y-0.5 pl-2.5">
              {sections.map((section) => {
                const on = section.id === active?.id;
                const badge = badgeFor(section, counts);
                return (
                  <li key={section.id}>
                    <Link href={section.href} aria-current={on ? 'page' : undefined} className="console-nav-item">
                      <ConsoleIcon
                        name={section.icon}
                        className={cn('size-4 shrink-0 transition-colors', on ? 'text-brand' : 'text-ink-muted')}
                      />
                      <span className="min-w-0 flex-1 truncate">{section.label}</span>
                      {badge !== null && (
                        <span className="shrink-0 rounded-full bg-warning-soft px-1.5 py-px text-2xs font-semibold tabular-nums text-warning-strong ring-1 ring-inset ring-warning/30">
                          {badge}
                          <span className="sr-only"> waiting</span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ConsoleRail({ counts }: { counts: QueueCounts }) {
  const pathname = usePathname();
  const active = sectionFor(pathname);

  return (
    <nav aria-label="Console" className="scrollbar-none -mx-4 overflow-x-auto px-4 lg:hidden">
      <ul className="flex gap-1 border-t border-line py-2">
        {sectionsByGroup().flatMap(({ sections }) => sections).map((section) => {
          const on = section.id === active?.id;
          const badge = badgeFor(section, counts);
          return (
            <li key={section.id}>
              <Link
                href={section.href}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs transition-colors duration-base ease-ledger',
                  on
                    ? 'bg-surface-subtle font-medium text-ink shadow-xs ring-1 ring-inset ring-line'
                    : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink',
                )}
              >
                <ConsoleIcon name={section.icon} className={cn('size-3.5', on ? 'text-brand' : 'text-ink-muted')} />
                {section.label}
                {badge !== null && (
                  <span className="rounded-full bg-warning-soft px-1.5 text-2xs font-semibold tabular-nums text-warning-strong">
                    {badge}
                    <span className="sr-only"> waiting</span>
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
