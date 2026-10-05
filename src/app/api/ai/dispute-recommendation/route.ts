import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AI_MODEL, isAiConfigured } from '@/ai/genkit';
import { disputeRecommendationFlow, type DisputeRecommendationInput } from '@/ai/flows/dispute-recommendation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { jsonError, rateLimit } from '@/lib/api';
import { normalizeAmount } from '@/lib/money';
import type {
  Contract, Dispute, DisputeEvidence, DisputeMessage, Milestone, MilestoneSubmission,
} from '@/lib/types';

const Body = z.object({ disputeId: z.string().uuid() });
export const maxDuration = 60;

const MESSAGE_LIMIT = 50;
const clip = (s: string | null | undefined, n: number) => (s ?? '').slice(0, n);

/**
 * Generates an advisory AI recommendation for a dispute. Only the assigned arbitrator or a platform
 * admin may request one. Failures are reported honestly — nothing is saved unless the model answered.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return jsonError(401, 'not_authenticated', 'Sign in to request an AI recommendation.');
  const uid = auth.user.id;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, 'validation', 'Invalid request.');

  const [{ data: dispute }, { data: admin }] = await Promise.all([
    supabase.from('disputes').select('*').eq('id', parsed.data.disputeId).maybeSingle<Dispute>(),
    supabase.from('platform_admins').select('user_id').eq('user_id', uid).maybeSingle(),
  ]);
  if (!dispute || (dispute.arbitrator_id !== uid && !admin)) return jsonError(404, 'not_found', 'Case not found.');
  if (dispute.status === 'resolved') return jsonError(409, 'invalid_state', 'This case is already decided.');

  if (!isAiConfigured()) return jsonError(503, 'ai_unavailable', 'AI recommendations are not available on this server right now. You can decide the case without one.');
  const limited = await rateLimit('ai_dispute_recommendation', uid, 6, 3600);
  if (limited) return limited;

  const [contract, milestone, submissions, evidence, messages] = await Promise.all([
    supabase.from('contracts').select('*').eq('id', dispute.contract_id).maybeSingle<Contract>(),
    supabase.from('milestones').select('*').eq('id', dispute.milestone_id).maybeSingle<Milestone>(),
    supabase.from('milestone_submissions').select('*').eq('milestone_id', dispute.milestone_id).order('version').returns<MilestoneSubmission[]>(),
    supabase.from('dispute_evidence').select('*').eq('dispute_id', dispute.id).order('created_at').limit(100).returns<DisputeEvidence[]>(),
    supabase.from('dispute_messages').select('*').eq('dispute_id', dispute.id).eq('kind', 'text')
      .order('created_at', { ascending: false }).limit(MESSAGE_LIMIT).returns<DisputeMessage[]>(),
  ]);
  if (!contract.data || !milestone.data || submissions.error || evidence.error || messages.error) {
    return jsonError(503, 'unavailable', 'The case file could not be loaded. Nothing was generated. Try again.');
  }
  const c = contract.data;
  const m = milestone.data;
  const roleOf = (id: string | null) =>
    id === c.client_id ? 'client' as const : id === c.freelancer_id ? 'freelancer' as const : id === dispute.arbitrator_id ? 'arbitrator' as const : 'platform' as const;

  const evidenceRows = evidence.data ?? [];
  const messageRows = (messages.data ?? []).reverse();
  const submissionRows = submissions.data ?? [];
  const respondentNotes = evidenceRows.filter((e) => e.kind === 'note' && e.submitted_by === dispute.respondent_id);

  const input: DisputeRecommendationInput = {
    currency: c.currency,
    contract: {
      title: clip(c.title, 300),
      scope: clip(c.scope, 6000),
      deliverables: c.deliverables.map((d) => clip(d, 300)),
      total_amount: normalizeAmount(c.total_amount),
      payment_terms: clip(c.terms?.payment_terms, 2000),
    },
    milestone: {
      position: m.position,
      title: clip(m.title, 300),
      description: clip(m.description, 3000),
      amount: normalizeAmount(m.amount),
      due_date: m.due_date ?? `day ${m.due_in_days} of the contract`,
      status_before_dispute: m.status_before_dispute ?? 'unknown',
      revision_count: m.revision_count,
    },
    dispute: {
      reason: dispute.reason,
      raised_by: roleOf(dispute.raised_by),
      opening_statement: clip(dispute.description, 5000),
      requested_outcome: dispute.requested_outcome,
      requested_freelancer_pct: dispute.requested_freelancer_pct,
      opened_at: dispute.created_at,
    },
    respondent_notes: respondentNotes.map((n) => ({ title: clip(n.title, 160), text: clip(n.description, 3000) })),
    submissions: submissionRows.map((s) => ({
      version: s.version,
      note: clip(s.note, 3000),
      links: s.links.map((l) => clip(l, 300)),
      review_status: s.review_status,
      review_comment: clip(s.review_comment, 2000),
      submitted_at: s.created_at,
    })),
    evidence: evidenceRows.map((e) => ({
      submitted_by: roleOf(e.submitted_by),
      kind: e.kind,
      title: clip(e.title, 160),
      description: clip(e.description, 2000),
      link: clip(e.url, 500),
      file_name: clip(e.file_name, 200),
    })),
    messages: messageRows.map((msg) => ({ from: roleOf(msg.sender_id), text: clip(msg.body, 1500), at: msg.created_at })),
  };

  const sources = ['contract_terms', 'milestone', 'dispute_statement'];
  if (respondentNotes.length) sources.push(`respondent_notes:${respondentNotes.length}`);
  if (submissionRows.length) sources.push(`submissions:${submissionRows.length}`);
  if (evidenceRows.length) sources.push(`evidence:${evidenceRows.length}`);
  if (messageRows.length) sources.push(`messages:${messageRows.length}`);

  let result;
  try {
    result = await disputeRecommendationFlow(input);
  } catch (error) {
    console.error('[ai] dispute recommendation failed', error);
    return jsonError(502, 'ai_failed', 'The AI recommendation could not be generated. Nothing was saved. Try again later.');
  }

  const { data: saved, error } = await createAdminClient()
    .from('ai_dispute_recommendations')
    .insert({ dispute_id: dispute.id, model: AI_MODEL, analyzed_sources: sources, result, requested_by: uid })
    .select('*')
    .single();
  if (error) {
    console.error('[ai] save failed', error);
    return jsonError(500, 'unexpected', 'The recommendation was generated but could not be saved. Try again.');
  }
  return NextResponse.json({ recommendation: saved });
}
