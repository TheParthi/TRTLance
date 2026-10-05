import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Arbitrator, Profile, ProfileStats } from '@/lib/types';

export interface Viewer {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
  profile: Profile;
  stats: ProfileStats;
  wallet: { address: string; chain_id: number; verified_at: string } | null;
  isAdmin: boolean;
  arbitrator: Arbitrator | null;
  unreadNotifications: number;
}

/** The signed-in user with their profile, verified server-side. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const uid = auth.user.id;
  const [profile, stats, wallet, admin, arbitrator, unread] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
    supabase.from('profile_stats').select('*').eq('id', uid).maybeSingle(),
    supabase.from('wallets').select('address, chain_id, verified_at').eq('user_id', uid).maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', uid).maybeSingle(),
    supabase.from('arbitrators').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).is('read_at', null),
  ]);
  if (!profile.data || !stats.data) return null;
  return {
    id: uid,
    email: auth.user.email ?? null,
    emailConfirmed: Boolean(auth.user.email_confirmed_at),
    profile: profile.data as Profile,
    stats: stats.data as ProfileStats,
    wallet: wallet.data ?? null,
    isAdmin: Boolean(admin.data),
    arbitrator: (arbitrator.data as Arbitrator | null) ?? null,
    unreadNotifications: unread.count ?? 0,
  };
});

/** For pages that require a session: redirects to sign-in, then to onboarding if unfinished. */
export async function requireViewer(path: string, opts: { allowOnboarding?: boolean } = {}) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!opts.allowOnboarding && !viewer.profile.onboarding_completed_at) redirect('/onboarding');
  return viewer;
}

export async function requireAdmin(path: string) {
  const viewer = await requireViewer(path);
  if (!viewer.isAdmin) redirect('/dashboard');
  return viewer;
}

export function canHire(viewer: Pick<Viewer, 'profile'>) {
  return viewer.profile.intent !== 'work';
}

export function canWork(viewer: Pick<Viewer, 'profile'>) {
  return viewer.profile.intent !== 'hire';
}
