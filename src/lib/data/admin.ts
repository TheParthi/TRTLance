import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type {
  Arbitrator, Contract, Milestone, PayoutAccountStatus, Profile, ProfileStats,
} from '@/lib/types';

/**
 * Reads for the platform console.
 *
 * Every one of these calls a function in the database that checks app.is_admin() first — row-level
 * security does not give admins blanket access to tables, on purpose. If a caller is not an admin
 * the call throws, so a page that renders is a page the viewer was entitled to see.
 *
 * Coin amounts are whole numbers of coins and arrive from Postgres as strings (bigint) or numbers
 * depending on the column, so everything that is counted or compared is normalised to a number here
 * and the pages never have to guess.
 */

const n = (value: unknown) => Number(value ?? 0);

async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
}

async function rows<T>(name: string, args: Record<string, unknown> = {}): Promise<T[]> {
  return (await rpc<T[] | null>(name, args)) ?? [];
}

/** A list page's rows plus the total the database counted, so paging needs one round trip. */
export interface Page<T> {
  rows: T[];
  total: number;
}

function page<T extends { total_count?: number | string }>(list: T[]): Page<T> {
  return { rows: list, total: list.length ? n(list[0].total_count) : 0 };
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
export interface Overview {
  members: { total: number; new_7d: number; new_30d: number; onboarded: number; suspended: number; hiring: number; working: number };
  projects: { total: number; open: number; draft: number; in_contract: number; completed: number; cancelled: number; flagged: number; removed: number; new_7d: number };
  proposals: { total: number; pending: number; accepted: number };
  contracts: { total: number; pending_signatures: number; awaiting_funding: number; active: number; disputed: number; completed: number; cancelled: number; new_7d: number; value: string };
  disputes: { total: number; open: number; awaiting_evidence: number; under_review: number; escalated: number; resolved: number; unsettled: number };
  money: { escrow: number; wallets: number; pending: number; earnings: number; fees: number; in_transit: number; issued: number };
  queues: { attention: number; withdrawals: number; withdrawals_coins: number; bank_accounts: number; applications: number; flagged_projects: number };
  arbitrators: { approved: number; available: number; pending: number; suspended: number };
  generated_at: string;
}

export const getOverview = () => rpc<Overview>('admin_overview');

export interface DayPoint {
  day: string;
  signups: number;
  projects: number;
  contracts: number;
  funded: number;
  funded_coins: number;
  fees_coins: number;
  disputes: number;
}

export async function getTimeseries(days = 30): Promise<DayPoint[]> {
  const list = await rows<Record<string, unknown>>('admin_timeseries', { p_days: days });
  return list.map((r) => ({
    day: String(r.day).slice(0, 10),
    signups: n(r.signups),
    projects: n(r.projects),
    contracts: n(r.contracts),
    funded: n(r.funded),
    funded_coins: n(r.funded_coins),
    fees_coins: n(r.fees_coins),
    disputes: n(r.disputes),
  }));
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------
export type MemberFilter = 'all' | 'suspended' | 'admins' | 'arbitrators' | 'unonboarded' | 'new';
export type MemberSort = 'recent' | 'oldest' | 'name';

export interface MemberRow {
  id: string;
  username: string;
  display_name: string;
  headline: string | null;
  avatar_path: string | null;
  intent: Profile['intent'];
  created_at: string;
  onboarded: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  is_admin: boolean;
  arbitrator_status: Arbitrator['status'] | null;
  email_verified: boolean;
  identity_verified: boolean;
  rating_avg: string | null;
  review_count: number;
  contracts: number;
  open_disputes: number;
  wallet: number;
  pending: number;
  earnings: number;
  total_count: number;
}

export async function getMembers(opts: {
  query?: string; filter?: MemberFilter; sort?: MemberSort; limit?: number; offset?: number;
} = {}): Promise<Page<MemberRow>> {
  const list = await rows<Record<string, unknown>>('admin_member_list', {
    p_query: opts.query?.trim() || null,
    p_filter: opts.filter ?? 'all',
    p_sort: opts.sort ?? 'recent',
    p_limit: opts.limit ?? 25,
    p_offset: opts.offset ?? 0,
  });
  return page(list.map((r) => ({
    ...r,
    contracts: n(r.contracts),
    open_disputes: n(r.open_disputes),
    wallet: n(r.wallet),
    pending: n(r.pending),
    earnings: n(r.earnings),
    review_count: n(r.review_count),
    total_count: n(r.total_count),
  })) as MemberRow[]);
}

export interface MemberDetail {
  profile: Profile & { suspended_at: string | null; suspended_reason: string | null };
  is_admin: boolean;
  admin_note: string | null;
  email: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  phone: string | null;
  stats: ProfileStats | null;
  suspended_by_name: string | null;
  arbitrator: Arbitrator | null;
  balances: Partial<Record<'wallet' | 'pending' | 'earnings', number>>;
  holds: number;
  payout_account: { status: PayoutAccountStatus; account_holder: string; account_last4: string; ifsc: string; pan_last4: string; review_note: string | null; verified_at: string | null } | null;
  projects: { id: string; title: string; status: string; moderation_state: string; budget_amount: string | null; proposal_count: number; created_at: string }[];
  contracts: { id: string; title: string; status: string; total_amount: string; role: 'client' | 'freelancer'; counterparty: string | null; created_at: string }[];
  disputes: { id: string; number: number; status: string; amount: string; raised_by_them: boolean; created_at: string }[];
  withdrawals: { id: string; number: number; coins: number; amount_paise: number; status: string; reference: string | null; requested_at: string }[];
  purchases: { id: string; coins: number; amount_paise: number; provider: string; status: string; created_at: string }[];
  audit: { id: number; action: string; detail: Record<string, unknown>; created_at: string; actor: string | null }[];
}

export const getMemberDetail = (userId: string) => rpc<MemberDetail>('admin_member_detail', { p_user: userId });

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export type ModerationState = 'ok' | 'flagged' | 'removed';

export interface AdminProjectRow {
  id: string;
  title: string;
  status: string;
  moderation_state: ModerationState;
  moderation_reason: string | null;
  category: string | null;
  budget_amount: string | null;
  proposal_count: number;
  visibility: string;
  created_at: string;
  published_at: string | null;
  client_id: string;
  client_name: string;
  client_username: string;
  client_suspended: boolean;
  total_count: number;
}

export async function getAdminProjects(opts: {
  query?: string; status?: string; moderation?: string; limit?: number; offset?: number;
} = {}): Promise<Page<AdminProjectRow>> {
  const list = await rows<Record<string, unknown>>('admin_project_list', {
    p_query: opts.query?.trim() || null,
    p_status: opts.status ?? 'all',
    p_moderation: opts.moderation ?? 'all',
    p_limit: opts.limit ?? 25,
    p_offset: opts.offset ?? 0,
  });
  return page(list.map((r) => ({
    ...r, proposal_count: n(r.proposal_count), total_count: n(r.total_count),
  })) as AdminProjectRow[]);
}

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------
export interface AdminContractRow {
  id: string;
  title: string;
  status: Contract['status'];
  total_amount: string;
  fee_bps: number;
  client_id: string;
  client_name: string;
  client_username: string;
  freelancer_id: string;
  freelancer_name: string;
  freelancer_username: string;
  milestones: number;
  paid_milestones: number;
  escrow: number;
  open_disputes: number;
  created_at: string;
  funded_at: string | null;
  completed_at: string | null;
  total_count: number;
}

export async function getAdminContracts(opts: {
  query?: string; status?: string; limit?: number; offset?: number;
} = {}): Promise<Page<AdminContractRow>> {
  const list = await rows<Record<string, unknown>>('admin_contract_list', {
    p_query: opts.query?.trim() || null,
    p_status: opts.status ?? 'all',
    p_limit: opts.limit ?? 25,
    p_offset: opts.offset ?? 0,
  });
  return page(list.map((r) => ({
    ...r,
    fee_bps: n(r.fee_bps),
    milestones: n(r.milestones),
    paid_milestones: n(r.paid_milestones),
    escrow: n(r.escrow),
    open_disputes: n(r.open_disputes),
    total_count: n(r.total_count),
  })) as AdminContractRow[]);
}

export interface AdminContractDetail {
  contract: Contract & { fee_bps: number };
  client: { id: string; display_name: string; username: string; suspended: boolean };
  freelancer: { id: string; display_name: string; username: string; suspended: boolean };
  escrow_balance: number;
  milestones: Milestone[];
  disputes: { id: string; number: number; status: string; amount: string; milestone_id: string; arbitrator_id: string | null; settlement_status: string; created_at: string }[];
  events: { id: number; type: string; data: Record<string, unknown>; created_at: string; actor: string | null }[];
  ledger: { entry_id: number; amount: number; balance_after: number; kind: string; memo: string; milestone_id: string | null; created_at: string }[];
}

export const getAdminContractDetail = (id: string) => rpc<AdminContractDetail>('admin_contract_detail', { p_contract: id });

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------
export interface AdminDisputeRow {
  id: string;
  number: number;
  status: string;
  reason: string;
  amount: string;
  settlement_status: string;
  escalation_reason: string | null;
  contract_id: string;
  contract_title: string;
  milestone_position: number | null;
  client_name: string;
  freelancer_name: string;
  arbitrator_id: string | null;
  arbitrator_name: string | null;
  decision: string | null;
  freelancer_pct: number | null;
  created_at: string;
  decided_at: string | null;
  total_count: number;
}

export async function getAdminDisputes(opts: { status?: string; limit?: number; offset?: number } = {}): Promise<Page<AdminDisputeRow>> {
  const list = await rows<Record<string, unknown>>('admin_dispute_list', {
    p_status: opts.status ?? 'all',
    p_limit: opts.limit ?? 25,
    p_offset: opts.offset ?? 0,
  });
  return page(list.map((r) => ({
    ...r, number: n(r.number), milestone_position: r.milestone_position === null ? null : n(r.milestone_position), total_count: n(r.total_count),
  })) as AdminDisputeRow[]);
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------
export interface Finance {
  accounts: { kind: string; balance: number; accounts: number }[];
  issued: number;
  purchases: { paid: number; paid_coins: number; paid_paise: number; created: number; failed: number; paid_7d: number };
  withdrawals: { requested: number; requested_coins: number; paid: number; paid_coins: number; paid_paise: number; failed: number; cancelled: number };
  fees: { total: number; last_30d: number };
  holds: { coins: number; count: number; due_today: number };
  reconciliation: {
    sum_of_balances: number;
    drifted_accounts: { account_id: number; kind: string; user_id: string | null; contract_id: string | null; balance: number; entry_sum: number }[];
    transactions: number;
    entries: number;
  };
  settings: Record<string, number>;
  generated_at: string;
}

export const getFinance = () => rpc<Finance>('admin_finance');

export interface LedgerEntry {
  entry_id: number;
  created_at: string;
  kind: string;
  memo: string;
  amount: number;
  balance_after: number;
  account_kind: string;
  account_user: string | null;
  account_user_name: string | null;
  contract_id: string | null;
  milestone_id: string | null;
  actor_name: string | null;
  total_count: number;
}

export async function getCoinLedger(opts: { kind?: string; userId?: string; limit?: number; offset?: number } = {}): Promise<Page<LedgerEntry>> {
  const list = await rows<Record<string, unknown>>('admin_coin_ledger', {
    p_kind: opts.kind ?? 'all',
    p_user: opts.userId ?? null,
    p_limit: opts.limit ?? 50,
    p_offset: opts.offset ?? 0,
  });
  return page(list.map((r) => ({
    ...r,
    entry_id: n(r.entry_id),
    amount: n(r.amount),
    balance_after: n(r.balance_after),
    total_count: n(r.total_count),
  })) as LedgerEntry[]);
}

// ---------------------------------------------------------------------------
// Arbitrators
// ---------------------------------------------------------------------------
export interface AdminArbitratorRow {
  user_id: string;
  display_name: string;
  username: string;
  avatar_path: string | null;
  status: Arbitrator['status'];
  specializations: string[];
  statement: string;
  capacity: number;
  is_available: boolean;
  applied_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  live_cases: number;
  decided_cases: number;
  completed_contracts: number;
  disputes_lost: number;
}

export async function getAdminArbitrators(status = 'all'): Promise<AdminArbitratorRow[]> {
  const list = await rows<Record<string, unknown>>('admin_arbitrator_list', { p_status: status });
  return list.map((r) => ({
    ...r,
    capacity: n(r.capacity),
    live_cases: n(r.live_cases),
    decided_cases: n(r.decided_cases),
    completed_contracts: n(r.completed_contracts),
    disputes_lost: n(r.disputes_lost),
  })) as AdminArbitratorRow[];
}

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------
export interface AuditEntry {
  id: number;
  actor_id: string;
  actor_name: string;
  actor_username: string;
  action: string;
  subject_type: string;
  subject_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
  total_count: number;
}

export async function getAuditTrail(opts: { action?: string; subjectType?: string; limit?: number; offset?: number } = {}): Promise<Page<AuditEntry>> {
  const list = await rows<Record<string, unknown>>('admin_audit_list', {
    p_action: opts.action?.trim() || null,
    p_subject_type: opts.subjectType?.trim() || null,
    p_limit: opts.limit ?? 50,
    p_offset: opts.offset ?? 0,
  });
  return page(list.map((r) => ({ ...r, id: n(r.id), total_count: n(r.total_count) })) as AuditEntry[]);
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
export interface Configuration {
  settings: { key: string; value: number; description: string }[];
  holidays: { day: string; label: string }[];
  admins: { user_id: string; display_name: string; username: string; avatar_path: string | null; note: string | null; granted_at: string; email: string | null }[];
  categories: { slug: string; label: string }[];
}

export async function getConfiguration(): Promise<Configuration> {
  const config = await rpc<Configuration>('admin_configuration');
  return {
    ...config,
    settings: config.settings.map((s) => ({ ...s, value: n(s.value) })),
    holidays: config.holidays.map((h) => ({ ...h, day: String(h.day).slice(0, 10) })),
  };
}
