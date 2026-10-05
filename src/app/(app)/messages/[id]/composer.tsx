'use client';

import * as React from 'react';
import { Paperclip, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { toAppError } from '@/lib/errors';
import { formatBytes } from '@/lib/format';
import { BUCKETS, MAX_UPLOAD_BYTES, objectPath } from '@/lib/storage';
import { getBrowserClient } from '@/lib/supabase/client';
import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';

const MAX_CHARS = 5000;
const MAX_FILE = MAX_UPLOAD_BYTES['conversation-files'];

function describeError(error: unknown, uploading: boolean) {
  const e = toAppError(error);
  if (e.code === 'rate_limited') return e.message || 'You are sending messages too quickly. Wait a moment and try again.';
  if (e.code !== 'unexpected') return e.message;
  return uploading ? 'The file could not be uploaded. Check your connection and try again.' : 'Your message was not sent. Try again.';
}

export function Composer({ conversationId, viewerId, onSent }: {
  conversationId: string;
  viewerId: string;
  onSent: (message: Message) => void;
}) {
  const [text, setText] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const sendingRef = React.useRef(false);
  const textRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const errorId = React.useId();
  const counterId = React.useId();

  const body = text.trim();
  const canSend = (body.length > 0 || file !== null) && text.length <= MAX_CHARS && !sending;

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!f) return;
    if (f.size === 0) return setError('That file is empty.');
    if (f.size > MAX_FILE) return setError(`Files can be up to ${formatBytes(MAX_FILE)}. This one is ${formatBytes(f.size)}.`);
    setError(null);
    setFile(f);
  }

  async function send() {
    if (sendingRef.current || !canSend) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    const supabase = getBrowserClient();
    let uploadedPath: string | null = null;
    try {
      let row: Record<string, unknown> = { conversation_id: conversationId, sender_id: viewerId, kind: 'text', body };
      if (file) {
        const path = objectPath(conversationId, file.name);
        const mime = (file.type || 'application/octet-stream').slice(0, 120);
        const { error: upError } = await supabase.storage.from(BUCKETS.conversationFiles).upload(path, file, { contentType: mime, upsert: false });
        if (upError) throw Object.assign(upError, { uploading: true });
        uploadedPath = path;
        row = { ...row, kind: 'file', file_path: path, file_name: file.name.slice(-200), file_size: file.size, mime_type: mime };
      }
      const { data, error: insertError } = await supabase.from('messages').insert(row).select('*').single<Message>();
      if (insertError) throw insertError;
      onSent(data);
      setText('');
      setFile(null);
    } catch (err) {
      if (uploadedPath) void supabase.storage.from(BUCKETS.conversationFiles).remove([uploadedPath]);
      setError(describeError(err, Boolean((err as { uploading?: boolean })?.uploading)));
    } finally {
      sendingRef.current = false;
      setSending(false);
      textRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  }

  const describedBy = [error ? errorId : null, counterId].filter(Boolean).join(' ');

  return (
    <form
      className="space-y-2 border-t bg-surface p-3"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger-strong">
          {error}
        </p>
      )}
      {file && (
        <div className="flex items-center gap-2 rounded border bg-surface-subtle px-3 py-1.5 text-sm">
          <Paperclip className="size-4 shrink-0 text-ink-muted" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <span className="t-meta">{formatBytes(file.size)}</span>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setFile(null)} disabled={sending} aria-label={`Remove ${file.name}`}>
            <X />
          </Button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input ref={fileRef} type="file" className="sr-only" tabIndex={-1} aria-hidden onChange={pickFile} />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileRef.current?.click()}
          disabled={sending}
          aria-label="Attach a file (up to 25 MB)"
        >
          <Paperclip />
        </Button>
        <label htmlFor={`composer-${conversationId}`} className="sr-only">Message</label>
        <Textarea
          ref={textRef}
          id={`composer-${conversationId}`}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MAX_CHARS}
          placeholder={file ? 'Add a note (optional)' : 'Write a message'}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className="max-h-40 min-h-10 flex-1 resize-none py-2"
        />
        <Button type="submit" size="icon" disabled={!canSend} loading={sending} aria-label={sending ? 'Sending' : 'Send message'}>
          {!sending && <Send />}
        </Button>
      </div>
      <p id={counterId} className={cn('flex justify-between gap-2 t-meta', text.length < MAX_CHARS - 500 && 'max-sm:sr-only')}>
        <span>Enter to send, Shift+Enter for a new line.</span>
        {text.length >= MAX_CHARS - 500 && <span aria-live="polite">{MAX_CHARS - text.length} characters left</span>}
      </p>
    </form>
  );
}
