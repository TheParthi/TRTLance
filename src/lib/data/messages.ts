import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { BUCKETS } from '@/lib/storage';
import { getMembers, type PublicMember } from '@/lib/data/projects';
import type { Conversation, Message } from '@/lib/types';

export const THREAD_PAGE_SIZE = 200;
const LIST_LIMIT = 100;

type Counterpart = Pick<PublicMember, 'id' | 'username' | 'display_name' | 'avatar_path'>;

export interface ConversationSummary {
  id: string;
  projectId: string;
  projectTitle: string;
  contractId: string | null;
  lastMessageAt: string;
  unread: boolean;
  counterpart: Counterpart | null;
  lastMessage: Pick<Message, 'kind' | 'body' | 'file_name' | 'sender_id' | 'created_at'> | null;
}

type MemberRow = { user_id: string; last_read_at: string };
type ConversationRow = Conversation & {
  project: { id: string; title: string } | null;
  members: MemberRow[] | null;
  messages: Pick<Message, 'kind' | 'body' | 'file_name' | 'sender_id' | 'created_at'>[] | null;
};

const isAfter = (a: string, b: string) => new Date(a).getTime() > new Date(b).getTime();

function counterpartId(c: Pick<Conversation, 'client_id' | 'freelancer_id'>, viewerId: string) {
  return c.client_id === viewerId ? c.freelancer_id : c.client_id;
}

function pickCounterpart(m: PublicMember | undefined): Counterpart | null {
  return m ? { id: m.id, username: m.username, display_name: m.display_name, avatar_path: m.avatar_path } : null;
}

/** The viewer's conversations, newest activity first (row-level security returns only theirs). */
export async function getConversations(viewerId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('conversations')
    .select('*, project:projects(id, title), members:conversation_members(user_id, last_read_at), messages(kind, body, file_name, sender_id, created_at)')
    .or(`client_id.eq.${viewerId},freelancer_id.eq.${viewerId}`)
    .order('last_message_at', { ascending: false })
    .order('created_at', { referencedTable: 'messages', ascending: false })
    .limit(1, { referencedTable: 'messages' })
    .limit(LIST_LIMIT)
    .returns<ConversationRow[]>();
  if (error) throw error;
  const rows = data ?? [];
  const members = await getMembers(rows.map((r) => counterpartId(r, viewerId)));
  return rows.map((r) => {
    const mine = r.members?.find((m) => m.user_id === viewerId);
    const last = r.messages?.[0] ?? null;
    return {
      id: r.id,
      projectId: r.project_id,
      projectTitle: r.project?.title || 'Untitled project',
      contractId: r.contract_id,
      lastMessageAt: r.last_message_at,
      unread: Boolean(last) && (!mine || isAfter(r.last_message_at, mine.last_read_at)),
      counterpart: pickCounterpart(members.get(counterpartId(r, viewerId))),
      lastMessage: last,
    };
  });
}

/** A message plus a short-lived download URL for file messages. */
export type ThreadMessage = Message & { url?: string | null };

export interface ConversationThread {
  conversation: Conversation;
  projectTitle: string;
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
  const [{ data: rows, error: msgError }, members] = await Promise.all([
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(THREAD_PAGE_SIZE + 1)
      .returns<Message[]>(),
    getMembers([otherId]),
  ]);
  if (msgError) throw msgError;
  const list = rows ?? [];
  const hasEarlier = list.length > THREAD_PAGE_SIZE;
  const messages = await withSignedUrls(list.slice(0, THREAD_PAGE_SIZE).reverse());

  const { project, members: memberRows, ...rest } = conversation;
  return {
    conversation: rest,
    projectTitle: project?.title || 'Untitled project',
    counterpart: pickCounterpart(members.get(otherId)),
    otherReadAt: memberRows?.find((m) => m.user_id === otherId)?.last_read_at ?? null,
    messages,
    hasEarlier,
  };
}
