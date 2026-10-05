'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { attempt, fail, type ActionResult } from '@/lib/errors';
import { ProfileUpdate } from '@/lib/validation';

export async function updateProfile(input: ProfileUpdate): Promise<ActionResult<null>> {
  const parsed = ProfileUpdate.safeParse(input);
  if (!parsed.success) return fail('validation', parsed.error.issues[0]?.message ?? 'Check the highlighted fields.');
  return attempt(async () => {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw { message: 'TL:not_authenticated', details: 'Sign in to continue.' };
    const { error } = await supabase.from('profiles').update(parsed.data).eq('id', auth.user.id);
    if (error) {
      if (error.code === '23505') throw { message: 'TL:username_taken', details: 'That username is taken.' };
      throw error;
    }
    revalidatePath('/', 'layout');
    return null;
  });
}

export async function completeOnboarding(): Promise<ActionResult<null>> {
  return attempt(async () => {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw { message: 'TL:not_authenticated', details: 'Sign in to continue.' };
    const { error } = await supabase.from('profiles')
      .update({ onboarding_completed_at: new Date().toISOString(), onboarding_step: 'done' })
      .eq('id', auth.user.id);
    if (error) throw error;
    revalidatePath('/', 'layout');
    return null;
  });
}

export async function updatePrivate(input: { phone?: string | null; muted_notification_categories?: string[] }): Promise<ActionResult<null>> {
  const allowed = ['projects', 'messages', 'system'];
  if (input.muted_notification_categories?.some((c) => !allowed.includes(c))) return fail('validation', 'Only non-critical categories can be muted.');
  if (input.phone && !/^\+?[0-9 ()-]{6,20}$/.test(input.phone)) return fail('validation', 'Enter a valid phone number.');
  return attempt(async () => {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw { message: 'TL:not_authenticated', details: 'Sign in to continue.' };
    const { error } = await supabase.from('profile_private').update(input).eq('id', auth.user.id);
    if (error) throw error;
    revalidatePath('/settings', 'layout');
    return null;
  });
}
