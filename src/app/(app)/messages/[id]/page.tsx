import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireViewer } from '@/lib/auth';
import { getConversationThread } from '@/lib/data/messages';
import { ThreadHeader } from './thread-header';
import { Thread } from './thread';

export const metadata: Metadata = { title: 'Messages' };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer(`/messages/${id}`);
  const thread = await getConversationThread(id, viewer.id);
  if (!thread) notFound();
  const name = thread.counterpart?.display_name ?? 'Former member';

  return (
    <section
      aria-labelledby="thread-title"
      className="flex h-[calc(100dvh-12.25rem)] min-h-[26rem] flex-col overflow-hidden rounded-lg border bg-surface shadow-xs md:h-[calc(100dvh-12.75rem)] lg:h-full lg:min-h-0 lg:rounded-none lg:border-0 lg:shadow-none"
    >
      <h1 className="sr-only lg:hidden">Conversation with {name}</h1>
      <ThreadHeader
        conversation={thread.conversation}
        projectTitle={thread.projectTitle}
        counterpart={thread.counterpart}
      />
      <Thread
        key={thread.conversation.id}
        conversationId={thread.conversation.id}
        viewerId={viewer.id}
        counterpartName={name}
        initialMessages={thread.messages}
        hasEarlier={thread.hasEarlier}
        otherReadAt={thread.otherReadAt}
      />
    </section>
  );
}
