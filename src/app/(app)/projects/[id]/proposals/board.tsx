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
import { ProposalStatusBadge } from '@/components/common/status-badge';
import { TrustSignals } from '@/components/common/trust-signals';
import { MessageButton } from '@/components/projects/project-actions';
import { acceptProposal, declineProposal } from '@/lib/actions/projects';
import type { PublicMember, ProposalWithMilestones } from '@/lib/data/projects';
import { formatRelative } from '@/lib/format';
import { formatAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

interface Item { proposal: ProposalWithMilestones; member: PublicMember | null; matched: string[] }

export function ProposalBoard({ projectId, projectOpen, budget, projectSkillCount, items }: {
  projectId: string;
  projectOpen: boolean;
  budget: string | null;
  projectSkillCount: number;
  items: Item[];
}) {
  const [filter, setFilter] = React.useState<'pending' | 'all'>('pending');
  const [hire, setHire] = React.useState<Item | null>(null);
  const [decline, setDecline] = React.useState<Item | null>(null);
  const shown = items.filter((i) => filter === 'all' || i.proposal.status === 'pending');
  const pendingCount = items.filter((i) => i.proposal.status === 'pending').length;

  return (
    <div className="space-y-5">
      <div role="radiogroup" aria-label="Show" className="inline-flex rounded border bg-surface p-0.5 text-sm">
        {(['pending', 'all'] as const).map((f) => (
          <button key={f} role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}
            className={cn('rounded-sm px-3 py-1.5', filter === f ? 'bg-surface-sunken font-semibold' : 'text-ink-secondary')}>
            {f === 'pending' ? `Pending (${pendingCount})` : `All (${items.length})`}
          </button>
        ))}
      </div>

      {/* Side-by-side comparison on wide screens */}
      {shown.length > 1 && (
        <div className="panel hidden overflow-x-auto md:block">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">Proposal comparison</caption>
            <thead>
              <tr className="border-b bg-surface-subtle text-left">
                <th scope="col" className="p-3 font-medium text-ink-muted">Freelancer</th>
                <th scope="col" className="p-3 font-medium text-ink-muted">Price</th>
                <th scope="col" className="p-3 font-medium text-ink-muted">Duration</th>
                <th scope="col" className="p-3 font-medium text-ink-muted">Milestones</th>
                <th scope="col" className="p-3 font-medium text-ink-muted">Skill match</th>
                <th scope="col" className="p-3 font-medium text-ink-muted">Track record</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shown.map(({ proposal: p, member: m, matched }) => (
                <tr key={p.id}>
                  <th scope="row" className="p-3 text-left font-medium"><a href={`#proposal-${p.id}`} className="hover:text-brand">{m?.display_name ?? 'Member'}</a></th>
                  <td className="p-3"><Money amount={p.amount} size="sm" /></td>
                  <td className="p-3">{p.duration_days} days</td>
                  <td className="p-3">{p.milestones.length}</td>
                  <td className="p-3">{matched.length}/{projectSkillCount}</td>
                  <td className="p-3 text-ink-secondary">
                    {m?.stats ? `${m.stats.completed_as_freelancer} completed · ${m.stats.review_count ? `${Number(m.stats.rating_avg).toFixed(1)}★` : 'no reviews'}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ul className="space-y-4">
        {shown.map((item) => (
          <li key={item.proposal.id} id={`proposal-${item.proposal.id}`} className="scroll-mt-20">
            <ProposalCard item={item} budget={budget} projectSkillCount={projectSkillCount} projectOpen={projectOpen}
              onHire={() => setHire(item)} onDecline={() => setDecline(item)} />
          </li>
        ))}
        {shown.length === 0 && <li className="text-sm text-ink-secondary">No pending proposals. <button className="link" onClick={() => setFilter('all')}>Show all</button></li>}
      </ul>

      {hire && <HireDialog item={hire} onClose={() => setHire(null)} />}
      {decline && <DeclineDialog item={decline} projectId={projectId} onClose={() => setDecline(null)} />}
    </div>
  );
}

function ProposalCard({ item, budget, projectSkillCount, projectOpen, onHire, onDecline }: {
  item: Item; budget: string | null; projectSkillCount: number; projectOpen: boolean; onHire: () => void; onDecline: () => void;
}) {
  const { proposal: p, member: m, matched } = item;
  const [open, setOpen] = React.useState(false);
  return (
    <article className="panel overflow-hidden">
      <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={m?.display_name ?? '?'} path={m?.avatar_path} />
            <div className="min-w-0">
              {m ? <Link href={`/u/${m.username}`} className="font-semibold hover:text-brand">{m.display_name}</Link> : <span className="font-semibold">Member</span>}
              <p className="t-meta truncate">{m?.headline ?? 'No headline'} · sent {formatRelative(p.created_at)}</p>
            </div>
            <ProposalStatusBadge status={p.status} />
          </div>
          {m?.stats && <TrustSignals stats={m.stats} role="freelancer" compact />}
          <p className={cn('whitespace-pre-line text-sm text-ink-secondary', !open && 'line-clamp-3')}>{p.cover_letter}</p>
          <p className="text-xs text-ink-secondary">
            Skill match: <span className="font-medium text-ink">{matched.length} of {projectSkillCount}</span>
            {matched.length > 0 && <> ({matched.join(', ')})</>}
          </p>
        </div>
        <div className="space-y-1 md:text-right">
          <Money amount={p.amount} size="xl" />
          <p className="t-meta">{p.duration_days} days · {p.milestones.length} milestone{p.milestones.length === 1 ? '' : 's'}</p>
          {budget && <p className="t-meta">Your budget {formatAmount(budget)}</p>}
        </div>
      </div>
      <div className="border-t">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-ink-secondary hover:bg-surface-subtle">
          {open ? 'Hide details' : 'Show cover letter and milestones'}
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
        {open && (
          <ol className="divide-y border-t">
            {p.milestones.map((ms) => (
              <li key={ms.id} className="flex items-start justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{ms.position}. {ms.title}</p>
                  {ms.description && <p className="text-sm text-ink-secondary">{ms.description}</p>}
                  <p className="t-meta">Due by day {ms.due_in_days}</p>
                </div>
                <Money amount={ms.amount} size="sm" />
              </li>
            ))}
          </ol>
        )}
      </div>
      {p.status === 'pending' && projectOpen && (
        <div className="flex flex-col-reverse gap-2 border-t bg-surface-subtle p-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onDecline}>Decline</Button>
          <MessageButton proposalId={p.id} />
          <Button onClick={onHire}>Hire {m?.display_name.split(' ')[0] ?? ''}</Button>
        </div>
      )}
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
