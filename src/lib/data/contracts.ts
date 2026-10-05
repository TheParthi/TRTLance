import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getMembers } from '@/lib/data/projects';
import type {
  Contract, ContractEvent, ContractFile, Dispute, EscrowTransaction, Milestone, MilestoneSubmission, Review,
} from '@/lib/types';

export type ContractListItem = Contract & { milestones: Pick<Milestone, 'status' | 'amount' | 'due_date' | 'position'>[] };

export async function listContracts(): Promise<ContractListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contracts')
    .select('*, milestones(status, amount, due_date, position)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ContractListItem[];
}

export type SubmissionWithFiles = MilestoneSubmission & { files: (ContractFile & { url: string | null })[] };

export const getContractWorkspace = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: contract } = await supabase.from('contracts').select('*').eq('id', id).maybeSingle<Contract>();
  if (!contract) return null;

  const [milestones, submissions, files, txs, events, disputes, reviews, conversation] = await Promise.all([
    supabase.from('milestones').select('*').eq('contract_id', id).order('position').returns<Milestone[]>(),
    supabase.from('milestone_submissions').select('*').eq('contract_id', id).order('version', { ascending: false }).returns<MilestoneSubmission[]>(),
    supabase.from('contract_files').select('*').eq('contract_id', id).order('created_at').returns<ContractFile[]>(),
    supabase.from('escrow_transactions').select('*').eq('contract_id', id).order('created_at', { ascending: false }).returns<EscrowTransaction[]>(),
    supabase.from('contract_events').select('*').eq('contract_id', id).order('id', { ascending: false }).limit(200).returns<ContractEvent[]>(),
    supabase.from('disputes').select('*').eq('contract_id', id).order('created_at', { ascending: false }).returns<Dispute[]>(),
    supabase.from('reviews').select('*').eq('contract_id', id).returns<Review[]>(),
    supabase.from('conversations').select('id').eq('contract_id', id).maybeSingle(),
  ]);

  const signed = await Promise.all(
    (files.data ?? []).map(async (f) => {
      const { data } = await supabase.storage.from('contract-files').createSignedUrl(f.storage_path, 900);
      return { ...f, url: data?.signedUrl ?? null };
    }),
  );
  const subs: SubmissionWithFiles[] = (submissions.data ?? []).map((s) => ({ ...s, files: signed.filter((f) => f.submission_id === s.id) }));
  const members = await getMembers([contract.client_id, contract.freelancer_id, ...(events.data ?? []).map((e) => e.actor_id ?? '')]);

  return {
    contract,
    milestones: milestones.data ?? [],
    submissions: subs,
    files: signed,
    transactions: txs.data ?? [],
    events: events.data ?? [],
    disputes: disputes.data ?? [],
    reviews: reviews.data ?? [],
    conversationId: (conversation.data?.id as string | undefined) ?? null,
    members,
  };
});

export type ContractWorkspace = NonNullable<Awaited<ReturnType<typeof getContractWorkspace>>>;
