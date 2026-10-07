'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { attempt, fail, type ActionResult } from '@/lib/errors';
import { normalizeAmount, parseAmount } from '@/lib/money';
import { ProjectDraft, ProposalInput } from '@/lib/validation';

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw { message: 'TL:not_authenticated', details: 'Sign in to continue.' };
  return { supabase, uid: data.user.id };
}

const amountOrNull = (v: string | null | undefined) => {
  if (!v) return null;
  const coins = parseAmount(v);
  return coins === null ? null : coins.toString();
};

export async function createDraftProject(): Promise<ActionResult<string>> {
  return attempt(async () => {
    const { supabase, uid } = await session();
    const { data, error } = await supabase.from('projects').insert({ client_id: uid }).select('id').single();
    if (error) throw error;
    return data.id as string;
  });
}

/** Autosave for the posting wizard. Only drafts can be edited, and only by their owner (RLS). */
export async function saveDraftProject(id: string, input: ProjectDraft): Promise<ActionResult<{ savedAt: string }>> {
  const parsed = ProjectDraft.safeParse(input);
  if (!parsed.success) return fail('validation', parsed.error.issues[0]?.message ?? 'Check the highlighted fields.');
  const d = parsed.data;
  return attempt(async () => {
    const { supabase } = await session();
    const { data, error } = await supabase
      .from('projects')
      .update({
        title: d.title,
        description: d.description,
        category: d.category || null,
        skills: d.skills,
        budget_amount: amountOrNull(d.budget_amount),
        experience_level: d.experience_level,
        start_date: d.start_date,
        due_date: d.due_date,
        deliverables: d.deliverables,
        milestone_plan: d.milestone_plan.map((m) => ({ title: m.title, description: m.description, amount: amountOrNull(m.amount) })),
        visibility: d.visibility,
        draft_step: d.draft_step,
      })
      .eq('id', id)
      .eq('status', 'draft')
      .select('updated_at')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw { message: 'TL:not_found', details: 'This draft no longer exists or was already published.' };
    return { savedAt: data.updated_at as string };
  });
}

export async function publishProject(id: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.rpc('publish_project', { p_project_id: id });
    if (error) throw error;
    revalidatePath('/projects');
    revalidatePath('/work');
    return null;
  });
}

export async function deleteDraftProject(id: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.from('projects').delete().eq('id', id).eq('status', 'draft');
    if (error) throw error;
    revalidatePath('/projects');
    return null;
  });
}

export async function cancelProject(id: string, reason: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.rpc('cancel_project', { p_project_id: id, p_reason: reason || null });
    if (error) throw error;
    revalidatePath(`/projects/${id}`);
    revalidatePath('/projects');
    return null;
  });
}

export async function recordAttachment(input: { projectId: string; storagePath: string; fileName: string; size: number; mimeType: string }): Promise<ActionResult<string>> {
  if (!input.storagePath.startsWith(`${input.projectId}/`)) return fail('validation', 'Invalid file location.');
  return attempt(async () => {
    const { supabase, uid } = await session();
    const { data, error } = await supabase
      .from('project_attachments')
      .insert({
        project_id: input.projectId,
        uploaded_by: uid,
        storage_path: input.storagePath,
        file_name: input.fileName.slice(0, 200),
        size_bytes: input.size,
        mime_type: (input.mimeType || 'application/octet-stream').slice(0, 120),
      })
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  });
}

export async function removeAttachment(id: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { supabase } = await session();
    const { data } = await supabase.from('project_attachments').select('storage_path').eq('id', id).maybeSingle();
    const { error } = await supabase.from('project_attachments').delete().eq('id', id);
    if (error) throw error;
    if (data?.storage_path) await supabase.storage.from('project-files').remove([data.storage_path]);
    return null;
  });
}

export async function submitProposal(input: unknown): Promise<ActionResult<string>> {
  const parsed = ProposalInput.safeParse(input);
  if (!parsed.success) return fail('validation', parsed.error.issues[0]?.message ?? 'Check the highlighted fields.');
  const p = parsed.data;
  return attempt(async () => {
    const { supabase } = await session();
    const { data, error } = await supabase.rpc('submit_proposal', {
      p_project_id: p.project_id,
      p_cover_letter: p.cover_letter,
      p_amount: normalizeAmount(p.amount.replace(/,/g, '')),
      p_duration_days: p.duration_days,
      p_relevant_skills: p.relevant_skills,
      p_milestones: p.milestones.map((m) => ({
        title: m.title, description: m.description, amount: normalizeAmount(m.amount.replace(/,/g, '')), due_in_days: m.due_in_days,
      })),
    });
    if (error) throw error;
    revalidatePath(`/projects/${p.project_id}`);
    return data as string;
  });
}

export async function withdrawProposal(proposalId: string, projectId: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.rpc('withdraw_proposal', { p_proposal_id: proposalId });
    if (error) throw error;
    revalidatePath(`/projects/${projectId}`);
    return null;
  });
}

export async function declineProposal(proposalId: string, projectId: string, reason: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.rpc('decline_proposal', { p_proposal_id: proposalId, p_reason: reason || null });
    if (error) throw error;
    revalidatePath(`/projects/${projectId}/proposals`);
    return null;
  });
}

/** Hiring. Idempotent in the database: repeating it returns the same contract. */
export async function acceptProposal(proposalId: string): Promise<ActionResult<string>> {
  return attempt(async () => {
    const { supabase } = await session();
    const { data, error } = await supabase.rpc('accept_proposal', { p_proposal_id: proposalId });
    if (error) throw error;
    revalidatePath('/projects');
    revalidatePath('/contracts');
    return data as string;
  });
}

export async function startConversation(proposalId: string): Promise<ActionResult<string>> {
  return attempt(async () => {
    const { supabase } = await session();
    const { data, error } = await supabase.rpc('start_conversation', { p_proposal_id: proposalId });
    if (error) throw error;
    return data as string;
  });
}
