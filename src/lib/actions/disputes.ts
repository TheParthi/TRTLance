'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { attempt, fail, type ActionResult } from '@/lib/errors';

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw { message: 'TL:not_authenticated', details: 'Sign in to continue.' };
  return { supabase, uid: data.user.id };
}

const Uuid = z.string().uuid();

function firstIssue(error: z.ZodError) {
  return fail('validation', error.issues[0]?.message ?? 'Check the highlighted fields.');
}

function revalidateCase(disputeId: string, contractId?: string) {
  revalidatePath(`/disputes/${disputeId}`);
  revalidatePath(`/arbitration/cases/${disputeId}`);
  revalidatePath('/disputes');
  revalidatePath('/arbitration');
  revalidatePath('/admin');
  if (contractId) revalidatePath(`/contracts/${contractId}`);
}

// ---------------------------------------------------------------------------
// Parties
// ---------------------------------------------------------------------------

const OpenInput = z.object({
  contractId: Uuid,
  milestoneId: Uuid,
  reason: z.enum(['quality', 'scope', 'deadline', 'non_responsive', 'non_payment', 'other'], { message: 'Choose a reason.' }),
  description: z.string().trim().min(50, 'Describe the problem in at least 50 characters.').max(5000, 'Keep the description under 5,000 characters.'),
  requestedOutcome: z.enum(['release', 'refund', 'partial'], { message: 'Choose the outcome you are asking for.' }),
  requestedFreelancerPct: z.number().int().min(1).max(99).nullable(),
  idempotencyKey: z.string().min(8).max(100),
}).refine((v) => v.requestedOutcome !== 'partial' || v.requestedFreelancerPct !== null, {
  message: 'For a partial outcome, choose the freelancer’s share (1–99%).',
});

/** Opens a dispute. Idempotent: retrying with the same key returns the same dispute. */
export async function openDispute(input: z.input<typeof OpenInput>): Promise<ActionResult<string>> {
  const parsed = OpenInput.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const d = parsed.data;
  return attempt(async () => {
    const { supabase } = await session();
    const { data, error } = await supabase.rpc('open_dispute', {
      p_contract_id: d.contractId,
      p_milestone_id: d.milestoneId,
      p_reason: d.reason,
      p_description: d.description,
      p_requested_outcome: d.requestedOutcome,
      p_requested_freelancer_pct: d.requestedOutcome === 'partial' ? d.requestedFreelancerPct : null,
      p_idempotency_key: d.idempotencyKey,
    });
    if (error) throw error;
    const id = data as string;
    revalidateCase(id, d.contractId);
    return id;
  });
}

const EvidenceItem = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('file'),
    title: z.string().trim().min(3, 'Give each item a title of at least 3 characters.').max(160),
    description: z.string().trim().max(3000).default(''),
    storagePath: z.string().min(3).max(400),
    fileName: z.string().min(1).max(200),
    size: z.number().int().min(1).max(52428800, 'Files can be up to 50 MB.'),
    mimeType: z.string().max(120).default(''),
  }),
  z.object({
    kind: z.literal('link'),
    title: z.string().trim().min(3, 'Give each item a title of at least 3 characters.').max(160),
    description: z.string().trim().max(3000).default(''),
    url: z.string().trim().max(500).regex(/^https?:\/\/\S{3,}$/, 'Links must start with http:// or https://.'),
  }),
  z.object({
    kind: z.literal('note'),
    title: z.string().trim().min(3, 'Give each item a title of at least 3 characters.').max(160),
    description: z.string().trim().min(10, 'Notes need at least 10 characters.').max(3000),
  }),
]);
export type EvidenceInput = z.input<typeof EvidenceItem>;

/** Records evidence. Files must already be uploaded to dispute-evidence/<disputeId>/… from the browser. */
export async function addEvidence(disputeId: string, items: EvidenceInput[]): Promise<ActionResult<number>> {
  if (!Uuid.safeParse(disputeId).success) return fail('validation', 'Invalid dispute.');
  const parsed = z.array(EvidenceItem).min(1, 'Add at least one item.').max(30).safeParse(items);
  if (!parsed.success) return firstIssue(parsed.error);
  for (const item of parsed.data) {
    if (item.kind === 'file' && !item.storagePath.startsWith(`${disputeId}/`)) return fail('validation', 'Invalid file location.');
  }
  return attempt(async () => {
    const { supabase, uid } = await session();
    const rows = parsed.data.map((item) => ({
      dispute_id: disputeId,
      submitted_by: uid,
      kind: item.kind,
      title: item.title,
      description: item.description,
      url: item.kind === 'link' ? item.url : null,
      storage_path: item.kind === 'file' ? item.storagePath : null,
      file_name: item.kind === 'file' ? item.fileName.slice(0, 200) : null,
      size_bytes: item.kind === 'file' ? item.size : null,
      mime_type: item.kind === 'file' ? (item.mimeType || 'application/octet-stream').slice(0, 120) : null,
    }));
    const { error } = await supabase.from('dispute_evidence').insert(rows);
    if (error) throw error;
    revalidateCase(disputeId);
    return rows.length;
  });
}

const Escalate = z.string().trim().min(10, 'Explain why this needs escalation (at least 10 characters).').max(2000);

export async function escalateDispute(disputeId: string, reason: string): Promise<ActionResult<null>> {
  if (!Uuid.safeParse(disputeId).success) return fail('validation', 'Invalid dispute.');
  const parsed = Escalate.safeParse(reason);
  if (!parsed.success) return firstIssue(parsed.error);
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.rpc('escalate_dispute', { p_dispute_id: disputeId, p_reason: parsed.data });
    if (error) throw error;
    revalidateCase(disputeId);
    return null;
  });
}

// ---------------------------------------------------------------------------
// Arbitrator / admin case handling
// ---------------------------------------------------------------------------

export async function startDisputeReview(disputeId: string): Promise<ActionResult<null>> {
  if (!Uuid.safeParse(disputeId).success) return fail('validation', 'Invalid dispute.');
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.rpc('start_dispute_review', { p_dispute_id: disputeId });
    if (error) throw error;
    revalidateCase(disputeId);
    return null;
  });
}

const RequestEvidence = z.object({
  message: z.string().trim().min(10, 'Explain what is needed (at least 10 characters).').max(2000),
  days: z.number().int().min(1, 'Give 1–7 days.').max(7, 'Give 1–7 days.'),
});

export async function requestMoreEvidence(disputeId: string, input: z.input<typeof RequestEvidence>): Promise<ActionResult<null>> {
  if (!Uuid.safeParse(disputeId).success) return fail('validation', 'Invalid dispute.');
  const parsed = RequestEvidence.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.rpc('request_more_evidence', {
      p_dispute_id: disputeId, p_message: parsed.data.message, p_days: parsed.data.days,
    });
    if (error) throw error;
    revalidateCase(disputeId);
    return null;
  });
}

const Decide = z.object({
  decision: z.enum(['freelancer', 'client', 'partial'], { message: 'Choose an outcome.' }),
  freelancerPct: z.number().int().min(1).max(99).nullable(),
  reason: z.string().trim().min(50, 'Explain the decision in at least 50 characters. Both parties will read it.').max(5000),
}).refine((v) => v.decision !== 'partial' || v.freelancerPct !== null, { message: 'A partial outcome needs a freelancer share of 1–99%.' });

export async function decideDispute(disputeId: string, input: z.input<typeof Decide>): Promise<ActionResult<null>> {
  if (!Uuid.safeParse(disputeId).success) return fail('validation', 'Invalid dispute.');
  const parsed = Decide.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const d = parsed.data;
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.rpc('decide_dispute', {
      p_dispute_id: disputeId,
      p_decision: d.decision,
      p_freelancer_pct: d.decision === 'partial' ? d.freelancerPct : null,
      p_reason: d.reason,
    });
    if (error) throw error;
    revalidateCase(disputeId);
    return null;
  });
}

// ---------------------------------------------------------------------------
// Arbitrator programme
// ---------------------------------------------------------------------------

const Apply = z.object({
  specializations: z.array(z.string().regex(/^[a-z0-9-]{2,40}$/)).min(1, 'Choose one to three specialisations.').max(3, 'Choose one to three specialisations.'),
  statement: z.string().trim().min(50, 'Tell us about your experience (at least 50 characters).').max(2000),
  capacity: z.number().int().min(1, 'Capacity is 1–10 cases.').max(10, 'Capacity is 1–10 cases.'),
});

export async function applyAsArbitrator(input: z.input<typeof Apply>): Promise<ActionResult<null>> {
  const parsed = Apply.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.rpc('apply_as_arbitrator', {
      p_specializations: parsed.data.specializations, p_statement: parsed.data.statement, p_capacity: parsed.data.capacity,
    });
    if (error) throw error;
    revalidatePath('/arbitration');
    revalidatePath('/admin');
    return null;
  });
}

export async function setArbitratorAvailability(available: boolean, capacity: number | null): Promise<ActionResult<null>> {
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 10)) return fail('validation', 'Capacity is 1–10 cases.');
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.rpc('set_arbitrator_availability', { p_available: available, p_capacity: capacity });
    if (error) throw error;
    revalidatePath('/arbitration');
    return null;
  });
}

export async function adminReviewArbitrator(userId: string, approve: boolean, note: string): Promise<ActionResult<null>> {
  if (!Uuid.safeParse(userId).success) return fail('validation', 'Invalid applicant.');
  if (note.length > 1000) return fail('validation', 'Keep the note under 1,000 characters.');
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.rpc('admin_review_arbitrator', { p_user_id: userId, p_approve: approve, p_note: note.trim() || null });
    if (error) throw error;
    revalidatePath('/admin');
    return null;
  });
}

export async function adminAssignArbitrator(disputeId: string, arbitratorId: string): Promise<ActionResult<null>> {
  if (!Uuid.safeParse(disputeId).success || !Uuid.safeParse(arbitratorId).success) return fail('validation', 'Choose an arbitrator.');
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.rpc('admin_assign_arbitrator', { p_dispute_id: disputeId, p_arbitrator_id: arbitratorId });
    if (error) throw error;
    revalidateCase(disputeId);
    return null;
  });
}
