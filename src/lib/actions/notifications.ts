'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { attempt, fail, type ActionResult } from '@/lib/errors';
import type { Notification, NotificationCategory } from '@/lib/types';

const CATEGORIES: NotificationCategory[] = ['projects', 'contracts', 'milestones', 'payments', 'messages', 'disputes', 'security', 'system'];
const PAGE_SIZE = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw { message: 'TL:not_authenticated', details: 'Sign in to continue.' };
  return { supabase, uid: data.user.id };
}

export interface NotificationPage {
  items: Notification[];
  hasMore: boolean;
}

/** A page of the viewer's notifications, newest first, optionally one category and older than `before`. */
export async function loadNotifications(input: { category?: string | null; before?: string | null }): Promise<ActionResult<NotificationPage>> {
  const category = input.category && CATEGORIES.includes(input.category as NotificationCategory) ? input.category : null;
  if (input.before && Number.isNaN(Date.parse(input.before))) return fail('validation', 'Invalid page cursor.');
  return attempt(async () => {
    const { supabase, uid } = await session();
    let query = supabase.from('notifications').select('*').eq('user_id', uid);
    if (category) query = query.eq('category', category);
    if (input.before) query = query.lt('created_at', input.before);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(PAGE_SIZE + 1).returns<Notification[]>();
    if (error) throw error;
    const rows = data ?? [];
    return { items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
  });
}

/** Marks the given notifications read, or all of them when `ids` is null. */
export async function markNotificationsRead(ids: string[] | null): Promise<ActionResult<null>> {
  if (ids && (ids.length === 0 || ids.length > 100 || ids.some((id) => !UUID.test(id)))) return fail('validation', 'Invalid notification.');
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.rpc('mark_notifications_read', { p_ids: ids });
    if (error) throw error;
    revalidatePath('/notifications');
    return null;
  });
}

export async function deleteNotification(id: string): Promise<ActionResult<null>> {
  if (!UUID.test(id)) return fail('validation', 'Invalid notification.');
  return attempt(async () => {
    const { supabase, uid } = await session();
    const { error } = await supabase.from('notifications').delete().eq('id', id).eq('user_id', uid);
    if (error) throw error;
    revalidatePath('/notifications');
    return null;
  });
}
