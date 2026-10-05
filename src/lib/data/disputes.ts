import 'server-only';
import { cache } from 'react';
import { Contract as EthersContract, JsonRpcProvider } from 'ethers';
import abi from '@/lib/chain/escrow-abi.json';
import { createClient } from '@/lib/supabase/server';
import { getMembers, type PublicMember } from '@/lib/data/projects';
import { isEscrowConfigured, publicEnv } from '@/lib/env';
import { BUCKETS } from '@/lib/storage';
import type {
  Arbitrator, Category, Contract, ContractFile, Dispute, DisputeEvent, DisputeEvidence, DisputeMessage,
  DisputeRecommendation, EscrowTransaction, Milestone, MilestoneSubmission,
} from '@/lib/types';

const UUID_RE = /^[0-9a-f-]{36}$/i;
const SIGNED_URL_SECONDS = 900;

/** Plain-object member summary that can cross into client components. */
export interface MemberSummary {
  id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
}

export function toMemberRecord(members: Map<string, PublicMember>): Record<string, MemberSummary> {
  const out: Record<string, MemberSummary> = {};
  for (const [id, m] of members) out[id] = { id, username: m.username, display_name: m.display_name, avatar_path: m.avatar_path };
  return out;
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export type DisputeListItem = Dispute & {
  contract: Pick<Contract, 'id' | 'title' | 'client_id' | 'freelancer_id'> | null;
  milestone: Pick<Milestone, 'id' | 'position' | 'title'> | null;
};

const LIST_SELECT = '*, contract:contracts(id, title, client_id, freelancer_id), milestone:milestones(id, position, title)';

/** Disputes on contracts where the viewer is a party (never cases they only arbitrate or see as admin). */
export async function listPartyDisputes(viewerId: string) {
  const supabase = await createClient();
  const { data: contracts, error: cErr } = await supabase
    .from('contracts')
    .select('id')
    .or(`client_id.eq.${viewerId},freelancer_id.eq.${viewerId}`);
  if (cErr) throw cErr;
  const ids = (contracts ?? []).map((c) => c.id as string);
  if (!ids.length) return { disputes: [] as DisputeListItem[], members: new Map<string, PublicMember>() };
  const { data, error } = await supabase
    .from('disputes')
    .select(LIST_SELECT)
    .in('contract_id', ids)
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<DisputeListItem[]>();
  if (error) throw error;
  const disputes = data ?? [];
  const members = await getMembers(disputes.flatMap((d) => [d.raised_by, d.respondent_id]));
  return { disputes, members };
}

/** Cases assigned to the viewer as arbitrator. */
export async function listArbitratorCases(viewerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('disputes')
    .select(LIST_SELECT)
    .eq('arbitrator_id', viewerId)
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<DisputeListItem[]>();
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// One dispute
// ---------------------------------------------------------------------------

export type EvidenceWithUrl = DisputeEvidence & { url_signed: string | null };

export interface DisputeCase {
  dispute: Dispute;
  contract: Contract;
  projectTitle: string | null;
  milestone: Milestone;
  evidence: EvidenceWithUrl[];
  messages: DisputeMessage[];
  events: DisputeEvent[];
  recommendation: DisputeRecommendation | null;
  transactions: EscrowTransaction[];
  members: Map<string, PublicMember>;
}

/** A dispute with everything a party, the arbitrator or an admin needs. Null when not visible (RLS). */
export const getDisputeCase = cache(async (id: string): Promise<DisputeCase | null> => {
  if (!UUID_RE.test(id)) return null;
  const supabase = await createClient();
  const { data: dispute, error } = await supabase.from('disputes').select('*').eq('id', id).maybeSingle<Dispute>();
  if (error) throw error;
  if (!dispute) return null;

  const [contract, milestone, evidence, messages, events, recommendation, transactions] = await Promise.all([
    supabase.from('contracts').select('*, project:projects(id, title)').eq('id', dispute.contract_id)
      .maybeSingle<Contract & { project: { id: string; title: string } | null }>(),
    supabase.from('milestones').select('*').eq('id', dispute.milestone_id).maybeSingle<Milestone>(),
    supabase.from('dispute_evidence').select('*').eq('dispute_id', id).order('created_at').returns<DisputeEvidence[]>(),
    supabase.from('dispute_messages').select('*').eq('dispute_id', id).order('created_at', { ascending: false }).limit(300)
      .returns<DisputeMessage[]>(),
    supabase.from('dispute_events').select('*').eq('dispute_id', id).order('id').returns<DisputeEvent[]>(),
    supabase.from('ai_dispute_recommendations').select('*').eq('dispute_id', id).order('generated_at', { ascending: false })
      .limit(1).maybeSingle<DisputeRecommendation>(),
    supabase.from('escrow_transactions').select('*').eq('contract_id', dispute.contract_id)
      .eq('milestone_id', dispute.milestone_id).in('kind', ['dispute', 'resolve'])
      .order('created_at', { ascending: false }).returns<EscrowTransaction[]>(),
  ]);
  for (const r of [contract, milestone, evidence, messages, events, transactions]) if (r.error) throw r.error;
  if (!contract.data || !milestone.data) return null;

  const evidenceRows = evidence.data ?? [];
  const paths = evidenceRows.filter((e) => e.storage_path).map((e) => e.storage_path as string);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage.from(BUCKETS.disputeEvidence).createSignedUrls(paths, SIGNED_URL_SECONDS);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }

  const { project, ...contractRow } = contract.data;
  const messageRows = (messages.data ?? []).reverse();
  const eventRows = events.data ?? [];
  const members = await getMembers([
    contractRow.client_id, contractRow.freelancer_id, dispute.raised_by, dispute.respondent_id,
    dispute.arbitrator_id ?? '', dispute.decided_by ?? '',
    ...evidenceRows.map((e) => e.submitted_by),
    ...messageRows.map((m) => m.sender_id ?? ''),
    ...eventRows.map((e) => e.actor_id ?? ''),
    ...eventRows.map((e) => (typeof e.data.arbitrator_id === 'string' ? e.data.arbitrator_id : '')),
  ]);

  return {
    dispute,
    contract: contractRow,
    projectTitle: project?.title ?? null,
    milestone: milestone.data,
    evidence: evidenceRows.map((e) => ({ ...e, url_signed: e.storage_path ? urls.get(e.storage_path) ?? null : null })),
    messages: messageRows,
    events: eventRows,
    recommendation: recommendation.data ?? null,
    transactions: transactions.data ?? [],
    members,
  };
});

export type SubmissionWithFiles = MilestoneSubmission & { files: (ContractFile & { url: string | null })[] };

/** Work submitted for the disputed milestone, with signed download links. */
export async function getMilestoneSubmissions(contractId: string, milestoneId: string): Promise<SubmissionWithFiles[]> {
  const supabase = await createClient();
  const { data: subs, error } = await supabase
    .from('milestone_submissions')
    .select('*')
    .eq('milestone_id', milestoneId)
    .order('version', { ascending: false })
    .returns<MilestoneSubmission[]>();
  if (error) throw error;
  const rows = subs ?? [];
  if (!rows.length) return [];
  const { data: files, error: fErr } = await supabase
    .from('contract_files')
    .select('*')
    .eq('contract_id', contractId)
    .in('submission_id', rows.map((s) => s.id))
    .returns<ContractFile[]>();
  if (fErr) throw fErr;
  const fileRows = files ?? [];
  const urls = new Map<string, string>();
  if (fileRows.length) {
    const { data: signed } = await supabase.storage.from(BUCKETS.contractFiles)
      .createSignedUrls(fileRows.map((f) => f.storage_path), SIGNED_URL_SECONDS);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return rows.map((s) => ({
    ...s,
    files: fileRows.filter((f) => f.submission_id === s.id).map((f) => ({ ...f, url: urls.get(f.storage_path) ?? null })),
  }));
}

// ---------------------------------------------------------------------------
// New dispute
// ---------------------------------------------------------------------------

export const DISPUTABLE_MILESTONE_STATES = ['funded', 'submitted', 'revision_requested', 'approved'] as const;

export interface DisputableContract {
  id: string;
  title: string;
  role: 'client' | 'freelancer';
  milestones: Pick<Milestone, 'id' | 'position' | 'title' | 'amount' | 'status' | 'due_date'>[];
}

/** Funded contracts where the viewer is a party, with the milestones that can be disputed now. */
export async function getDisputableContracts(viewerId: string): Promise<DisputableContract[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contracts')
    .select('id, title, client_id, freelancer_id, milestones(id, position, title, amount, status, due_date)')
    .in('status', ['active', 'disputed'])
    .or(`client_id.eq.${viewerId},freelancer_id.eq.${viewerId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  type Row = Pick<Contract, 'id' | 'title' | 'client_id' | 'freelancer_id'> & { milestones: DisputableContract['milestones'] };
  return ((data ?? []) as Row[])
    .map((c) => ({
      id: c.id,
      title: c.title,
      role: (c.client_id === viewerId ? 'client' : 'freelancer') as DisputableContract['role'],
      milestones: (c.milestones ?? [])
        .filter((m) => (DISPUTABLE_MILESTONE_STATES as readonly string[]).includes(m.status))
        .sort((a, b) => a.position - b.position),
    }))
    .filter((c) => c.milestones.length > 0);
}

// ---------------------------------------------------------------------------
// Arbitrator programme
// ---------------------------------------------------------------------------

export interface EligibilityCheck {
  key: 'contracts' | 'rating' | 'disputes' | 'wallet' | 'age';
  label: string;
  met: boolean;
  value: number | string | boolean | null;
}

export async function getArbitratorEligibility(): Promise<{ eligible: boolean; checks: EligibilityCheck[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('arbitrator_eligibility');
  if (error) throw error;
  return data as { eligible: boolean; checks: EligibilityCheck[] };
}

export async function getCategoryList(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('categories').select('slug, label, description').order('sort_order');
  if (error) throw error;
  return (data ?? []) as Category[];
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type SettlementItem = Dispute & {
  contract: Pick<Contract, 'id' | 'title' | 'escrow_key' | 'client_id' | 'freelancer_id'> | null;
  milestone: Pick<Milestone, 'id' | 'position' | 'title' | 'amount'> | null;
};

export type ArbitratorWithLoad = Arbitrator & { active: number };

export async function getAdminQueues() {
  const supabase = await createClient();
  const [attention, settlements, applications, available] = await Promise.all([
    supabase.from('disputes').select(LIST_SELECT)
      .or('and(status.eq.open,arbitrator_id.is.null),status.eq.escalated')
      .order('created_at', { ascending: true }).limit(100).returns<DisputeListItem[]>(),
    supabase.from('disputes')
      .select('*, contract:contracts(id, title, escrow_key, client_id, freelancer_id), milestone:milestones(id, position, title, amount)')
      .eq('status', 'resolved').in('settlement_status', ['ready', 'failed', 'pending'])
      .order('decided_at', { ascending: true }).limit(100).returns<SettlementItem[]>(),
    supabase.from('arbitrators').select('*').eq('status', 'pending').order('applied_at').returns<Arbitrator[]>(),
    supabase.from('arbitrators').select('*').eq('status', 'approved').eq('is_available', true).returns<Arbitrator[]>(),
  ]);
  for (const r of [attention, settlements, applications, available]) if (r.error) throw r.error;

  const pool = available.data ?? [];
  const load = new Map<string, number>();
  if (pool.length) {
    const { data: active, error } = await supabase.from('disputes').select('arbitrator_id')
      .in('arbitrator_id', pool.map((a) => a.user_id)).neq('status', 'resolved');
    if (error) throw error;
    for (const row of active ?? []) load.set(row.arbitrator_id as string, (load.get(row.arbitrator_id as string) ?? 0) + 1);
  }
  const arbitrators: ArbitratorWithLoad[] = pool.map((a) => ({ ...a, active: load.get(a.user_id) ?? 0 }));

  const attentionRows = attention.data ?? [];
  const settlementRows = settlements.data ?? [];
  const applicationRows = applications.data ?? [];
  const members = await getMembers([
    ...attentionRows.flatMap((d) => [d.contract?.client_id ?? '', d.contract?.freelancer_id ?? '']),
    ...settlementRows.flatMap((d) => [d.contract?.client_id ?? '', d.contract?.freelancer_id ?? '']),
    ...applicationRows.map((a) => a.user_id),
    ...arbitrators.map((a) => a.user_id),
  ]);
  return { attention: attentionRows, settlements: settlementRows, applications: applicationRows, arbitrators, members };
}

export type ArbiterLookup = { address: string; error: null } | { address: null; error: string };

/** The escrow contract's on-chain arbiter — the only account that can settle a decided dispute. */
export async function getEscrowArbiter(): Promise<ArbiterLookup> {
  if (!isEscrowConfigured()) {
    return { address: null, error: 'Escrow is not configured on this deployment, so decisions cannot be settled on-chain.' };
  }
  try {
    const provider = new JsonRpcProvider(process.env.ESCROW_RPC_URL || publicEnv.chain.rpcUrl, publicEnv.chain.id, { staticNetwork: true });
    const escrow = new EthersContract(publicEnv.chain.escrowAddress, abi, provider);
    const address = await Promise.race([
      escrow.getFunction('arbiter')() as Promise<string>,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('RPC timeout')), 8000)),
    ]);
    provider.destroy();
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('Unexpected arbiter value');
    return { address: address.toLowerCase(), error: null };
  } catch (error) {
    console.error('[escrow] arbiter lookup failed', error);
    return { address: null, error: 'The escrow contract could not be reached to read its arbiter address. Settlement is unavailable until the network responds — reload to try again.' };
  }
}
