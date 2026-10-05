'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { attempt, fail, type ActionResult } from '@/lib/errors';

async function rpc<T>(name: string, args: Record<string, unknown>, contractId: string): Promise<T> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath('/contracts');
  revalidatePath('/dashboard');
  return data as T;
}

export async function signContract(contractId: string, fullName: string, termsHash: string): Promise<ActionResult<string>> {
  if (fullName.trim().length < 2) return fail('validation', 'Type your full name to sign.');
  return attempt(() => rpc<string>('sign_contract', { p_contract_id: contractId, p_full_name: fullName.trim(), p_terms_hash: termsHash }, contractId));
}

export async function cancelContract(contractId: string, reason: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    await rpc('cancel_contract', { p_contract_id: contractId, p_reason: reason }, contractId);
    return null;
  });
}

const FileMeta = z.object({
  storage_path: z.string().max(400),
  file_name: z.string().min(1).max(200),
  size_bytes: z.number().int().positive().max(52428800),
  mime_type: z.string().max(120),
});

export async function submitMilestone(contractId: string, milestoneId: string, input: { note: string; links: string[]; files: z.infer<typeof FileMeta>[] }): Promise<ActionResult<string>> {
  const files = z.array(FileMeta).max(10).safeParse(input.files);
  if (!files.success) return fail('validation', 'Some attachments are invalid.');
  if (files.data.some((f) => !f.storage_path.startsWith(`${contractId}/`))) return fail('validation', 'Attachments must belong to this contract.');
  return attempt(() => rpc<string>('submit_milestone', {
    p_milestone_id: milestoneId,
    p_note: input.note,
    p_links: input.links.map((l) => l.trim()).filter(Boolean),
    p_files: files.data,
  }, contractId));
}

export async function requestRevision(contractId: string, milestoneId: string, comment: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    await rpc('request_revision', { p_milestone_id: milestoneId, p_comment: comment }, contractId);
    return null;
  });
}

export async function approveMilestone(contractId: string, milestoneId: string): Promise<ActionResult<{ position: number; amount: string; escrow_key: string | null }>> {
  return attempt(() => rpc('approve_milestone', { p_milestone_id: milestoneId }, contractId));
}

export async function submitReview(contractId: string, input: { rating: number; ratings: Record<string, number>; body: string }): Promise<ActionResult<string>> {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return fail('validation', 'Choose an overall rating.');
  return attempt(() => rpc<string>('submit_review', { p_contract_id: contractId, p_rating: input.rating, p_ratings: input.ratings, p_body: input.body }, contractId));
}
