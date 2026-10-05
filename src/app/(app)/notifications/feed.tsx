'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Ledger } from '@/components/common/ledger';
import { EmptyState } from '@/components/common/states';
import { toast } from '@/components/ui/toaster';
import { deleteNotification, loadNotifications, markNotificationsRead } from '@/lib/actions/notifications';
import { getBrowserClient } from '@/lib/supabase/client';
import type { Notification, NotificationCategory } from '@/lib/types';
import { useHydrated } from '../messages/use-hydrated';
import { CATEGORY_META, groupByDay, type NotificationGroup } from './meta';
import { NotificationItem } from './notification-item';

/** Days are grouped in this zone while server rendering, then in the viewer's own zone once hydrated. */
const SERVER_TIME_ZONE = 'Asia/Kolkata';

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
  const hydrated = useHydrated();
  const [items, setItems] = React.useState(initialItems);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [markingAll, setMarkingAll] = React.useState(false);
  const [busy, setBusy] = React.useState<Set<string>>(() => new Set());
  // Anything newer than what the page opened with arrived live and rises into place.
  const [openedWith] = React.useState(() => initialItems[0]?.created_at ?? '');

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

  async function markRead(group: NotificationGroup, quiet = false) {
    const ids = group.items.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n)));
    const res = await markNotificationsRead(ids);
    if (!res.ok && !quiet) toast.error(res.error.message);
  }

  async function remove(group: NotificationGroup) {
    const key = group.lead.id;
    setBusyFor(key, true);
    const removed: string[] = [];
    let failure: string | null = null;
    for (const n of group.items) {
      const res = await deleteNotification(n.id);
      if (res.ok) removed.push(n.id);
      else {
        failure = res.error.message;
        break;
      }
    }
    setBusyFor(key, false);
    if (removed.length) setItems((prev) => prev.filter((n) => !removed.includes(n.id)));
    if (failure) return void toast.error(failure);
    toast.success(removed.length > 1 ? `${removed.length} notifications deleted` : 'Notification deleted');
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
  const timeZone = hydrated ? undefined : SERVER_TIME_ZONE;
  const days = React.useMemo(() => groupByDay(items, timeZone), [items, timeZone]);

  return (
    <div className="min-w-0 space-y-4">
      {items.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="t-meta" aria-live="polite">
            {items.length ? `${items.length}${hasMore ? '+' : ''} notification${items.length === 1 ? '' : 's'}` : ''}
          </p>
          <Button variant="ghost" size="sm" onClick={() => void markAll()} loading={markingAll} disabled={!anyUnread}>
            {!markingAll && <CheckCheck />} Mark all as read
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          compact
          title={scope ? `No ${scope} notifications` : 'You’re all caught up'}
          description="Updates about your projects, contracts, payments and disputes will appear here."
          action={scope ? { label: 'Show all notifications', href: '/notifications' } : undefined}
        />
      ) : (
        <div className="space-y-8">
          {days.map((day) => (
            <Ledger key={day.key} id={`day-${day.key}`} title={day.label}>
              {day.groups.map((g) => (
                <NotificationItem
                  key={g.lead.id}
                  group={g}
                  busy={busy.has(g.lead.id)}
                  timeZone={timeZone}
                  fresh={Boolean(openedWith) && g.lead.created_at > openedWith}
                  onOpen={() => void markRead(g, true)}
                  onMarkRead={() => void markRead(g)}
                  onDelete={() => void remove(g)}
                />
              ))}
            </Ledger>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="secondary" onClick={() => void loadMore()} loading={loadingMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
