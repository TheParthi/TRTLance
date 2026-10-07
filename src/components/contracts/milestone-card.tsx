'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarClock, Check, ChevronDown, ExternalLink, FileText, MessageSquareWarning, MoreHorizontal, Scale, Undo2, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Money } from '@/components/common/money';
import { MilestoneStatusMark } from '@/components/common/status-mark';
import { StatusIcon } from '@/components/common/status-icon';
import { approveMilestone, refundMilestone, releaseMilestone, requestRevision, type ReleaseResult } from '@/lib/actions/contracts';
import type { SubmissionWithFiles } from '@/lib/data/contracts';
import { daysUntil, disputeNumber, formatBytes, formatDate, formatDateTime } from '@/lib/format';
import { feePercent, feeSplit, formatAmount } from '@/lib/money';
import { milestoneStatus } from '@/lib/status';
import type { Contract, Milestone } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SubmitWorkDialog } from './submit-work-dialog';

const nodeTone: Record<string, string> = {
  neutral: 'border-line-strong bg-surface text-ink-muted',
  brand: 'border-brand bg-brand text-brand-foreground',
  info: 'border-info bg-info text-white',
  warning: 'border-warning bg-warning text-white',
  success: 'border-success bg-success text-white',
  danger: 'border-danger bg-danger text-white',
  refund: 'border-refund bg-refund text-white',
  brass: 'border-brass bg-brass text-white',
};

/**
 * One milestone on the contract's spine. Only the milestone that needs attention is expanded with
 * its primary action; secondary and risky actions sit in a "More" menu.
 */
export function MilestoneCard({ contract, milestone: m, submissions, role, holdDays, autoReleaseDays, highlighted, dispute, last }: {
  contract: Contract;
  milestone: Milestone;
  submissions: SubmissionWithFiles[];
  role: 'client' | 'freelancer';
  /** Working days a released payment is held before the freelancer can withdraw it. */
  holdDays: number;
  /** Days after a submission before an unanswered milestone pays out automatically. */
  autoReleaseDays: number;
  /** The milestone the next action points at. */
  highlighted: boolean;
  dispute?: { id: string; number: number } | null;
  last?: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = React.useState<null | 'submit' | 'revise' | 'approve' | 'release' | 'refund'>(null);
  const [comment, setComment] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const closed = ['paid', 'refunded', 'settled'].includes(m.status);
  const [expanded, setExpanded] = React.useState(highlighted || (!closed && m.status !== 'pending' && submissions.length > 0));
  const meta = milestoneStatus[m.status];
  const latest = submissions[0];
  const live = contract.status === 'active' || contract.status === 'disputed';
  const due = daysUntil(m.due_date);
  const open = ['funded', 'submitted', 'revision_requested', 'approved'].includes(m.status);
  const split = feeSplit(m.amount, contract.fee_bps);
  const autoReleaseOn = m.status === 'submitted' && m.submitted_at
    ? new Date(new Date(m.submitted_at).getTime() + autoReleaseDays * 86_400_000).toISOString()
    : null;

  // The steps this party can take on this milestone. Only the milestone the next action points at
  // shows them as buttons; on the others they wait in the "More" menu so one action leads the page.
  const steps: { key: 'submit' | 'revise' | 'approve' | 'release'; label: string; icon: React.ReactNode; quiet?: boolean; disabled?: boolean }[] = [];
  if (live && role === 'freelancer' && (m.status === 'funded' || m.status === 'revision_requested')) {
    steps.push({ key: 'submit', label: m.status === 'revision_requested' ? 'Submit update' : 'Submit work', icon: <Upload /> });
  }
  if (live && role === 'client' && m.status === 'submitted') {
    steps.push({ key: 'approve', label: 'Approve & release', icon: <Check /> });
    steps.push({ key: 'revise', label: 'Request changes', icon: <MessageSquareWarning />, quiet: true });
  }
  if (live && role === 'client' && m.status === 'approved') {
    steps.push({ key: 'release', label: 'Release payment', icon: <Check /> });
  }
  const shown = highlighted ? steps : [];
  const tucked = highlighted ? [] : steps.filter((st) => !st.disabled);
  const canRefund = live && role === 'freelancer' && m.status === 'funded';
  // A client may pay a milestone early, before any submission.
  const canPayEarly = live && role === 'client' && (m.status === 'funded' || m.status === 'revision_requested');
  const canDispute = live && open;
  const hasMenu = tucked.length > 0 || canRefund || canPayEarly || canDispute;

  const paid = (r: ReleaseResult) => {
    toast.success(r.already_paid ? 'This milestone was already paid.' : `Released. ${formatAmount(r.net ?? split.net)} goes to the freelancer${r.available_on ? `, withdrawable from ${formatDate(r.available_on)}` : ''}.`);
    setDialog(null);
    router.refresh();
  };

  return (
    <article id={`milestone-${m.position}`} className="relative scroll-mt-24 pb-10 pl-12 last:pb-2" aria-labelledby={`ms-${m.id}-title`}>
      {!last && <span className={cn('absolute bottom-0 left-4 top-9 w-px', closed ? 'bg-success/50' : 'bg-line-strong')} aria-hidden />}
      <span
        className={cn(
          'absolute left-0 top-0 flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold tabular-nums transition-shadow duration-slow ease-ledger',
          nodeTone[meta.tone],
          m.status === 'pending' && 'border-dashed',
          highlighted && 'ring-4 ring-brand/15',
        )}
        aria-hidden
      >
        {m.status === 'pending' || m.status === 'funded' ? String(m.position).padStart(2, '0') : <StatusIcon name={meta.icon} className="size-4" />}
      </span>

      <div className="space-y-3">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-1">
            <p className={cn('t-label-caps', highlighted && 'text-brand-strong')}>
              Milestone {String(m.position).padStart(2, '0')}{highlighted && <span> · current step</span>}
            </p>
            <h3 id={`ms-${m.id}-title`} className={cn('font-semibold leading-snug', highlighted ? 'text-xl' : 'text-lg')}>{m.title}</h3>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="size-3.5 text-ink-muted" aria-hidden />
                {m.due_date ? <>Due {formatDate(m.due_date)}{open && due !== null && <span className={cn(due < 0 ? 'text-danger-strong' : due <= 2 ? 'text-warning-strong' : '')}>&nbsp;· {due < 0 ? `${-due} days overdue` : due === 0 ? 'due today' : `${due} days left`}</span>}</> : `Due ${m.due_in_days} days after funding`}
              </span>
              {m.revision_count > 0 && <span>{m.revision_count} revision{m.revision_count === 1 ? '' : 's'}</span>}
              {m.paid_at && m.status === 'paid' && <span>Released {formatDate(m.paid_at)}{m.platform_fee !== null && <> · {formatAmount(m.platform_fee)} platform fee</>}</span>}
              {autoReleaseOn && <span>Pays automatically on {formatDate(autoReleaseOn)} if there is no response</span>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
            <Money amount={m.amount} size="lg" />
            <MilestoneStatusMark status={m.status} />
          </div>
        </header>

        {m.description && <p className="max-w-2xl text-sm text-ink-secondary">{m.description}</p>}

        {m.status === 'settled' && (
          <p className="text-sm text-ink-secondary">Split by the arbitrator: {formatAmount(m.freelancer_payout)} to the freelancer, {formatAmount(m.client_refund)} back to the client.</p>
        )}
        {dispute && m.status === 'disputed' && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-danger-strong">
            <Scale className="size-4" aria-hidden /> Frozen by {disputeNumber(dispute.number)} until the dispute is decided and settled.
            <Link className="font-semibold underline" href={`/disputes/${dispute.id}`}>Open dispute</Link>
          </p>
        )}

        {latest && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              aria-expanded={expanded}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary hover:text-ink"
            >
              <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} aria-hidden />
              <span className="text-left">
                Submission v{latest.version} · {formatDateTime(latest.created_at)}
                {submissions.length > 1 && <span className="ml-1 text-xs text-ink-muted">({submissions.length} versions)</span>}
              </span>
            </button>
            {expanded && (
              <div className="mt-3 space-y-3 rounded-lg bg-surface-subtle p-4">
                <p className="whitespace-pre-line text-sm">{latest.note}</p>
                {(latest.links.length > 0 || latest.files.length > 0) && (
                  <ul className="space-y-1 text-sm">
                    {latest.links.map((l) => (
                      <li key={l}><a href={l} target="_blank" rel="noreferrer noopener" className="link inline-flex max-w-full items-center gap-1 truncate"><ExternalLink className="size-3.5 shrink-0" aria-hidden /> {l}</a></li>
                    ))}
                    {latest.files.map((f) => (
                      <li key={f.id} className="flex items-center gap-1.5">
                        <FileText className="size-3.5 text-ink-muted" aria-hidden />
                        {f.url ? <a href={f.url} className="link truncate" target="_blank" rel="noreferrer">{f.file_name}</a> : f.file_name}
                        <span className="t-meta">{formatBytes(f.size_bytes)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {latest.review_status === 'revision_requested' && latest.review_comment && (
                  <div className="border-l-2 border-warning pl-3 text-sm">
                    <p className="font-medium text-warning-strong">Changes requested</p>
                    <p className="whitespace-pre-line text-ink-secondary">{latest.review_comment}</p>
                  </div>
                )}
                {submissions.length > 1 && (
                  <ol className="space-y-2 border-t pt-3 text-sm">
                    {submissions.slice(1).map((s) => (
                      <li key={s.id}>
                        <p className="t-meta">v{s.version} · {formatDateTime(s.created_at)}</p>
                        <p className="whitespace-pre-line text-ink-secondary">{s.note}</p>
                        {s.review_comment && <p className="text-warning-strong">Feedback: {s.review_comment}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        )}

        {(shown.length > 0 || hasMenu) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {shown.map((st) => (
              <Button key={st.key} variant={st.quiet ? 'ghost' : 'primary'} onClick={() => setDialog(st.key)} disabled={st.disabled}>
                {st.icon} {st.label}
              </Button>
            ))}
            {hasMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size={shown.length ? 'icon' : 'sm'} aria-label="More actions for this milestone">
                    <MoreHorizontal />{!shown.length && 'More'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {tucked.map((st) => <DropdownMenuItem key={st.key} onSelect={() => setDialog(st.key)}>{st.icon} {st.label}</DropdownMenuItem>)}
                  {canPayEarly && <DropdownMenuItem onSelect={() => setDialog('release')}><Check /> Release payment now</DropdownMenuItem>}
                  {canRefund && <DropdownMenuItem onSelect={() => setDialog('refund')}><Undo2 /> Return coins to the client</DropdownMenuItem>}
                  {canDispute && (
                    <DropdownMenuItem asChild>
                      <Link href={`/disputes/new?contract=${contract.id}&milestone=${m.id}`}><Scale /> Raise a dispute</Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      <SubmitWorkDialog open={dialog === 'submit'} onOpenChange={(o) => setDialog(o ? 'submit' : null)} contractId={contract.id} milestone={m} isRevision={m.status === 'revision_requested'} />

      <ConfirmDialog
        open={dialog === 'revise'}
        onOpenChange={(o) => setDialog(o ? 'revise' : null)}
        title={`Request changes to milestone ${m.position}`}
        description="The freelancer sees your feedback and submits an updated version. The coins stay secured in escrow."
        confirmLabel="Send request"
        busy={busy}
        onConfirm={async () => {
          if (comment.trim().length < 10) return toast.error('Explain what needs to change (at least 10 characters).');
          setBusy(true);
          const r = await requestRevision(contract.id, m.id, comment);
          setBusy(false);
          if (!r.ok) return toast.error(r.error.message);
          setDialog(null);
          setComment('');
          router.refresh();
        }}
      >
        <Field label="What needs to change">
          <Textarea rows={5} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={5000} />
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'approve' || dialog === 'release'}
        onOpenChange={(o) => setDialog(o ? dialog : null)}
        title={dialog === 'approve' ? `Approve and pay milestone ${m.position}?` : `Release milestone ${m.position}?`}
        description={`${dialog === 'approve' ? `You confirm “${m.title}” was delivered as agreed. ` : ''}${formatAmount(m.amount)} leaves escrow now. This cannot be undone.`}
        confirmLabel={dialog === 'approve' ? 'Approve and pay' : 'Release payment'}
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          const r = dialog === 'approve' ? await approveMilestone(contract.id, m.id) : await releaseMilestone(contract.id, m.id);
          setBusy(false);
          if (!r.ok) return toast.error(r.error.message);
          paid(r.data);
        }}
      >
        <dl className="divide-y border-y text-sm">
          <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Milestone</dt><dd><Money amount={m.amount} /></dd></div>
          <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Platform fee ({feePercent(contract.fee_bps)})</dt><dd><Money amount={split.fee} /></dd></div>
          <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Freelancer receives</dt><dd><Money amount={split.net} /></dd></div>
        </dl>
        <p className="text-sm text-ink-secondary">The freelancer can withdraw it to their bank account after {holdDays} working days.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'refund'}
        onOpenChange={(o) => setDialog(o ? 'refund' : null)}
        title={`Return milestone ${m.position} to the client?`}
        description={`Use this if you can’t deliver “${m.title}” and agree it should be refunded. The client gets all ${formatAmount(m.amount)} back in their coin wallet. This cannot be undone.`}
        confirmLabel="Return coins"
        tone="danger"
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          const r = await refundMilestone(contract.id, m.id);
          setBusy(false);
          if (!r.ok) return toast.error(r.error.message);
          toast.success('The coins were returned to the client.');
          setDialog(null);
          router.refresh();
        }}
      />
    </article>
  );
}
