import type { Metadata } from 'next';
import { NotificationPreferences } from '@/components/settings/notification-preferences';
import { requireViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Notifications' };

export default async function NotificationSettingsPage() {
  const viewer = await requireViewer('/settings/notifications');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_private')
    .select('muted_notification_categories')
    .eq('id', viewer.id)
    .maybeSingle<{ muted_notification_categories: string[] }>();
  if (error) throw error;
  return <NotificationPreferences muted={data?.muted_notification_categories ?? []} />;
}
