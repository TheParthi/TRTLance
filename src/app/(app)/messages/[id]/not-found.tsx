import { MessageSquareOff } from 'lucide-react';
import { EmptyState } from '@/components/common/states';

export default function ConversationNotFound() {
  return (
    <div className="lg:p-6">
      <EmptyState
        icon={MessageSquareOff}
        title="Conversation not found"
        description="It may have been removed, or you are not one of its members."
        action={{ label: 'All conversations', href: '/messages' }}
      />
    </div>
  );
}
