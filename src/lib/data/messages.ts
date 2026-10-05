import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { BUCKETS } from '@/lib/storage';
import { getMembers, type PublicMember } from '@/lib/data/projects';
import { milestoneSegments, type RailSegment } from '@/lib/escrow-summary';
import type { Contract, Conversation, Message, Milestone } from '@/lib/types';

export const THREAD_PAGE_SIZE = 200;
const LIST_LIMIT = 100;

type Counterpart = Pick<PublicMember, 'id' | 'username' | 'display_name' | 'avatar_path'>;

export interface ConversationSummary {
  id: string;
  projectId: string;
  projectTitle: string;
  contractId: string | null;
  /** Escrow rail of the linked contract; null before anyone is hired or when it could not be loaded. */
  rail: RailSegment[] | null;
  lastMessageAt: string;
  /** True when the other member wrote after the viewer last read. TrustLance system messages never count. */
  unread: boolean;
  counterpart: Counterpart | null;
  lastMessage: Pick<Message, 'kind' | 'body' | 'file_name' | 'sender_id' | 'created_at'> | null;
}

type MemberRow = { user_id: string; last_read_at: string };
type ConversationRow = Conversation & {
  project: { id: string; title: string } | null;
  members: MemberRow[] | null;
  /** The latest message of any kind, for the preview. */
  latest: Pick<Message, 'kind' | 'body' | 'file_name' | 'sender_id' | 'created_at'>[] | null;
  /** The latest message written by the other member (system messages have no sender and are excluded). */
  theirs: Pick<Message, 'created_at'>[] | null;
};

type RailMilestone = Pick<Milestone, 'id' | 'contract_id' | 'position' | 'title' | 'amount' | 'status' | 'freelancer_payout' | 'client_refund'>;

const isAfter = (a: string, b: string) => new Date(a).getTime() > new Date(b).getTime();

function counterpartId(c: Pick<Conversation, 'client_id' | 'freelancer_id'>, viewerId: string) {
  return c.client_id === viewerId ? c.freelancer_id : c.client_id;
}

function pickCounterpart(m: PublicMember | undefined): Counterpart | null {
  return m ? { id: m.id, username: m.username, display_name: m.display_name, avatar_path: m.avatar_path } : null;
}

/** Escrow rails for the given contracts. A failure only hides the rails; it never breaks the inbox. */
async function getContractRails(contractIds: string[]): Promise<Map<string, RailSegment[]>> {
  const ids = Array.from(new Set(contractIds));
  const rails = new Map<string, RailSegment[]>();
  if (!ids.length) return rails;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('milestones')
    .select('id, contract_id, position, title, amount, status, freelancer_payout, client_refund')
    .in('contract_id', ids)
    .returns<RailMilestone[]>();
  if (error) {
    console.error('[messages] contract rails', error);
    return rails;
  }
  const byContract = new Map<string, RailMilestone[]>();
  for (const m of data ?? []) byContract.set(m.contract_id, [...(byContract.get(m.contract_id) ?? []), m]);
  for (const [id, list] of byContract) rails.set(id, milestoneSegments(list));
  return rails;
}

/**
 * The viewer's conversations, newest activity first (row-level security returns only theirs).
 * `latest` is the newest message of any kind (for the preview); `theirs` the newest from the other member (for unread).
 */
export async function getConversations(viewerId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*, project:projects(id, title), members:conversation_members(user_id, last_read_at), latest:messages(kind, body, file_name, sender_id, created_at), theirs:messages(created_at)')
    .or(`client_id.eq.${viewerId},freelancer_id.eq.${viewerId}`)
    .order('last_message_at', { ascending: false })
    .order('created_at', { referencedTable: 'latest', ascending: false })
    .limit(1, { referencedTable: 'latest' })
    .neq('theirs.sender_id', viewerId)
    .order('created_at', { referencedTable: 'theirs', ascending: false })
    .limit(1, { referencedTable: 'theirs' })
    .limit(LIST_LIMIT)
    .returns<ConversationRow[]>();
  if (error) throw error;
  const rows = data ?? [];
  const [members, rails] = await Promise.all([
    getMembers(rows.map((r) => counterpartId(r, viewerId))),
    getContractRails(rows.map((r) => r.contract_id).filter((id): id is string => Boolean(id))),
  ]);
  return rows.map((r) => {
    const mine = r.members?.find((m) => m.user_id === viewerId);
    const last = r.latest?.[0] ?? null;
    const lastFromThem = r.theirs?.[0] ?? null;
    return {
      id: r.id,
      projectId: r.project_id,
      projectTitle: r.project?.title || 'Untitled project',
      contractId: r.contract_id,
      rail: r.contract_id ? rails.get(r.contract_id) ?? null : null,
      lastMessageAt: r.last_message_at,
      unread: lastFromThem !== null && (!mine || isAfter(lastFromThem.created_at, mine.last_read_at)),
      counterpart: pickCounterpart(members.get(counterpartId(r, viewerId))),
      lastMessage: last,
    };
  });
}

/** A message plus a short-lived download URL for file messages. */
export type ThreadMessage = Message & { url?: string | null };

/** The contract a conversation belongs to, with the milestone money needed for its escrow rail. */
export type ThreadContract = Pick<Contract, 'id' | 'title' | 'status' | 'total_amount'> & { milestones: RailMilestone[] };

export interface ConversationThread {
  conversation: Conversation;
  projectTitle: string;
  /** The linked contract, once someone is hired (null before, or when it could not be loaded). */
  contract: ThreadContract | null;
  counterpart: Counterpart | null;
  otherReadAt: string | null;
  messages: ThreadMessage[];
  hasEarlier: boolean;
}

export async function withSignedUrls(messages: Message[]): Promise<ThreadMessage[]> {
  const paths = messages.filter((m) => m.kind === 'file' && m.file_path).map((m) => m.file_path as string);
  if (!paths.length) return messages;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKETS.conversationFiles).createSignedUrls(paths, 600);
  const urls = new Map((data ?? []).filter((d) => d.path && d.signedUrl).map((d) => [d.path as string, d.signedUrl]));
  return messages.map((m) => (m.file_path ? { ...m, url: urls.get(m.file_path) ?? null } : m));
}

/** The contract shown beside a thread. A failure only hides the context; the conversation still opens. */
async function getThreadContract(contractId: string): Promise<ThreadContract | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contracts')
    .select('id, title, status, total_amount, milestones(id, contract_id, position, title, amount, status, freelancer_payout, client_refund)')
    .eq('id', contractId)
    .maybeSingle<ThreadContract>();
  if (error) {
    console.error('[messages] thread contract', error);
    return null;
  }
  return data;
}

/** One conversation with its latest messages, or null when it does not exist or is not visible to the viewer. */
export async function getConversationThread(id: string, viewerId: string): Promise<ConversationThread | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('*, project:projects(id, title), members:conversation_members(user_id, last_read_at)')
    .eq('id', id)
    .maybeSingle<Conversation & { project: { id: string; title: string } | null; members: MemberRow[] | null }>();
  if (error) throw error;
  if (!conversation) return null;
  // Admins may read conversations through RLS, but the inbox is for the two members only.
  if (conversation.client_id !== viewerId && conversation.freelancer_id !== viewerId) return null;

  const otherId = counterpartId(conversation, viewerId);
  const [{ data: rows, error: msgError }, members, contract] = await Promise.all([
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(THREAD_PAGE_SIZE + 1)
      .returns<Message[]>(),
    getMembers([otherId]),
    conversation.contract_id ? getThreadContract(conversation.contract_id) : Promise.resolve(null),
  ]);
  if (msgError) throw msgError;
  const list = rows ?? [];
  const hasEarlier = list.length > THREAD_PAGE_SIZE;
  const messages = await withSignedUrls(list.slice(0, THREAD_PAGE_SIZE).reverse());

  const { project, members: memberRows, ...rest } = conversation;
  return {
    conversation: rest,
    projectTitle: project?.title || 'Untitled project',
    contract,
    counterpart: pickCounterpart(members.get(otherId)),
    otherReadAt: memberRows?.find((m) => m.user_id === otherId)?.last_read_at ?? null,
    messages,
    hasEarlier,
  };
}
