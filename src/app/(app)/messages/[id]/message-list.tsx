'use client';

import * as React from 'react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import type { ThreadMessage } from '@/lib/data/messages';
import { MessageBubble, SystemMessage } from './message-bubble';

function dayLabel(iso: string) {
  const d = parseISO(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, d MMMM yyyy');
}

const dayKey = (iso: string) => format(parseISO(iso), 'yyyy-MM-dd');

export function MessageList({ messages, viewerId, counterpartName, otherReadAt, hydrated }: {
  messages: ThreadMessage[];
  viewerId: string;
  counterpartName: string;
  otherReadAt: string | null;
  hydrated: boolean;
}) {
  const lastOwn = [...messages].reverse().find((m) => m.sender_id === viewerId);
  const lastOwnSeen = Boolean(lastOwn && otherReadAt && new Date(otherReadAt).getTime() >= new Date(lastOwn.created_at).getTime());

  const items: React.ReactNode[] = [];
  let previousDay = '';
  for (const m of messages) {
    // Day separators use the viewer's timezone, so they appear once the page is hydrated.
    if (hydrated) {
      const key = dayKey(m.created_at);
      if (key !== previousDay) {
        previousDay = key;
        items.push(
          <li key={`day-${key}`} className="flex items-center gap-3 py-1" role="separator" aria-label={dayLabel(m.created_at)}>
            <span className="h-px flex-1 bg-line" aria-hidden />
            <span className="t-eyebrow" aria-hidden>{dayLabel(m.created_at)}</span>
            <span className="h-px flex-1 bg-line" aria-hidden />
          </li>,
        );
      }
    }
    items.push(
      m.kind === 'system' ? (
        <SystemMessage key={m.id} message={m} hydrated={hydrated} />
      ) : (
        <MessageBubble
          key={m.id}
          message={m}
          own={m.sender_id === viewerId}
          senderName={counterpartName}
          hydrated={hydrated}
          seen={m.id === lastOwn?.id && lastOwnSeen}
        />
      ),
    );
  }

  return (
    <ol role="log" aria-live="polite" aria-relevant="additions" aria-label={`Messages with ${counterpartName}`} className="space-y-3">
      {items}
    </ol>
  );
}
