import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';

export const metadata: Metadata = { title: 'Messages' };

/** Large screens only: the empty right-hand pane. On phones the list (from the layout) is the whole page. */
export default async function MessagesPage() {
  await requireViewer('/messages');
  return (
    <div className="hidden h-full flex-col items-center justify-center gap-1 p-8 text-center lg:flex">
      <p className="font-medium">Select a conversation</p>
      <p className="max-w-sm text-sm text-ink-secondary">
        Conversations are tied to a project, and to its contract once someone is hired, so the context is always one click away.
      </p>
    </div>
  );
}
