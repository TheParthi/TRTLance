'use client';

import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { ConversationSummary } from '@/lib/data/messages';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useHydrated } from './use-hydrated';

function preview(c: ConversationSummary, viewerId: string) {
  const m = c.lastMessage;
  if (!m) return 'No messages yet';
  if (m.kind === 'system') return m.body;
  const prefix = m.sender_id === viewerId ? 'You: ' : '';
  return prefix + (m.kind === 'file' ? `Sent a file: ${m.file_name ?? 'attachment'}` : m.body);
}

export function ConversationItem({ conversation: c, viewerId, active, unread }: {
  conversation: ConversationSummary;
  viewerId: string;
  active: boolean;
  unread: boolean;
}) {
  const hydrated = useHydrated();
  const name = c.counterpart?.display_name ?? 'Former member';
  return (
    <li>
      <Link
        href={`/messages/${c.id}`}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex gap-3 border-l-2 border-transparent px-4 py-3 hover:bg-surface-subtle',
          active && 'border-brand bg-brand-soft/60 hover:bg-brand-soft/60',
        )}
      >
        <Avatar name={name} path={c.counterpart?.avatar_path} size="md" />
        <span className="min-w-0 flex-1 space-y-0.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn('truncate text-sm', unread ? 'font-semibold text-ink' : 'font-medium text-ink')}>{name}</span>
            <time dateTime={c.lastMessageAt} className="shrink-0 t-meta">
              {hydrated ? formatRelative(c.lastMessageAt) : ''}
            </time>
          </span>
          <span className="flex items-center gap-1.5">
            <Badge tone={c.contractId ? 'brand' : 'neutral'} className="px-1.5 text-2xs">
              {c.contractId ? 'Contract' : 'Proposal'}
            </Badge>
            <span className="truncate text-xs text-ink-secondary">{c.projectTitle}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className={cn('line-clamp-1 flex-1 text-sm', unread ? 'text-ink' : 'text-ink-muted')}>{preview(c, viewerId)}</span>
            {unread && (
              <span className="flex shrink-0 items-center">
                <span className="size-2 rounded-full bg-brand" aria-hidden />
                <span className="sr-only">Unread</span>
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}
