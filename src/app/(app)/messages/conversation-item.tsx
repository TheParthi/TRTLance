'use client';

import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { EscrowRail } from '@/components/common/escrow-rail';
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

/** One conversation as a ledger row: who, about which project (with its escrow rail once hired), and the latest line. */
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
          'relative flex gap-3 px-2 py-4 transition-colors hover:bg-surface-subtle/70 focus-visible:ring-inset',
          active && 'bg-surface-subtle before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-brand hover:bg-surface-subtle',
        )}
      >
        <Avatar name={name} path={c.counterpart?.avatar_path} size="md" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn('truncate text-sm text-ink', unread ? 'font-semibold' : 'font-medium')}>{name}</span>
            <time dateTime={c.lastMessageAt} className="t-meta shrink-0">
              {hydrated ? formatRelative(c.lastMessageAt) : ''}
            </time>
          </div>
          <p className="truncate text-xs text-ink-secondary">
            <span className="text-ink-muted">{c.contractId ? 'Contract' : 'Proposal'} · </span>
            {c.projectTitle}
          </p>
          {c.rail && c.rail.length > 0 && <div className="py-1"><EscrowRail segments={c.rail} size="sm" label={c.projectTitle} /></div>}
          <div className="flex items-center gap-2">
            <span className={cn('line-clamp-1 flex-1 text-sm', unread ? 'text-ink' : 'text-ink-muted', c.lastMessage?.kind === 'system' && 'italic text-ink-muted')}>
              {c.lastMessage?.kind === 'system' && <span className="sr-only">TrustLance update: </span>}
              {preview(c, viewerId)}
            </span>
            {unread && (
              <span className="flex shrink-0 items-center">
                <span className="size-2 rounded-full bg-brand" aria-hidden />
                <span className="sr-only">Unread</span>
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
