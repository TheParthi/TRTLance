'use client';

import Link from 'next/link';
import { Check, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LedgerRow } from '@/components/common/ledger';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CATEGORY_META, SEVERITY_META, clockTime, safeLink, type NotificationGroup } from './meta';

/**
 * One quiet row: the time in mono, the title, one muted line. Unread rows get a dot and a semibold
 * title; only warning and critical rows add a coloured rule and an icon. Actions live in a small menu.
 */
export function NotificationItem({ group, busy, timeZone, fresh, onOpen, onMarkRead, onDelete }: {
  group: NotificationGroup;
  busy: boolean;
  /** Time zone for the clock time; undefined = the viewer's own. */
  timeZone?: string;
  /** Arrived while the page was open: rises into place. */
  fresh?: boolean;
  onOpen: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const item = group.lead;
  const count = group.items.length;
  const category = CATEGORY_META[item.category] ?? CATEGORY_META.system;
  const severity = SEVERITY_META[item.severity];
  const href = safeLink(item.link);
  const unread = group.items.some((n) => !n.read_at);

  const title = (
    <>
      {severity && (
        <>
          <severity.Icon className={cn('mr-1.5 inline size-3.5 -translate-y-px align-middle', severity.icon)} aria-hidden />
          <span className="sr-only">{severity.label}: </span>
        </>
      )}
      <span className="row-title sm:inline-block">{item.title}</span>
      {count > 1 && (
        <>
          <span className="ml-1.5 font-mono text-xs font-normal text-ink-muted" aria-hidden>×{count}</span>
          <span className="sr-only"> ({count} notifications)</span>
        </>
      )}
    </>
  );

  return (
    <LedgerRow
      tone={severity?.rule}
      className={cn('group flex-row items-start gap-3 py-3.5 pl-4 hover:bg-surface-subtle/70 sm:items-start sm:gap-5', fresh && 'animate-rise')}
      lead={
        <span className="flex w-14 items-center justify-between pt-0.5">
          <time
            dateTime={item.created_at}
            title={formatDateTime(item.created_at)}
            className="font-mono text-xs tabular-nums text-ink-muted"
            suppressHydrationWarning
          >
            {clockTime(item.created_at, timeZone)}
          </time>
          {unread && (
            <span className="flex size-3 items-center justify-center">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
              <span className="sr-only">Unread</span>
            </span>
          )}
        </span>
      }
      trail={
        <div className="relative z-10 -my-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={busy}
                aria-label={`Actions for “${item.title}”`}
                className="text-ink-muted focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 md:[@media(hover:hover)]:opacity-0"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-44">
              {unread && <DropdownMenuItem onSelect={onMarkRead}><Check /> Mark as read</DropdownMenuItem>}
              <DropdownMenuItem onSelect={onDelete}><Trash2 /> {count > 1 ? `Delete all ${count}` : 'Delete'}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <h3 className={cn('text-sm leading-snug', unread ? 'font-semibold text-ink' : 'text-ink-secondary')}>
        <span className="sr-only">{category.label}: </span>
        {href ? (
          <Link href={href} onClick={onOpen} className="after:absolute after:inset-0 after:content-['']">
            {title}
          </Link>
        ) : (
          title
        )}
      </h3>
      {item.body && <p className="mt-0.5 truncate text-sm text-ink-muted">{item.body}</p>}
    </LedgerRow>
  );
}
