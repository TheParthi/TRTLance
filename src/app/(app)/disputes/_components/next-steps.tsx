import { daysUntil, formatDateTime } from '@/lib/format';
import type { Dispute } from '@/lib/types';
import { cn } from '@/lib/utils';

type Tone = 'action' | 'waiting' | 'done' | 'alert';

function steps(d: Dispute, isParty: boolean): CaseStep {
  const due = d.evidence_due_at ? formatDateTime(d.evidence_due_at) : null;
  switch (d.status) {
    case 'open':
      return {
        tone: 'waiting',
        title: 'Waiting for an arbitrator',
        body: 'TrustLance assigns an available arbitrator who has never worked with either party. If nobody is assigned within 48 hours, either party can escalate to the platform team. Meanwhile, add your evidence.',
      };
    case 'awaiting_evidence':
      return {
        tone: isParty ? 'action' : 'waiting',
        title: 'Evidence window is open',
        body: `${isParty ? 'Add everything that supports your side' : 'Both parties can add evidence'}${due ? ` before ${due}` : ''}. After that, the arbitrator reviews the case and may ask follow-up questions in Messages.`,
      };
    case 'under_review':
      return {
        tone: isParty ? 'waiting' : 'action',
        title: 'The arbitrator is reviewing',
        body: 'The arbitrator is reviewing the contract, the submitted work and the evidence. They may ask for more evidence. You will be notified when a decision is made.',
      };
    case 'escalated':
      return {
        tone: 'alert',
        title: 'With the TrustLance platform team',
        body: 'The platform team reviews the case and decides, or assigns a new arbitrator. You can still add evidence and write in Messages.',
      };
    case 'resolved':
      switch (d.settlement_status) {
        case 'awaiting_flag':
          return { tone: isParty ? 'action' : 'waiting', title: 'Decided — needs an on-chain flag', body: 'The decision is recorded. Before the escrow contract can pay it out, one party must flag the milestone on-chain.' };
        case 'ready':
          return { tone: 'waiting', title: 'Decided — waiting for settlement', body: 'The arbiter settles the decision through the escrow contract. Funds move only when that transaction is confirmed.' };
        case 'pending':
          return { tone: 'waiting', title: 'Settlement is confirming', body: 'The settlement transaction was broadcast and is being verified on-chain.' };
        case 'failed':
          return { tone: 'alert', title: 'Settlement needs a retry', body: 'The last settlement transaction was not accepted. The platform team will send it again; no funds moved.' };
        default:
          return { tone: 'done', title: 'Settled', body: 'The escrow contract paid out the decision. This case is closed.' };
      }
  }
}

// Same voice as the contract's next step: a small-caps label, a serif headline, one control.
const style: Record<Tone, { rule: string; label: string; labelTone: string }> = {
  action: { rule: 'border-brand', label: 'Next step', labelTone: 'text-brand-strong' },
  waiting: { rule: 'border-line-strong', label: 'Waiting', labelTone: 'text-ink-muted' },
  done: { rule: 'border-success', label: 'Done', labelTone: 'text-success-strong' },
  alert: { rule: 'border-danger', label: 'Needs attention', labelTone: 'text-danger-strong' },
};

export type CaseStep = { title: string; body: React.ReactNode; tone: Tone };

/**
 * "What happens next" for a case — said once, as one line with a coloured rule, never a box.
 * `step` replaces the status-based text when the viewer has a specific action (e.g. flag on-chain); `control` is its one button.
 */
export function NextSteps({ dispute, isParty, step, control, className }: {
  dispute: Dispute;
  isParty: boolean;
  step?: CaseStep;
  control?: React.ReactNode;
  className?: string;
}) {
  const s = step ?? steps(dispute, isParty);
  const st = style[s.tone];
  const days = !step && dispute.status === 'awaiting_evidence' ? daysUntil(dispute.evidence_due_at) : null;
  return (
    <section
      aria-label="What happens next"
      aria-live="polite"
      className={cn('grid gap-4 border-l-2 py-1 pl-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8', st.rule, className)}
    >
      <div className="min-w-0 space-y-1.5">
        <p className={cn('t-label-caps', st.labelTone)}>
          {st.label}
          {days !== null && <span className="ml-2 normal-case tracking-normal text-ink-muted">{days > 0 ? `· ${days} day${days === 1 ? '' : 's'} left` : '· Closed — late evidence may still be considered'}</span>}
        </p>
        <h2 className="font-display text-xl font-medium leading-tight md:text-2xl">{s.title}</h2>
        <div className="max-w-reading text-sm text-ink-secondary">{s.body}</div>
      </div>
      {control && <div className="shrink-0">{control}</div>}
    </section>
  );
}
