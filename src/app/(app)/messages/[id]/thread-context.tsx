import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { EscrowRail, RailLegend } from '@/components/common/escrow-rail';
import { Rule } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { ContractStatusMark } from '@/components/common/status-mark';
import type { ConversationThread } from '@/lib/data/messages';
import { milestoneSegments, stateSegments } from '@/lib/escrow-summary';
import { cn } from '@/lib/utils';

/** The third column on wide screens: what this conversation is about, and where its money is. */
export function ThreadContext({ conversation, projectTitle, contract, counterpart, className }: Pick<ConversationThread, 'conversation' | 'projectTitle' | 'contract' | 'counterpart'> & { className?: string }) {
  const name = counterpart?.display_name ?? 'Former member';
  return (
    <aside aria-label="About this conversation" className={cn('min-h-0 space-y-6 overflow-y-auto border-l pl-6', className)}>
      {conversation.contract_id ? (
        <section className="space-y-3" aria-labelledby="context-contract">
          <h2 id="context-contract" className="t-label-caps">Contract</h2>
          <div className="space-y-1.5">
            <Link href={`/contracts/${conversation.contract_id}`} className="block font-medium leading-snug hover:text-brand-strong">
              {contract?.title ?? projectTitle}
            </Link>
            {contract && <ContractStatusMark status={contract.status} />}
          </div>
          {contract && contract.milestones.length > 0 && (
            <div className="space-y-3">
              <EscrowRail segments={milestoneSegments(contract.milestones)} label={contract.title} />
              <RailLegend
                className="flex-col items-start gap-y-1.5"
                items={stateSegments(contract.milestones).map((s) => ({ state: s.parts[0].state, amount: s.parts[0].amount }))}
              />
              <p className="flex items-baseline justify-between gap-3 border-t pt-3 text-sm">
                <span className="text-ink-muted">Total</span>
                <Money amount={contract.total_amount} />
              </p>
            </div>
          )}
          <Link href={`/contracts/${conversation.contract_id}`} className="link inline-flex items-center gap-1 text-sm">
            Open contract <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </section>
      ) : (
        <section className="space-y-2" aria-labelledby="context-project">
          <h2 id="context-project" className="t-label-caps">Proposal</h2>
          <Link href={`/projects/${conversation.project_id}`} className="block font-medium leading-snug hover:text-brand-strong">{projectTitle}</Link>
          <p className="text-sm text-ink-secondary">No contract yet. Escrow starts after the client hires and funds the contract.</p>
          <Link href={`/projects/${conversation.project_id}`} className="link inline-flex items-center gap-1 text-sm">
            Open project <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </section>
      )}
      <Rule />
      <section className="space-y-3" aria-labelledby="context-member">
        <h2 id="context-member" className="t-label-caps">With</h2>
        <div className="flex items-center gap-3">
          <Avatar name={name} path={counterpart?.avatar_path} size="sm" />
          {counterpart ? (
            <Link href={`/u/${counterpart.username}`} className="min-w-0 truncate text-sm font-medium hover:underline">{name}</Link>
          ) : (
            <span className="text-sm font-medium">{name}</span>
          )}
        </div>
      </section>
    </aside>
  );
}
