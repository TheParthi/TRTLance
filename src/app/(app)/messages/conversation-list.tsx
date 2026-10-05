'use client';

import * as React from 'react';
import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import { MessagesSquare, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState } from '@/components/common/states';
import type { ConversationSummary } from '@/lib/data/messages';
import { getBrowserClient } from '@/lib/supabase/client';
import { ConversationItem } from './conversation-item';

/** Keeps server data fresh: new messages in any of the viewer's conversations, and returning to the tab. */
function useLiveRefresh(viewerId: string) {
  const router = useRouter();
  React.useEffect(() => {
    const supabase = getBrowserClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300);
    };
    const channel = supabase
      .channel(`inbox:${viewerId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refresh)
      .subscribe();
    window.addEventListener('focus', refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      void supabase.removeChannel(channel);
    };
  }, [router, viewerId]);
}

export function ConversationList({ conversations, viewerId }: { conversations: ConversationSummary[] | null; viewerId: string }) {
  const router = useRouter();
  const activeId = useSelectedLayoutSegment();
  const [query, setQuery] = React.useState('');
  useLiveRefresh(viewerId);

  const q = query.trim().toLowerCase();
  const filtered = React.useMemo(
    () =>
      (conversations ?? []).filter((c) =>
        !q ||
        c.projectTitle.toLowerCase().includes(q) ||
        c.counterpart?.display_name.toLowerCase().includes(q) ||
        c.counterpart?.username.toLowerCase().includes(q)),
    [conversations, q],
  );
  const unreadCount = (conversations ?? []).filter((c) => c.unread && c.id !== activeId).length;

  return (
    <section aria-labelledby="messages-title" className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 pb-4 lg:border-b lg:p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h1 id="messages-title" className="t-page-title lg:text-2xl">Messages</h1>
          {unreadCount > 0 && <p className="t-meta">{unreadCount} unread</p>}
        </div>
        {conversations && conversations.length > 0 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <label htmlFor="conversation-search" className="sr-only">Search conversations by name or project</label>
            <Input
              id="conversation-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or project"
              className="pl-9"
              autoComplete="off"
            />
            <p className="sr-only" aria-live="polite">
              {q ? `${filtered.length} conversation${filtered.length === 1 ? '' : 's'} found` : ''}
            </p>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 lg:overflow-y-auto">
        {conversations === null ? (
          <ErrorState
            className="lg:m-4"
            title="Conversations could not be loaded"
            retry={<Button variant="secondary" onClick={() => router.refresh()}>Try again</Button>}
          />
        ) : conversations.length === 0 ? (
          <EmptyState
            className="lg:m-4"
            compact
            icon={MessagesSquare}
            title="No conversations yet"
            description="A conversation starts when a client and a freelancer discuss a proposal. It stays with the project and its contract."
          />
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">No conversations match “{query.trim()}”.</p>
        ) : (
          <ul className="panel divide-y overflow-hidden lg:rounded-none lg:border-0 lg:shadow-none" aria-label="Conversations">
            {filtered.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                viewerId={viewerId}
                active={c.id === activeId}
                unread={c.unread && c.id !== activeId}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
