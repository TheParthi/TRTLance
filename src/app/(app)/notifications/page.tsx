import type { Metadata } from 'next';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/page-header';
import { loadNotifications } from '@/lib/actions/notifications';
import { requireViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { NotificationCategory } from '@/lib/types';
import { CategoryTabs } from './category-tabs';
import { NotificationFeed } from './feed';
import { isCategory } from './meta';

export const metadata: Metadata = { title: 'Notifications' };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const viewer = await requireViewer('/notifications');
  const { category: requested } = await searchParams;
  const category = isCategory(requested) ? requested : null;
  const supabase = await createClient();

  const [page, unreadRows] = await Promise.all([
    loadNotifications({ category }),
    supabase.from('notifications').select('category').eq('user_id', viewer.id).is('read_at', null).limit(1000)
      .returns<{ category: NotificationCategory }[]>(),
  ]);
  if (!page.ok) throw new Error(page.error.message);
  if (unreadRows.error) throw unreadRows.error;

  const unread: Partial<Record<NotificationCategory | 'all', number>> = { all: unreadRows.data.length };
  for (const row of unreadRows.data) unread[row.category] = (unread[row.category] ?? 0) + 1;

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Updates on your projects, contracts, milestones, payments and disputes."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings/notifications"><Settings /> Preferences</Link>
          </Button>
        }
      />
      <CategoryTabs active={category} unread={unread} />
      <NotificationFeed
        key={category ?? 'all'}
        userId={viewer.id}
        category={category}
        initialItems={page.data.items}
        initialHasMore={page.data.hasMore}
        unreadTotal={category ? unread[category] ?? 0 : unread.all ?? 0}
      />
    </>
  );
}
