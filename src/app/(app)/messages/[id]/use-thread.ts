'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { ThreadMessage } from '@/lib/data/messages';
import { getBrowserClient } from '@/lib/supabase/client';
import { BUCKETS } from '@/lib/storage';
import type { Message } from '@/lib/types';

const EARLIER_PAGE = 50;

function mergeMessages(...lists: ThreadMessage[][]) {
  const byId = new Map<string, ThreadMessage>();
  for (const list of lists) {
    for (const m of list) {
      const prev = byId.get(m.id);
      byId.set(m.id, prev ? { ...prev, ...m, url: m.url ?? prev.url } : m);
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

async function signFiles(messages: Message[]): Promise<ThreadMessage[]> {
  const paths = messages.filter((m) => m.kind === 'file' && m.file_path).map((m) => m.file_path as string);
  if (!paths.length) return messages;
  const { data } = await getBrowserClient().storage.from(BUCKETS.conversationFiles).createSignedUrls(paths, 600);
  const urls = new Map((data ?? []).filter((d) => d.path && d.signedUrl).map((d) => [d.path as string, d.signedUrl]));
  return messages.map((m) => (m.file_path ? { ...m, url: urls.get(m.file_path) ?? null } : m));
}

/**
 * Message state for one open conversation: server-rendered messages merged with realtime inserts,
 * read receipts sent while the thread is visible, and older pages loaded on demand.
 */
export function useThread({ conversationId, viewerId, initialMessages, hasEarlier: initialHasEarlier }: {
  conversationId: string;
  viewerId: string;
  initialMessages: ThreadMessage[];
  hasEarlier: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = React.useState(initialMessages);
  const [hasEarlier, setHasEarlier] = React.useState(initialHasEarlier);
  const [loadingEarlier, setLoadingEarlier] = React.useState(false);
  const [earlierError, setEarlierError] = React.useState(false);

  // Server refreshes (router.refresh) bring a fresh latest page: merge it in rather than replace.
  React.useEffect(() => {
    setMessages((prev) => mergeMessages(prev, initialMessages));
  }, [initialMessages]);

  const markingRef = React.useRef(false);
  const markRead = React.useCallback(async () => {
    if (markingRef.current || document.visibilityState !== 'visible') return;
    markingRef.current = true;
    try {
      await getBrowserClient().rpc('mark_conversation_read', { p_conversation_id: conversationId });
    } finally {
      markingRef.current = false;
    }
  }, [conversationId]);

  const addMessages = React.useCallback(async (incoming: Message[]) => {
    const signed = await signFiles(incoming);
    setMessages((prev) => mergeMessages(prev, signed));
  }, []);

  // Once on open: mark read, then refresh so the inbox list and notification badge catch up.
  React.useEffect(() => {
    void markRead().then(() => router.refresh());
  }, [markRead, router]);

  React.useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          void addMessages([m]);
          if (m.sender_id !== viewerId) void markRead();
        },
      )
      .subscribe();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void markRead();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [conversationId, viewerId, addMessages, markRead]);

  const oldest = messages[0]?.created_at;
  const loadEarlier = React.useCallback(async () => {
    if (!oldest || loadingEarlier) return;
    setLoadingEarlier(true);
    setEarlierError(false);
    const { data, error } = await getBrowserClient()
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .lt('created_at', oldest)
      .order('created_at', { ascending: false })
      .limit(EARLIER_PAGE + 1)
      .returns<Message[]>();
    if (error) {
      setEarlierError(true);
    } else {
      const rows = data ?? [];
      setHasEarlier(rows.length > EARLIER_PAGE);
      await addMessages(rows.slice(0, EARLIER_PAGE));
    }
    setLoadingEarlier(false);
  }, [conversationId, oldest, loadingEarlier, addMessages]);

  return { messages, addMessages, hasEarlier, loadEarlier, loadingEarlier, earlierError };
}
