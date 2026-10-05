'use client';

import { Download, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { ThreadMessage } from '@/lib/data/messages';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

function Time({ iso, hydrated, className }: { iso: string; hydrated: boolean; className?: string }) {
  return (
    <time dateTime={iso} className={className}>
      {hydrated ? format(parseISO(iso), 'HH:mm') : ''}
    </time>
  );
}

/** A TrustLance event (hire, signature, funding…): a quiet centred line, not a message from a person. */
export function SystemMessage({ message, hydrated }: { message: ThreadMessage; hydrated: boolean }) {
  return (
    <li className="flex justify-center px-4 py-1">
      <p className="max-w-md text-center text-xs leading-relaxed text-ink-muted">
        <span className="sr-only">TrustLance update: </span>
        {message.body}
        <Time iso={message.created_at} hydrated={hydrated} className="ml-1.5 font-mono tabular-nums" />
      </p>
    </li>
  );
}

function FileBody({ message, own }: { message: ThreadMessage; own: boolean }) {
  return (
    <div className={cn('flex items-center gap-3 rounded border px-3 py-2', own ? 'border-brand-foreground/30' : 'bg-surface')}>
      <FileText className="size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{message.file_name}</p>
        <p className={cn('text-xs', own ? 'text-brand-foreground/80' : 'text-ink-muted')}>{formatBytes(message.file_size)}</p>
      </div>
      {message.url ? (
        <a
          href={message.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded', own ? 'hover:bg-brand-strong' : 'hover:bg-surface-subtle')}
          aria-label={`Download ${message.file_name}`}
        >
          <Download className="size-4" aria-hidden />
        </a>
      ) : (
        <span className={cn('text-xs', own ? 'text-brand-foreground/80' : 'text-ink-muted')}>Unavailable</span>
      )}
    </div>
  );
}

export function MessageBubble({ message, own, senderName, hydrated, seen }: {
  message: ThreadMessage;
  own: boolean;
  senderName: string;
  hydrated: boolean;
  seen: boolean;
}) {
  return (
    <li className={cn('flex flex-col', own ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] space-y-2 rounded-lg px-3 py-2 text-sm shadow-xs sm:max-w-[75%]',
          own ? 'rounded-br-sm bg-brand text-brand-foreground' : 'rounded-bl-sm border bg-surface-subtle text-ink',
        )}
      >
        <span className="sr-only">{own ? 'You' : senderName}: </span>
        {message.kind === 'file' && <FileBody message={message} own={own} />}
        {message.body && <p className="whitespace-pre-wrap break-words">{message.body}</p>}
      </div>
      <p className="mt-1 flex items-center gap-2 px-1 t-meta">
        <Time iso={message.created_at} hydrated={hydrated} />
        {seen && <span className="font-medium text-ink-secondary">Seen</span>}
      </p>
    </li>
  );
}
