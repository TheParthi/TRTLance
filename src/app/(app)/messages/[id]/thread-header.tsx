import Link from 'next/link';
import { ArrowLeft, FileSignature, FolderOpen } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { EscrowRail } from '@/components/common/escrow-rail';
import type { ConversationThread } from '@/lib/data/messages';
import type { RailSegment } from '@/lib/escrow-summary';

/** Who and what the thread is about. The rail shows here until the context column appears (xl). */
export function ThreadHeader({ conversation, projectTitle, rail, counterpart }: Pick<ConversationThread, 'conversation' | 'projectTitle' | 'counterpart'> & { rail: RailSegment[] | null }) {
  const name = counterpart?.display_name ?? 'Former member';
  const context = conversation.contract_id
    ? { href: `/contracts/${conversation.contract_id}`, label: 'Contract', Icon: FileSignature }
    : { href: `/projects/${conversation.project_id}`, label: 'Proposal', Icon: FolderOpen };

  return (
    <header className="flex items-start gap-3 border-b pb-3 pt-1">
      <Link
        href="/messages"
        className="-ml-2 inline-flex size-10 shrink-0 items-center justify-center rounded text-ink-secondary hover:bg-surface-subtle hover:text-ink lg:hidden"
        aria-label="Back to all conversations"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </Link>
      <Avatar name={name} path={counterpart?.avatar_path} size="md" />
      <div className="min-w-0 flex-1 space-y-1">
        <h2 id="thread-title" className="truncate text-base font-semibold leading-tight">
          {counterpart ? (
            <Link href={`/u/${counterpart.username}`} className="hover:underline">
              {name}
            </Link>
          ) : (
            name
          )}
        </h2>
        <Link href={context.href} className="group flex min-w-0 items-center gap-1.5 rounded text-xs text-ink-secondary hover:text-ink">
          <context.Icon className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
          <span className="shrink-0 text-ink-muted">{context.label} ·</span>
          <span className="truncate group-hover:underline">{projectTitle}</span>
        </Link>
        {rail && rail.length > 0 && <div className="max-w-xs pt-1 xl:hidden"><EscrowRail segments={rail} size="sm" label={projectTitle} /></div>}
      </div>
    </header>
  );
}
