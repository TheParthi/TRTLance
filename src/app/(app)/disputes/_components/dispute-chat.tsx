'use client';

import * as React from 'react';
import { Info, Send } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import type { MemberSummary } from '@/lib/data/disputes';
import { formatDateTime } from '@/lib/format';
import { getBrowserClient } from '@/lib/supabase/client';
import type { DisputeMessage } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Case chat between both parties and the arbitrator. Live via Supabase realtime. */
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
  const endRef = React.useRef<HTMLDivElement>(null);

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

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
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
    <section className="panel flex flex-col overflow-hidden" aria-label="Case messages">
      <div className="flex items-center justify-between gap-2 border-b bg-surface-subtle px-4 py-2 text-xs text-ink-muted">
        <span>Visible to both parties, the arbitrator and the platform team.</span>
        <span role="status" className={cn(live === 'offline' && 'text-warning-strong')}>
          {live === 'live' ? 'Live' : live === 'offline' ? 'Offline — reload to see new messages' : 'Connecting…'}
        </span>
      </div>
      <ol className="max-h-[32rem] min-h-40 space-y-4 overflow-y-auto p-4" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && <li className="py-8 text-center text-sm text-ink-muted">No messages yet.</li>}
        {messages.map((m) => {
          if (m.kind === 'system') {
            return (
              <li key={m.id} className="flex items-start gap-2 rounded-lg bg-surface-subtle px-3 py-2 text-xs text-ink-secondary">
                <Info className="mt-0.5 size-3.5 shrink-0 text-ink-muted" aria-hidden />
                <span className="min-w-0 flex-1 break-words">{m.body}</span>
                <time className="shrink-0 text-ink-muted" dateTime={m.created_at}>{formatDateTime(m.created_at)}</time>
              </li>
            );
          }
          const mine = m.sender_id === viewerId;
          const who = m.sender_id ? members[m.sender_id] : undefined;
          const role = m.sender_id ? roles[m.sender_id] : undefined;
          return (
            <li key={m.id} className={cn('flex gap-3', mine && 'flex-row-reverse')}>
              <Avatar name={who?.display_name ?? '?'} path={who?.avatar_path} size="sm" />
              <div className={cn('min-w-0 max-w-[85%] space-y-1', mine && 'text-right')}>
                <p className="t-meta">
                  <span className="font-medium text-ink-secondary">{mine ? 'You' : who?.display_name ?? 'Participant'}</span>
                  {role && <> · {role}</>} · <time dateTime={m.created_at}>{formatDateTime(m.created_at)}</time>
                </p>
                <p className={cn('inline-block whitespace-pre-line break-words rounded-lg px-3 py-2 text-left text-sm',
                  mine ? 'bg-brand-soft text-ink' : 'bg-surface-sunken text-ink')}>{m.body}</p>
              </div>
            </li>
          );
        })}
        <div ref={endRef} />
      </ol>
      {canSend ? (
        <form onSubmit={send} className="flex items-end gap-2 border-t p-3">
          <label htmlFor="dispute-message" className="sr-only">Message</label>
          <Textarea id="dispute-message" rows={2} value={body} maxLength={5000} placeholder="Write a message…" className="min-h-10"
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void send(e);
            }} />
          <Button type="submit" size="icon" loading={sending} disabled={!body.trim()} aria-label="Send message">{!sending && <Send />}</Button>
        </form>
      ) : (
        <p className="border-t p-3 text-sm text-ink-muted">{closedReason ?? 'Messaging is closed for this case.'}</p>
      )}
    </section>
  );
}
