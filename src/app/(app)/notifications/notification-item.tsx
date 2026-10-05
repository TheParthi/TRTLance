'use client';

import Link from 'next/link';
import { Check, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { Notification } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CATEGORY_META, SEVERITY_META, safeLink } from './meta';

export function NotificationItem({ item, busy, onOpen, onMarkRead, onDelete }: {
  item: Notification;
  busy: boolean;
  onOpen: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const category = CATEGORY_META[item.category] ?? CATEGORY_META.system;
  const severity = SEVERITY_META[item.severity] ?? SEVERITY_META.info;
  const href = safeLink(item.link);
  const unread = !item.read_at;

  return (
    <li className={cn('relative flex gap-3 p-4', unread ? 'bg-brand-soft/30' : 'hover:bg-surface-subtle')}>
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', severity.icon)} aria-hidden>
        <category.Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className={cn('text-sm', unread ? 'font-semibold' : 'font-medium')}>
            {href ? (
              <Link href={href} onClick={onOpen} className="after:absolute after:inset-0 after:content-[''] hover:underline">
                {item.title}
              </Link>
            ) : (
              item.title
            )}
          </h3>
          <Badge tone={severity.tone} className="relative">
            <span className="sr-only">Severity: </span>
            {severity.label}
          </Badge>
        </div>
        {item.body && <p className="line-clamp-3 break-words text-sm text-ink-secondary">{item.body}</p>}
        <p className="t-meta">
          {category.label} · <time dateTime={item.created_at} title={formatDateTime(item.created_at)} suppressHydrationWarning>{formatRelative(item.created_at)}</time>
        </p>
      </div>
      <div className="relative z-10 flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-start">
        {unread && (
          <span className="mr-1 mt-3 flex items-center sm:mt-3.5">
            <span className="size-2 rounded-full bg-brand" aria-hidden />
            <span className="sr-only">Unread</span>
          </span>
        )}
        {unread && (
          <Button variant="ghost" size="icon-sm" onClick={onMarkRead} disabled={busy} aria-label={`Mark “${item.title}” as read`}>
            <Check />
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" onClick={onDelete} disabled={busy} aria-label={`Delete “${item.title}”`}>
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
