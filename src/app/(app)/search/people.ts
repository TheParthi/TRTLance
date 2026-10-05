import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { ExperienceLevel } from '@/lib/types';

export const PEOPLE_PAGE_SIZE = 12;

export interface PersonSearchRow {
  id: string;
  username: string;
  display_name: string;
  headline: string | null;
  avatar_path: string | null;
  skills: string[];
  location: string | null;
  experience_level: ExperienceLevel | null;
  rating_avg: string | null;
  review_count: number;
  completed_as_freelancer: number;
  wallet_verified: boolean;
  email_verified: boolean;
  total_count: number;
}

/** Freelancers (intent work/both, onboarded) matching name, username, headline or a skill. Throws on failure. */
export async function searchPeople(q: string, page = 1) {
  const supabase = await createClient();
  const current = Math.max(1, page);
  const { data, error } = await supabase.rpc('search_people', {
    p_query: q || null,
    p_skills: null,
    p_limit: PEOPLE_PAGE_SIZE,
    p_offset: (current - 1) * PEOPLE_PAGE_SIZE,
  });
  if (error) throw error;
  const rows = (data ?? []) as PersonSearchRow[];
  return { rows, total: Number(rows[0]?.total_count ?? 0), page: current };
}
