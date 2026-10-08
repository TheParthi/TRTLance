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
      <ul className="space-y-6">
        {sectionsByGroup().map(({ group, sections }) => (
          <li key={group}>
            <p className="px-3 pb-1.5 t-label-caps">{group}</p>
            <ul>
              {sections.map((section) => {
                const on = section.id === active?.id;
                const badge = badgeFor(section, counts);
                return (
                  <li key={section.id}>
                    <Link
                      href={section.href}
                      aria-current={on ? 'page' : undefined}
                      className={cn(
                        'group relative flex items-center gap-2.5 rounded px-3 py-1.5 text-sm transition-colors duration-base ease-ledger',
                        'before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full',
                        on
                          ? 'font-medium text-ink before:bg-ink'
                          : 'text-ink-secondary before:bg-transparent hover:bg-surface-subtle hover:text-ink',
                      )}
                    >
                      <ConsoleIcon name={section.icon} className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{section.label}</span>
                      {badge !== null && (
                        <span className="shrink-0 rounded-full bg-warning-soft px-1.5 py-0.5 text-2xs font-semibold tabular-nums text-warning-strong ring-1 ring-inset ring-warning/30">
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
    <nav aria-label="Console" className="scrollbar-none -mx-4 overflow-x-auto border-b px-4 lg:hidden">
      <ul className="flex gap-1 py-2">
        {sectionsByGroup().flatMap(({ sections }) => sections).map((section) => {
          const on = section.id === active?.id;
          const badge = badgeFor(section, counts);
          return (
            <li key={section.id}>
              <Link
                href={section.href}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm transition-colors duration-base ease-ledger',
                  on ? 'bg-ink font-medium text-canvas' : 'text-ink-secondary hover:bg-surface-subtle hover:text-ink',
                )}
              >
                <ConsoleIcon name={section.icon} className="size-4" />
                {section.label}
                {badge !== null && (
                  <span className={cn('rounded-full px-1.5 text-2xs font-semibold tabular-nums', on ? 'bg-canvas/20 text-canvas' : 'bg-warning-soft text-warning-strong')}>
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
