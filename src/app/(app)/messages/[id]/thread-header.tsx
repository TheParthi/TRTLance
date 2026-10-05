import Link from 'next/link';
import { ArrowLeft, FileSignature, FolderOpen } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { ConversationThread } from '@/lib/data/messages';

export function ThreadHeader({ conversation, projectTitle, counterpart }: Pick<ConversationThread, 'conversation' | 'projectTitle' | 'counterpart'>) {
  const name = counterpart?.display_name ?? 'Former member';
  const context = conversation.contract_id
    ? { href: `/contracts/${conversation.contract_id}`, label: 'Contract', tone: 'brand' as const, Icon: FileSignature }
    : { href: `/projects/${conversation.project_id}`, label: 'Proposal', tone: 'neutral' as const, Icon: FolderOpen };

  return (
    <header className="flex items-center gap-3 border-b px-3 py-3 sm:px-4">
      <Link
        href="/messages"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded text-ink-secondary hover:bg-surface-subtle hover:text-ink lg:hidden"
        aria-label="Back to all conversations"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </Link>
      <Avatar name={name} path={counterpart?.avatar_path} size="md" />
      <div className="min-w-0 flex-1">
        <h2 id="thread-title" className="truncate text-base font-semibold">
          {counterpart ? (
            <Link href={`/u/${counterpart.username}`} className="hover:underline">
              {name}
            </Link>
          ) : (
            name
          )}
        </h2>
        <Link href={context.href} className="group flex min-w-0 items-center gap-1.5 rounded text-xs text-ink-secondary hover:text-ink">
          <Badge tone={context.tone} className="shrink-0">
            <context.Icon aria-hidden />
            {context.label}
          </Badge>
          <span className="truncate group-hover:underline">{projectTitle}</span>
        </Link>
      </div>
    </header>
  );
}
