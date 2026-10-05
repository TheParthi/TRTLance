import { CalendarClock, Compass } from 'lucide-react';
import { daysUntil, formatDateTime } from '@/lib/format';
import type { Dispute } from '@/lib/types';

function steps(d: Dispute, isParty: boolean): { title: string; body: string } {
  const due = d.evidence_due_at ? formatDateTime(d.evidence_due_at) : null;
  switch (d.status) {
    case 'open':
      return {
        title: 'Waiting for an arbitrator',
        body: 'TrustLance assigns an available arbitrator who has never worked with either party. If nobody is assigned within 48 hours, either party can escalate to the platform team. Meanwhile, add your evidence.',
      };
    case 'awaiting_evidence':
      return {
        title: 'Evidence window is open',
        body: `${isParty ? 'Add everything that supports your side' : 'Both parties can add evidence'}${due ? ` before ${due}` : ''}. After that, the arbitrator reviews the case and may ask follow-up questions in Messages.`,
      };
    case 'under_review':
      return {
        title: 'The arbitrator is reviewing',
        body: 'The arbitrator is reviewing the contract, the submitted work and the evidence. They may ask for more evidence. You will be notified when a decision is made.',
      };
    case 'escalated':
      return {
        title: 'With the TrustLance platform team',
        body: 'The platform team reviews the case and decides, or assigns a new arbitrator. You can still add evidence and write in Messages.',
      };
    case 'resolved':
      switch (d.settlement_status) {
        case 'awaiting_flag':
          return { title: 'Decided — needs an on-chain flag', body: 'The decision is recorded. Before the escrow contract can pay it out, one party must flag the milestone on-chain (see On-chain protection).' };
        case 'ready':
          return { title: 'Decided — waiting for settlement', body: 'The arbiter settles the decision through the escrow contract. Funds move only when that transaction is confirmed.' };
        case 'pending':
          return { title: 'Settlement is confirming', body: 'The settlement transaction was broadcast and is being verified on-chain.' };
        case 'failed':
          return { title: 'Settlement needs a retry', body: 'The last settlement transaction was not accepted. The platform team will send it again; no funds moved.' };
        default:
          return { title: 'Settled', body: 'The escrow contract paid out the decision. This case is closed.' };
      }
  }
}

export function NextSteps({ dispute, isParty }: { dispute: Dispute; isParty: boolean }) {
  const s = steps(dispute, isParty);
  const days = dispute.status === 'awaiting_evidence' ? daysUntil(dispute.evidence_due_at) : null;
  return (
    <section className="panel space-y-3 border-brand/25 p-5" aria-labelledby="next-steps-title" aria-live="polite">
      <h2 id="next-steps-title" className="flex items-center gap-2 text-sm font-semibold"><Compass className="size-4 text-brand" aria-hidden /> What happens next</h2>
      <p className="text-sm font-medium">{s.title}</p>
      <p className="text-sm text-ink-secondary">{s.body}</p>
      {days !== null && (
        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <CalendarClock className="size-3.5" aria-hidden />
          {days > 0 ? `${days} day${days === 1 ? '' : 's'} left to add evidence` : 'The evidence window has closed; late evidence may still be considered.'}
        </p>
      )}
    </section>
  );
}
