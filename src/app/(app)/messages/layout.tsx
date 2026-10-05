import { canHire, canWork, requireViewer } from '@/lib/auth';
import { getConversations, type ConversationSummary } from '@/lib/data/messages';
import { ConversationList } from './conversation-list';
import { MessagesFrame } from './frame';

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer('/messages');
  let conversations: ConversationSummary[] | null = null;
  try {
    conversations = await getConversations(viewer.id);
  } catch (error) {
    console.error('[messages] list', error);
  }
  return (
    <MessagesFrame
      list={
        <ConversationList
          conversations={conversations}
          viewerId={viewer.id}
          emptyAction={canWork(viewer) ? { label: 'Find work', href: '/work' } : canHire(viewer) ? { label: 'Post a project', href: '/projects/new' } : null}
        />
      }
    >
      {children}
    </MessagesFrame>
  );
}
