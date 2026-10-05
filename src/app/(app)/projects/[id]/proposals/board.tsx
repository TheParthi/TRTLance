'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Lock } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Money } from '@/components/common/money';
import { EscrowRail } from '@/components/common/escrow-rail';
import { ProposalStatusMark } from '@/components/common/status-mark';
import { TrustLine } from '@/components/common/trust-signals';
import { MessageButton } from '@/components/projects/project-actions';
import { acceptProposal, declineProposal } from '@/lib/actions/projects';
import type { PublicMember, ProposalWithMilestones } from '@/lib/data/projects';
import { formatRelative } from '@/lib/format';
import { proposalSegments } from '@/lib/escrow-summary';
import { formatAmount, toWei, weiToAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

interface Item { proposal: ProposalWithMilestones; member: PublicMember | null; matched: string[] }

export function ProposalBoard({ projectId, projectOpen, budget, projectSkillCount, items }: {
  projectId: string;
  projectOpen: boolean;
  budget: string | null;
  projectSkillCount: number;
  items: Item[];
}) {
  const pendingCount = items.filter((i) => i.proposal.status === 'pending').length;
  const [filter, setFilter] = React.useState<'pending' | 'all'>(pendingCount ? 'pending' : 'all');
  const [hire, setHire] = React.useState<Item | null>(null);
  const [decline, setDecline] = React.useState<Item | null>(null);
  const shown = items.filter((i) => filter === 'all' || i.proposal.status === 'pending');
  // Rails share one scale (the largest of the budget and the shown prices), so their lengths compare like the prices do.
  const scale = shown.reduce((max, i) => (toWei(i.proposal.amount) > max ? toWei(i.proposal.amount) : max), budget ? toWei(budget) : 0n);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Show" className="inline-flex rounded border bg-surface p-0.5 text-sm">
          {(['pending', 'all'] as const).map((f) => (
            <button key={f} role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}
              className={cn('h-9 rounded-sm px-3', filter === f ? 'bg-surface-sunken font-semibold' : 'text-ink-secondary')}>
              {f === 'pending' ? `Pending (${pendingCount})` : `All (${items.length})`}
            </button>
          ))}
        </div>
        {budget && <p className="flex items-baseline gap-2 text-sm text-ink-secondary">Your budget <Money amount={budget} size="sm" className="text-ink" /></p>}
      </div>

      {shown.length === 0 ? (
        <p className="border-y py-5 text-sm text-ink-secondary">No pending proposals. <button className="link" onClick={() => setFilter('all')}>Show all</button></p>
      ) : (
        /* One column per proposal from md up (rows aligned with subgrid, scrolls sideways past three); stacked rows on phones. */
        <div className="min-w-0 border-y md:overflow-x-auto md:border-y-0 md:pb-3">
          <div
            role="list"
            aria-label="Proposals"
            className={cn(
              'divide-y md:grid md:grid-flow-col md:grid-rows-[repeat(9,auto)] md:gap-x-8 md:divide-y-0',
              shown.length < 3 ? 'md:auto-cols-[minmax(18rem,26rem)]' : 'md:auto-cols-[minmax(18rem,1fr)]',
            )}
          >
            {shown.map((item) => (
              <ProposalColumn key={item.proposal.id} item={item} budget={budget} scale={scale} projectSkillCount={projectSkillCount} projectOpen={projectOpen}
                onHire={() => setHire(item)} onDecline={() => setDecline(item)} />
            ))}
          </div>
        </div>
      )}

      {hire && <HireDialog item={hire} onClose={() => setHire(null)} />}
      {decline && <DeclineDialog item={decline} projectId={projectId} onClose={() => setDecline(null)} />}
    </div>
  );
}

/** One comparison cell. On phones short facts sit on one line (label left, value right). */
function Cell({ label, children, inline, className }: { label?: string; children: React.ReactNode; inline?: boolean; className?: string }) {
  return (
    <div className={cn('min-w-0 md:border-t md:py-4', inline ? 'flex items-baseline justify-between gap-4 md:block md:space-y-1' : 'space-y-2', className)}>
      {label && <p className="t-label-caps">{label}</p>}
      {children}
    </div>
  );
}

function budgetDelta(amount: string, budget: string | null) {
  if (!budget || !Number(budget)) return null;
  const diff = toWei(amount) - toWei(budget);
  if (diff === 0n) return 'Matches your budget';
  return `${formatAmount(weiToAmount(diff < 0n ? -diff : diff))} ${diff < 0n ? 'under' : 'over'} your budget`;
}

function ProposalColumn({ item, budget, scale, projectSkillCount, projectOpen, onHire, onDecline }: {
  item: Item; budget: string | null; scale: bigint; projectSkillCount: number; projectOpen: boolean; onHire: () => void; onDecline: () => void;
}) {
  const { proposal: p, member: m, matched } = item;
  const [open, setOpen] = React.useState(false);
  const delta = budgetDelta(p.amount, budget);
  const titleId = `proposal-${p.id}-name`;
  const detailsId = `proposal-${p.id}-details`;
  const railWidth = scale > 0n ? Math.max(12, Number((toWei(p.amount) * 1000n) / scale) / 10) : 100;
  const completed = m?.stats?.completed_as_freelancer ?? 0;
  return (
    <article
      id={`proposal-${p.id}`}
      role="listitem"
      aria-labelledby={titleId}
      className="scroll-mt-20 space-y-4 py-6 md:row-span-9 md:grid md:grid-rows-subgrid md:gap-0 md:space-y-0 md:py-0"
    >
      <header className="flex min-w-0 items-center gap-3 md:pb-4">
        <Avatar name={m?.display_name ?? '?'} path={m?.avatar_path} />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate font-semibold">
            {m ? <Link href={`/u/${m.username}`} className="hover:text-brand">{m.display_name}</Link> : 'Member'}
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 t-meta">
            Sent {formatRelative(p.created_at)}
            {p.status !== 'pending' && <ProposalStatusMark status={p.status} />}
          </p>
        </div>
      </header>

      <Cell label="Amount" inline>
        <div className="text-right md:text-left">
          <Money amount={p.amount} size="xl" />
          {delta && <p className="t-meta">{delta}</p>}
        </div>
      </Cell>

      <Cell label="Timeline" inline>
        <p className="text-sm">{p.duration_days} days</p>
      </Cell>

      <Cell label="Milestones">
        <div style={{ width: `${railWidth}%` }}>
          <EscrowRail segments={proposalSegments(p.milestones)} label={`Milestones proposed by ${m?.display_name ?? 'this freelancer'}, ${formatAmount(p.amount)} in total`} />
        </div>
        <ol className="space-y-1 text-sm">
          {p.milestones.map((ms) => (
            <li key={ms.id} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate">{ms.position}. {ms.title}</span>
              <Money amount={ms.amount} size="sm" className="shrink-0" />
            </li>
          ))}
        </ol>
      </Cell>

      <Cell label="Skills" inline>
        <p className="text-right text-sm md:text-left">
          <span className="font-medium">{matched.length} of {projectSkillCount} match</span>
          {matched.length > 0 && <span className="text-ink-secondary"> · {matched.join(', ')}</span>}
        </p>
      </Cell>

      <Cell label="Trust facts">
        {m?.stats ? <TrustLine stats={m.stats} role="freelancer" /> : <p className="text-xs text-ink-muted">New to TrustLance</p>}
      </Cell>

      <Cell label="Relevant experience">
        {m?.headline && <p className="text-sm">{m.headline}</p>}
        {p.relevant_skills.length > 0 && (
          <p className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-ink-secondary">{p.relevant_skills.map((s) => <span key={s}>#{s}</span>)}</p>
        )}
        {completed > 0 && <p className="t-meta">{completed} contract{completed === 1 ? '' : 's'} completed on TrustLance</p>}
        {!m?.headline && !p.relevant_skills.length && !completed && <p className="text-xs text-ink-muted">Not stated</p>}
      </Cell>

      <Cell label="Cover letter">
        <p className={cn('whitespace-pre-line text-sm text-ink-secondary', !open && 'line-clamp-3')}>{p.cover_letter}</p>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={detailsId}
          className="inline-flex h-10 items-center gap-1 text-sm font-medium text-brand md:h-8">
          {open ? 'Hide letter and milestone details' : 'Read letter and milestone details'}
          <ChevronDown className={cn('size-4 transition-transform duration-base ease-ledger', open && 'rotate-180')} aria-hidden />
        </button>
        <div id={detailsId} hidden={!open} className="space-y-1">
          <p className="t-label-caps pt-1">Milestone details</p>
          <ol className="divide-y text-sm">
            {p.milestones.map((ms) => (
              <li key={ms.id} className="space-y-0.5 py-2">
                <p className="flex items-baseline justify-between gap-3 font-medium">
                  <span className="min-w-0">{ms.position}. {ms.title}</span>
                  <Money amount={ms.amount} size="sm" className="shrink-0" />
                </p>
                {ms.description && <p className="text-xs text-ink-secondary">{ms.description}</p>}
                <p className="t-meta">Due by day {ms.due_in_days}</p>
              </li>
            ))}
          </ol>
        </div>
      </Cell>

      <Cell className="md:pb-0">
        {p.status === 'pending' && projectOpen ? (
          <div className="space-y-2">
            {/* Equal options side by side, so none is filled: the hire dialog holds the one primary action. */}
            <Button variant="secondary" className="w-full border-brand/40 text-brand-strong hover:bg-brand-soft" onClick={onHire}>Hire {m?.display_name.split(' ')[0] ?? ''}</Button>
            <div className="flex gap-2">
              <MessageButton proposalId={p.id} className="flex-1" />
              <Button variant="ghost" className="flex-1" onClick={onDecline}>Decline</Button>
            </div>
          </div>
        ) : (
          <p className="t-meta">{p.status === 'pending' ? 'This project is not accepting proposals.' : `No actions — this proposal is ${p.status}.`}</p>
        )}
      </Cell>
    </article>
  );
}

function HireDialog({ item, onClose }: { item: Item; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const { proposal: p, member: m } = item;
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Hire ${m?.display_name ?? 'this freelancer'}?`}
      description="This creates a contract from this proposal. All other pending proposals are declined."
      confirmLabel="Hire and create contract"
      busy={busy}
      onConfirm={async () => {
        setBusy(true);
        const r = await acceptProposal(p.id);
        if (!r.ok) {
          setBusy(false);
          return toast.error(r.error.message);
        }
        toast.success('Contract created. Review and sign it next.');
        router.push(`/contracts/${r.data}`);
      }}
    >
      <div className="space-y-4 text-sm">
        <dl className="divide-y rounded-lg border">
          <div className="flex justify-between p-3"><dt className="text-ink-muted">Contract total</dt><dd><Money amount={p.amount} /></dd></div>
          <div className="flex justify-between p-3"><dt className="text-ink-muted">Milestones</dt><dd>{p.milestones.length}</dd></div>
          <div className="flex justify-between p-3"><dt className="text-ink-muted">Duration</dt><dd>{p.duration_days} days</dd></div>
        </dl>
        <ol className="list-decimal space-y-1 pl-5 text-ink-secondary">
          <li>You both review and sign the contract terms.</li>
          <li>You deposit <strong className="text-ink">{formatAmount(p.amount)}</strong> into escrow from your verified wallet.</li>
          <li>Work starts once the deposit is confirmed on-chain.</li>
        </ol>
        <p className="flex gap-2 text-xs text-ink-muted"><Lock className="size-3.5 shrink-0" aria-hidden /> No money moves when you click hire.</p>
      </div>
    </ConfirmDialog>
  );
}

function DeclineDialog({ item, projectId, onClose }: { item: Item; projectId: string; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [reason, setReason] = React.useState('');
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Decline this proposal?"
      description={`${item.member?.display_name ?? 'The freelancer'} will be notified.`}
      confirmLabel="Decline"
      tone="danger"
      busy={busy}
      onConfirm={async () => {
        setBusy(true);
        const r = await declineProposal(item.proposal.id, projectId, reason);
        setBusy(false);
        if (!r.ok) return toast.error(r.error.message);
        onClose();
        router.refresh();
      }}
    >
      <Field label="Message" optional hint="A short, kind reason helps freelancers improve.">
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
      </Field>
    </ConfirmDialog>
  );
}
