'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BellOff, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/states';
import { toast } from '@/components/ui/toaster';
import { deleteNotification, loadNotifications, markNotificationsRead } from '@/lib/actions/notifications';
import { getBrowserClient } from '@/lib/supabase/client';
import type { Notification, NotificationCategory } from '@/lib/types';
import { CATEGORY_META } from './meta';
import { NotificationItem } from './notification-item';

function merge(fresh: Notification[], prev: Notification[]) {
  const byId = new Map(prev.map((n) => [n.id, n]));
  for (const n of fresh) byId.set(n.id, n);
  return Array.from(byId.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function NotificationFeed({ userId, category, initialItems, initialHasMore, unreadTotal }: {
  userId: string;
  category: NotificationCategory | null;
  initialItems: Notification[];
  initialHasMore: boolean;
  unreadTotal: number;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [markingAll, setMarkingAll] = React.useState(false);
  const [busy, setBusy] = React.useState<Set<string>>(() => new Set());

  // A server refresh brings the newest page; keep older pages already loaded.
  React.useEffect(() => {
    setItems((prev) => merge(initialItems, prev));
  }, [initialItems]);

  React.useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`notifications-page:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => router.refresh())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  const setBusyFor = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  async function markRead(id: string, quiet = false) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)));
    const res = await markNotificationsRead([id]);
    if (!res.ok && !quiet) toast.error(res.error.message);
  }

  async function remove(id: string) {
    setBusyFor(id, true);
    const res = await deleteNotification(id);
    setBusyFor(id, false);
    if (!res.ok) return void toast.error(res.error.message);
    setItems((prev) => prev.filter((n) => n.id !== id));
    toast.success('Notification deleted');
  }

  async function markAll() {
    setMarkingAll(true);
    const res = await markNotificationsRead(null);
    setMarkingAll(false);
    if (!res.ok) return void toast.error(res.error.message);
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    toast.success('All notifications marked as read');
    router.refresh();
  }

  async function loadMore() {
    const last = items[items.length - 1];
    if (!last) return;
    setLoadingMore(true);
    const res = await loadNotifications({ category, before: last.created_at });
    setLoadingMore(false);
    if (!res.ok) return void toast.error(res.error.message);
    setItems((prev) => merge(res.data.items, prev));
    setHasMore(res.data.hasMore);
  }

  const anyUnread = unreadTotal > 0 || items.some((n) => !n.read_at);
  const scope = category ? CATEGORY_META[category].label.toLowerCase() : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="t-meta" aria-live="polite">
          {items.length ? `Showing ${items.length}${hasMore ? '+' : ''} notification${items.length === 1 ? '' : 's'}` : ''}
        </p>
        <Button variant="secondary" size="sm" onClick={() => void markAll()} loading={markingAll} disabled={!anyUnread}>
          {!markingAll && <CheckCheck />} Mark all as read
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={scope ? `No ${scope} notifications` : 'You’re all caught up'}
          description="Updates about your projects, contracts, payments and disputes will appear here."
        />
      ) : (
        <ul className="panel divide-y overflow-hidden" aria-label="Notifications">
          {items.map((n) => (
            <NotificationItem
              key={n.id}
              item={n}
              busy={busy.has(n.id)}
              onOpen={() => { if (!n.read_at) void markRead(n.id, true); }}
              onMarkRead={() => void markRead(n.id)}
              onDelete={() => void remove(n.id)}
            />
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => void loadMore()} loading={loadingMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
