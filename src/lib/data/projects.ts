import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type {
  Category, MilestonePlanItem, Profile, ProfileStats, Project, ProjectAttachment, ProjectSearchRow, Proposal, ProposalMilestone, RiskReport,
} from '@/lib/types';

export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from('categories').select('slug, label, description').order('sort_order');
  if (error) throw error;
  return data ?? [];
});

export interface ProjectFilters {
  q?: string;
  category?: string;
  skills?: string[];
  min?: string;
  max?: string;
  experience?: string;
  sort?: string;
  page?: number;
}

export const PAGE_SIZE = 12;

export async function searchProjects(f: ProjectFilters) {
  const supabase = await createClient();
  const page = Math.max(1, f.page ?? 1);
  const { data, error } = await supabase.rpc('search_projects', {
    p_query: f.q || null,
    p_category: f.category || null,
    p_skills: f.skills?.length ? f.skills : null,
    p_min: f.min ? Number(f.min) : null,
    p_max: f.max ? Number(f.max) : null,
    p_experience: f.experience || null,
    p_sort: f.sort || (f.q ? 'relevance' : 'newest'),
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw error;
  const rows = (data ?? []) as ProjectSearchRow[];
  return { rows, total: rows[0]?.total_count ?? 0, page };
}

export type PublicMember = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_path' | 'headline' | 'location' | 'created_at' | 'skills'> & {
  stats: ProfileStats | null;
};

export async function getMembers(ids: string[]): Promise<Map<string, PublicMember>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return new Map();
  const supabase = await createClient();
  const [{ data: profiles }, { data: stats }] = await Promise.all([
    supabase.from('profiles').select('id, username, display_name, avatar_path, headline, location, created_at, skills').in('id', unique),
    supabase.from('profile_stats').select('*').in('id', unique),
  ]);
  const statMap = new Map((stats ?? []).map((s) => [s.id as string, s as ProfileStats]));
  return new Map((profiles ?? []).map((p) => [p.id as string, { ...(p as PublicMember), stats: statMap.get(p.id as string) ?? null }]));
}

export const getProject = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: project } = await supabase.from('projects').select('*').eq('id', id).maybeSingle<Project>();
  if (!project) return null;
  const [attachments, report, members] = await Promise.all([
    supabase.from('project_attachments').select('*').eq('project_id', id).order('created_at'),
    supabase.from('ai_risk_reports').select('*').eq('project_id', id).order('generated_at', { ascending: false }).limit(1).maybeSingle<RiskReport>(),
    getMembers([project.client_id]),
  ]);
  return {
    project,
    attachments: (attachments.data ?? []) as ProjectAttachment[],
    riskReport: report.data ?? null,
    client: members.get(project.client_id) ?? null,
  };
});

export type ProposalWithMilestones = Proposal & { milestones: ProposalMilestone[] };

export async function getProposalsForProject(projectId: string): Promise<ProposalWithMilestones[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('proposals')
    .select('*, milestones:proposal_milestones(*)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, milestones: [...(p.milestones ?? [])].sort((a: ProposalMilestone, b: ProposalMilestone) => a.position - b.position) })) as ProposalWithMilestones[];
}

export async function getMyProposal(projectId: string, userId: string): Promise<ProposalWithMilestones | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('proposals')
    .select('*, milestones:proposal_milestones(*)')
    .eq('project_id', projectId)
    .eq('freelancer_id', userId)
    .maybeSingle();
  if (!data) return null;
  return { ...data, milestones: [...(data.milestones ?? [])].sort((a: ProposalMilestone, b: ProposalMilestone) => a.position - b.position) } as ProposalWithMilestones;
}

/** Suggested milestone plans for a set of projects, keyed by id — for drawing their rails in lists. */
export async function getMilestonePlans(ids: string[]): Promise<Map<string, MilestonePlanItem[]>> {
  if (!ids.length) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from('projects').select('id, milestone_plan').in('id', ids).returns<{ id: string; milestone_plan: MilestonePlanItem[] | null }[]>();
  return new Map((data ?? []).map((r) => [r.id, r.milestone_plan ?? []]));
}
