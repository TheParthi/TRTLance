'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarClock, Check, ExternalLink, FileText, MessageSquareWarning, Scale, Undo2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Money } from '@/components/common/money';
import { MilestoneStatusBadge } from '@/components/common/status-badge';
import { EscrowTxDialog } from '@/components/escrow/escrow-tx-dialog';
import { approveMilestone, requestRevision } from '@/lib/actions/contracts';
import type { SubmissionWithFiles } from '@/lib/data/contracts';
import { isEscrowConfigured } from '@/lib/env';
import { daysUntil, formatBytes, formatDate, formatDateTime, shortAddress } from '@/lib/format';
import { formatAmount } from '@/lib/money';
import { milestoneStatus } from '@/lib/status';
import type { Contract, Milestone } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SubmitWorkDialog } from './submit-work-dialog';

export function MilestoneCard({ contract, milestone: m, submissions, role, hasPendingTx, highlighted }: {
  contract: Contract;
  milestone: Milestone;
  submissions: SubmissionWithFiles[];
  role: 'client' | 'freelancer';
  hasPendingTx: boolean;
  highlighted: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = React.useState<null | 'submit' | 'revise' | 'approve' | 'release' | 'refund'>(null);
  const [comment, setComment] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const meta = milestoneStatus[m.status];
  const latest = submissions[0];
  const live = contract.status === 'active' || contract.status === 'disputed';
  const due = daysUntil(m.due_date);
  const open = ['funded', 'submitted', 'revision_requested', 'approved'].includes(m.status);
  const index = m.position - 1;

  const release = () => setDialog('release');

  return (
    <article id={`milestone-${m.position}`} className={cn('panel scroll-mt-24 overflow-hidden', highlighted && 'ring-2 ring-brand/40')} aria-labelledby={`ms-${m.id}-title`}>
      <header className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="t-eyebrow">Milestone {m.position}</span>
            <MilestoneStatusBadge status={m.status} />
            {m.revision_count > 0 && <span className="t-meta">{m.revision_count} revision{m.revision_count === 1 ? '' : 's'}</span>}
          </div>
          <h3 id={`ms-${m.id}-title`} className="font-semibold">{m.title}</h3>
          {m.description && <p className="text-sm text-ink-secondary">{m.description}</p>}
          <p className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <CalendarClock className="size-3.5 text-ink-muted" aria-hidden />
            {m.due_date
              ? <>Due {formatDate(m.due_date)}{open && due !== null && <span className={cn(due < 0 ? 'text-danger-strong' : due <= 2 ? 'text-warning-strong' : '')}> · {due < 0 ? `${-due} days overdue` : due === 0 ? 'due today' : `${due} days left`}</span>}</>
              : `Due ${m.due_in_days} days after funding`}
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          <Money amount={m.amount} size="lg" />
          {m.freelancer_payout && m.status !== 'paid' && <p className="t-meta">Freelancer received {formatAmount(m.freelancer_payout)}</p>}
          {m.client_refund && <p className="t-meta">Refunded {formatAmount(m.client_refund)}</p>}
          {m.paid_at && m.status === 'paid' && <p className="t-meta">Released {formatDate(m.paid_at)}</p>}
        </div>
      </header>

      <p className="sr-only">{meta.description}</p>

      {latest && (
        <div className="space-y-3 border-t bg-surface-subtle px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Submission v{latest.version}</p>
            <p className="t-meta">{formatDateTime(latest.created_at)}</p>
          </div>
          <p className="whitespace-pre-line text-sm text-ink-secondary">{latest.note}</p>
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
            <div className="rounded border-l-2 border-warning bg-warning-soft p-3 text-sm">
              <p className="font-medium text-warning-strong">Changes requested</p>
              <p className="whitespace-pre-line text-ink-secondary">{latest.review_comment}</p>
            </div>
          )}
          {submissions.length > 1 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-ink-muted hover:text-ink">Earlier versions ({submissions.length - 1})</summary>
              <ol className="mt-2 space-y-2">
                {submissions.slice(1).map((s) => (
                  <li key={s.id} className="rounded border bg-surface p-3">
                    <p className="t-meta">v{s.version} · {formatDateTime(s.created_at)}</p>
                    <p className="mt-1 whitespace-pre-line text-ink-secondary">{s.note}</p>
                    {s.review_comment && <p className="mt-1 text-warning-strong">Feedback: {s.review_comment}</p>}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      )}

      {live && (
        <footer className="flex flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {open && (
            <Button asChild variant="ghost" size="sm" className="sm:mr-auto">
              <Link href={`/disputes/new?contract=${contract.id}&milestone=${m.id}`}><Scale /> Raise a dispute</Link>
            </Button>
          )}
          {role === 'freelancer' && (m.status === 'funded' || m.status === 'revision_requested') && (
            <>
              {m.status === 'funded' && (
                <Button variant="secondary" size="sm" onClick={() => setDialog('refund')} disabled={hasPendingTx || !isEscrowConfigured()}><Undo2 /> Return funds</Button>
              )}
              <Button onClick={() => setDialog('submit')}><Upload /> {m.status === 'revision_requested' ? 'Submit update' : 'Submit work'}</Button>
            </>
          )}
          {role === 'client' && m.status === 'submitted' && (
            <>
              <Button variant="secondary" onClick={() => setDialog('revise')}><MessageSquareWarning /> Request changes</Button>
              <Button onClick={() => setDialog('approve')}><Check /> Approve & release</Button>
            </>
          )}
          {role === 'client' && m.status === 'approved' && (
            <Button onClick={release} disabled={hasPendingTx || !isEscrowConfigured()}>{hasPendingTx ? 'Release confirming…' : 'Release payment'}</Button>
          )}
        </footer>
      )}

      <SubmitWorkDialog open={dialog === 'submit'} onOpenChange={(o) => setDialog(o ? 'submit' : null)} contractId={contract.id} milestone={m} isRevision={m.status === 'revision_requested'} />

      <ConfirmDialog
        open={dialog === 'revise'}
        onOpenChange={(o) => setDialog(o ? 'revise' : null)}
        title={`Request changes to milestone ${m.position}`}
        description="The freelancer sees your feedback and submits an updated version. Funds stay secured in escrow."
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
        open={dialog === 'approve'}
        onOpenChange={(o) => setDialog(o ? 'approve' : null)}
        title={`Approve milestone ${m.position}?`}
        description={`You confirm “${m.title}” was delivered as agreed. Next, your wallet asks you to release ${formatAmount(m.amount)} from escrow to the freelancer.`}
        confirmLabel="Approve and continue"
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          const r = await approveMilestone(contract.id, m.id);
          setBusy(false);
          if (!r.ok) return toast.error(r.error.message);
          router.refresh();
          setDialog(isEscrowConfigured() ? 'release' : null);
        }}
      />

      {contract.escrow_key && (
        <>
          <EscrowTxDialog
            open={dialog === 'release'}
            onOpenChange={(o) => setDialog(o ? 'release' : null)}
            title={`Release milestone ${m.position}`}
            purpose={`Pay “${m.title}” from escrow to the freelancer’s verified wallet. This cannot be undone.`}
            kind="release"
            contractId={contract.id}
            milestoneId={m.id}
            requiredWallet={contract.client_wallet}
            call={{ fn: 'release', args: [contract.escrow_key, index] }}
            rows={[
              { label: 'Amount', value: <Money amount={m.amount} /> },
              { label: 'Goes to', value: <span className="font-mono text-xs">{shortAddress(contract.freelancer_wallet)} (freelancer)</span> },
            ]}
            nextSteps="When the network confirms, the milestone shows as Released and the freelancer is notified. If this was the last open milestone, the contract completes."
            confirmLabel="Release in wallet"
            onSettled={() => router.refresh()}
          />
          <EscrowTxDialog
            open={dialog === 'refund'}
            onOpenChange={(o) => setDialog(o ? 'refund' : null)}
            title={`Return milestone ${m.position} to the client`}
            purpose="Use this if you can’t deliver this milestone and agree it should be refunded. The client gets the full milestone amount back. This cannot be undone."
            kind="refund"
            contractId={contract.id}
            milestoneId={m.id}
            requiredWallet={contract.freelancer_wallet}
            call={{ fn: 'refund', args: [contract.escrow_key, index] }}
            rows={[
              { label: 'Amount', value: <Money amount={m.amount} /> },
              { label: 'Goes to', value: <span className="font-mono text-xs">{shortAddress(contract.client_wallet)} (client)</span> },
            ]}
            nextSteps="When the network confirms, the milestone shows as Refunded and the client is notified."
            confirmLabel="Refund in wallet"
            onSettled={() => router.refresh()}
          />
        </>
      )}
    </article>
  );
}
