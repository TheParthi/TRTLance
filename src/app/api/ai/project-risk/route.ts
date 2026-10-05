import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AI_MODEL, isAiConfigured } from '@/ai/genkit';
import { projectRiskFlow, type ProjectRiskInput } from '@/ai/flows/project-risk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { jsonError, rateLimit } from '@/lib/api';
import { normalizeAmount } from '@/lib/money';
import type { Project } from '@/lib/types';

const Body = z.object({ projectId: z.string().uuid() });
export const maxDuration = 60;

/**
 * Generates (or returns the cached) AI risk review for a published project. One review per
 * version of the project, shared by every viewer. Failures are reported — never replaced
 * with a made-up result.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return jsonError(401, 'not_authenticated', 'Sign in to request an AI review.');
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, 'validation', 'Invalid request.');

  const { data: project } = await supabase.from('projects').select('*').eq('id', parsed.data.projectId).maybeSingle<Project>();
  if (!project || project.status === 'draft') return jsonError(404, 'not_found', 'Project not found.');

  const input: ProjectRiskInput = {
    title: project.title,
    description: project.description,
    category: project.category ?? 'unspecified',
    skills: project.skills,
    experience_level: project.experience_level ?? 'unspecified',
    budget: normalizeAmount(project.budget_amount),
    currency: project.currency,
    start_date: project.start_date ?? 'not given',
    due_date: project.due_date ?? 'not given',
    deliverables: project.deliverables,
    milestone_plan: (project.milestone_plan ?? []).map((m) => ({ title: m.title, amount: normalizeAmount(m.amount), description: m.description })),
  };
  const inputHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');

  const admin = createAdminClient();
  const { data: cached } = await admin.from('ai_risk_reports').select('*').eq('project_id', project.id).eq('input_hash', inputHash).maybeSingle();
  if (cached) return NextResponse.json({ report: cached, cached: true });

  if (!isAiConfigured()) return jsonError(503, 'ai_unavailable', 'AI reviews are not available on this server right now.');
  const limited = await rateLimit('ai_project_risk', auth.user.id, 10, 3600);
  if (limited) return limited;

  let result;
  try {
    result = await projectRiskFlow(input);
  } catch (error) {
    console.error('[ai] project risk failed', error);
    return jsonError(502, 'ai_failed', 'The AI review could not be generated. Nothing was saved. Try again later.');
  }

  const { data: saved, error } = await admin
    .from('ai_risk_reports')
    .upsert({
      project_id: project.id,
      input_hash: inputHash,
      model: AI_MODEL,
      analyzed_fields: Object.keys(input),
      result,
      requested_by: auth.user.id,
    }, { onConflict: 'project_id,input_hash' })
    .select('*')
    .single();
  if (error) {
    console.error('[ai] save failed', error);
    return jsonError(500, 'unexpected', 'The review was generated but could not be saved. Try again.');
  }
  return NextResponse.json({ report: saved, cached: false });
}
