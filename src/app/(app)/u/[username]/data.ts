import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getMembers, type PublicMember } from '@/lib/data/projects';
import type { Certification, Education, PortfolioItem, Profile, ProfileStats, Review } from '@/lib/types';

export const REVIEW_LIMIT = 50;

/** Basic profile lookup, shared by the page and its metadata. Null for unknown usernames. */
export const getProfileByUsername = cache(async (username: string): Promise<Profile | null> => {
  const name = username.toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(name)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('username', name).maybeSingle<Profile>();
  if (error) throw error;
  return data;
});

export interface PublicProfile {
  profile: Profile;
  stats: ProfileStats | null;
  portfolio: PortfolioItem[];
  education: Education[];
  certifications: Certification[];
  reviews: Review[];
  reviewers: Map<string, PublicMember>;
}

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const profile = await getProfileByUsername(username);
  if (!profile) return null;
  const supabase = await createClient();
  const [stats, portfolio, education, certifications, reviews] = await Promise.all([
    supabase.from('profile_stats').select('*').eq('id', profile.id).maybeSingle<ProfileStats>(),
    supabase.from('portfolio_items').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }),
    supabase.from('education').select('*').eq('user_id', profile.id).order('end_year', { ascending: false, nullsFirst: true }),
    supabase.from('certifications').select('*').eq('user_id', profile.id).order('issued_on', { ascending: false, nullsFirst: false }),
    supabase.from('reviews').select('*').eq('reviewee_id', profile.id).order('created_at', { ascending: false }).limit(REVIEW_LIMIT),
  ]);
  for (const r of [stats, portfolio, education, certifications, reviews]) if (r.error) throw r.error;
  const reviewRows = (reviews.data ?? []) as Review[];
  const reviewers = await getMembers(reviewRows.map((r) => r.reviewer_id));
  return {
    profile,
    stats: stats.data ?? null,
    portfolio: (portfolio.data ?? []) as PortfolioItem[],
    education: (education.data ?? []) as Education[],
    certifications: (certifications.data ?? []) as Certification[],
    reviews: reviewRows,
    reviewers,
  };
}
