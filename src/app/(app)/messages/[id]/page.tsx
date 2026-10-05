import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireViewer } from '@/lib/auth';
import { getConversationThread } from '@/lib/data/messages';
import { milestoneSegments } from '@/lib/escrow-summary';
import { ThreadContext } from './thread-context';
import { ThreadHeader } from './thread-header';
import { Thread } from './thread';

export const metadata: Metadata = { title: 'Messages' };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer(`/messages/${id}`);
  const thread = await getConversationThread(id, viewer.id);
  if (!thread) notFound();
  const name = thread.counterpart?.display_name ?? 'Former member';
  const rail = thread.contract?.milestones.length ? milestoneSegments(thread.contract.milestones) : null;

  return (
    <div className="flex h-[calc(100dvh-12.25rem)] min-h-[26rem] min-w-0 md:h-[calc(100dvh-12.75rem)] lg:h-full lg:min-h-0 xl:grid xl:grid-cols-[minmax(0,1fr)_15rem] xl:gap-6">
      <section aria-labelledby="thread-title" className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <h1 className="sr-only lg:hidden">Conversation with {name}</h1>
        <ThreadHeader
          conversation={thread.conversation}
          projectTitle={thread.projectTitle}
          rail={rail}
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
      <ThreadContext
        className="hidden xl:block"
        conversation={thread.conversation}
        projectTitle={thread.projectTitle}
        contract={thread.contract}
        counterpart={thread.counterpart}
      />
    </div>
  );
}
