'use client';

import * as React from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import type { MemberSummary } from '@/lib/data/disputes';
import { formatDateTime } from '@/lib/format';
import { getBrowserClient } from '@/lib/supabase/client';
import type { DisputeMessage } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Case chat between both parties and the arbitrator, styled like Messages. Live via Supabase realtime. */
export function DisputeChat({ disputeId, viewerId, initial, members, roles, canSend, closedReason }: {
  disputeId: string;
  viewerId: string;
  initial: DisputeMessage[];
  members: Record<string, MemberSummary>;
  /** Role label per user id, e.g. "Client". */
  roles: Record<string, string>;
  canSend: boolean;
  closedReason?: string;
}) {
  const [messages, setMessages] = React.useState(initial);
  const [body, setBody] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [live, setLive] = React.useState<'connecting' | 'live' | 'offline'>('connecting');
  const logRef = React.useRef<HTMLOListElement>(null);

  const append = React.useCallback((m: DisputeMessage) => {
    setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
  }, []);

  React.useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`dispute-messages:${disputeId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dispute_messages', filter: `dispute_id=eq.${disputeId}` },
        (payload) => append(payload.new as DisputeMessage))
      .subscribe((status) => setLive(status === 'SUBSCRIBED' ? 'live' : status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'offline' : 'connecting'));
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [disputeId, append]);

  // Keep the latest message in view inside the log, without scrolling the page itself.
  React.useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const { data, error } = await getBrowserClient()
      .from('dispute_messages')
      .insert({ dispute_id: disputeId, sender_id: viewerId, kind: 'text', body: text.slice(0, 5000) })
      .select('*')
      .single<DisputeMessage>();
    setSending(false);
    if (error || !data) return toast.error('Your message was not sent. Try again.');
    append(data);
    setBody('');
  };

  return (
    <section className="flex flex-col overflow-hidden rounded-lg border bg-surface shadow-xs" aria-label="Case messages">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b px-4 py-2 text-xs text-ink-muted">
        <span>Visible to both parties, the arbitrator and the platform team.</span>
        <span role="status" className={cn('inline-flex items-center gap-1.5', live === 'offline' && 'text-warning-strong')}>
          <span className={cn('size-1.5 rounded-full', live === 'live' ? 'bg-success' : live === 'offline' ? 'bg-warning' : 'bg-line-strong')} aria-hidden />
          {live === 'live' ? 'Live' : live === 'offline' ? 'Offline — reload to see new messages' : 'Connecting…'}
        </span>
      </div>
      <ol ref={logRef} role="log" className="max-h-[32rem] min-h-40 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && <li className="py-8 text-center text-sm text-ink-muted">No messages yet.</li>}
        {messages.map((m) => {
          if (m.kind === 'system') {
            return (
              <li key={m.id} className="flex flex-col items-center px-2">
                <p className="max-w-md break-words rounded-2xl bg-surface-sunken px-3 py-1 text-center text-xs text-ink-secondary">
                  <span className="sr-only">TrustLance update: </span>
                  {m.body}
                </p>
                <time className="t-meta mt-1" dateTime={m.created_at}>{formatDateTime(m.created_at)}</time>
              </li>
            );
          }
          const mine = m.sender_id === viewerId;
          const who = m.sender_id ? members[m.sender_id] : undefined;
          const role = m.sender_id ? roles[m.sender_id] : undefined;
          const name = mine ? 'You' : who?.display_name ?? 'Participant';
          return (
            <li key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
              {!mine && (
                <p className="mb-1 px-1 text-xs">
                  <span className="font-medium text-ink-secondary">{name}</span>
                  {role && <span className="text-ink-muted"> · {role}</span>}
                </p>
              )}
              <p
                className={cn(
                  'max-w-[85%] whitespace-pre-line break-words rounded-lg px-3 py-2 text-sm shadow-xs sm:max-w-[75%]',
                  mine ? 'rounded-br-sm bg-brand text-brand-foreground' : 'rounded-bl-sm border bg-surface-subtle text-ink',
                )}
              >
                <span className="sr-only">{name}{role && !mine ? ` (${role})` : ''}: </span>
                {m.body}
              </p>
              <p className="t-meta mt-1 px-1"><time dateTime={m.created_at}>{formatDateTime(m.created_at)}</time></p>
            </li>
          );
        })}
      </ol>
      {canSend ? (
        <form onSubmit={send} className="space-y-2 border-t bg-surface p-3">
          <div className="flex items-end gap-2">
            <label htmlFor="dispute-message" className="sr-only">Message</label>
            <Textarea id="dispute-message" rows={2} value={body} maxLength={5000} placeholder="Write a message…" className="max-h-40 min-h-10 flex-1 resize-none py-2"
              aria-describedby="dispute-message-hint"
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send(e);
              }} />
            <Button type="submit" size="icon" loading={sending} disabled={!body.trim()} aria-label="Send message">{!sending && <Send />}</Button>
          </div>
          <p id="dispute-message-hint" className="t-meta max-sm:sr-only">Ctrl+Enter or ⌘+Enter to send. Everyone on the case can read it.</p>
        </form>
      ) : (
        <p className="border-t p-3 text-sm text-ink-muted">{closedReason ?? 'Messaging is closed for this case.'}</p>
      )}
    </section>
  );
}
