'use client';

import * as React from 'react';
import { ArrowDown, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ThreadMessage } from '@/lib/data/messages';
import type { Message } from '@/lib/types';
import { useHydrated } from '../use-hydrated';
import { Composer } from './composer';
import { MessageList } from './message-list';
import { useThread } from './use-thread';

const NEAR_BOTTOM_PX = 120;

function PrivacyNote() {
  return (
    <p className="flex items-start justify-center gap-1.5 text-center text-xs text-ink-muted">
      <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>Visible only to you two and, in a dispute, the arbitrator · not end-to-end encrypted</span>
    </p>
  );
}

export function Thread({ conversationId, viewerId, counterpartName, initialMessages, hasEarlier: initialHasEarlier, otherReadAt }: {
  conversationId: string;
  viewerId: string;
  counterpartName: string;
  initialMessages: ThreadMessage[];
  hasEarlier: boolean;
  otherReadAt: string | null;
}) {
  const hydrated = useHydrated();
  const { messages, addMessages, hasEarlier, loadEarlier, loadingEarlier, earlierError } = useThread({
    conversationId, viewerId, initialMessages, hasEarlier: initialHasEarlier,
  });
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const atBottomRef = React.useRef(true);
  const prependAnchor = React.useRef<number | null>(null);
  const lastIdRef = React.useRef<string | undefined>(undefined);
  const [showJump, setShowJump] = React.useState(false);

  const scrollToBottom = React.useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    setShowJump(false);
  }, []);

  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Older messages were prepended: keep the viewport where it was.
    if (prependAnchor.current !== null) {
      el.scrollTop = el.scrollHeight - prependAnchor.current;
      prependAnchor.current = null;
      return;
    }
    const last = messages[messages.length - 1];
    if (last?.id === lastIdRef.current) return;
    const first = lastIdRef.current === undefined;
    lastIdRef.current = last?.id;
    if (first || atBottomRef.current || last?.sender_id === viewerId) scrollToBottom(!first);
    else setShowJump(true);
  }, [messages, viewerId, scrollToBottom]);

  // Day separators appear after hydration and shift the layout; stay pinned to the latest message.
  React.useLayoutEffect(() => {
    if (hydrated && atBottomRef.current) scrollToBottom();
  }, [hydrated, scrollToBottom]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (atBottomRef.current) setShowJump(false);
  }

  async function onLoadEarlier() {
    const el = scrollRef.current;
    if (el) prependAnchor.current = el.scrollHeight - el.scrollTop;
    await loadEarlier();
  }

  const onSent = React.useCallback((m: Message) => void addMessages([m]), [addMessages]);

  return (
    <>
      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={onScroll} className="h-full space-y-4 overflow-y-auto overscroll-contain px-1 py-4">
          <PrivacyNote />
          {hasEarlier && (
            <div className="flex flex-col items-center gap-1">
              <Button variant="secondary" size="sm" onClick={() => void onLoadEarlier()} loading={loadingEarlier}>
                Load earlier messages
              </Button>
              {earlierError && <p role="alert" className="text-xs text-danger-strong">Earlier messages could not be loaded. Try again.</p>}
            </div>
          )}
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-muted">
              No messages yet. Say hello to {counterpartName} and discuss the work.
            </p>
          ) : null}
          <MessageList
            messages={messages}
            viewerId={viewerId}
            counterpartName={counterpartName}
            otherReadAt={otherReadAt}
            hydrated={hydrated}
          />
        </div>
        {showJump && (
          <Button size="sm" variant="secondary" className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-md" onClick={() => scrollToBottom(true)}>
            <ArrowDown /> New messages
          </Button>
        )}
      </div>
      <Composer conversationId={conversationId} viewerId={viewerId} onSent={onSent} />
    </>
  );
}
