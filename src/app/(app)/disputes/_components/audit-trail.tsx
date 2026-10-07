import { Lock } from 'lucide-react';
import { Ledger } from '@/components/common/ledger';
import { DateBlock } from '@/components/contracts/activity-feed';
import type { MemberSummary } from '@/lib/data/disputes';
import { formatAmount } from '@/lib/money';
import { disputeReasonLabel } from '@/lib/status';
import type { DisputeEvent } from '@/lib/types';
import { eventLabel } from './labels';

function detail(e: DisputeEvent, members: Record<string, MemberSummary>): React.ReactNode {
  const d = e.data;
  switch (e.type) {
    case 'dispute.opened':
      return `Reason: ${disputeReasonLabel[d.reason as keyof typeof disputeReasonLabel] ?? String(d.reason)} · milestone ${String(d.milestone_position ?? '')}`;
    case 'dispute.assigned': {
      const who = typeof d.arbitrator_id === 'string' ? members[d.arbitrator_id]?.display_name : null;
      return `${who ?? 'An independent arbitrator'}${d.by_admin ? ' (assigned by the platform team)' : ' (assigned automatically)'}`;
    }
    case 'dispute.evidence_requested':
      return `${String(d.days)} day${d.days === 1 ? '' : 's'} to respond`;
    case 'dispute.escalated':
      return typeof d.reason === 'string' ? d.reason : null;
    case 'dispute.decided':
      return `${d.decision === 'partial' ? `${String(d.freelancer_pct)}% to the freelancer` : d.decision === 'freelancer' ? 'Freelancer receives 100%' : 'Client refunded 100%'}${d.by_admin ? ' · decided by the platform team' : ''}`;
    case 'dispute.settled':
      return `${formatAmount(String(d.freelancer_amount ?? '0'))} to the freelancer${d.fee ? ` (platform fee ${formatAmount(String(d.fee))})` : ''}, ${formatAmount(String(d.client_amount ?? '0'))} back to the client`;
    case 'evidence.added':
      return typeof d.title === 'string' ? `${String(d.kind)}: ${d.title}` : null;
    default:
      return null;
  }
}

/** Append-only case history from dispute_events, as a ledger. The database forbids edits and deletions. */
export function AuditTrail({ events, members, id = 'audit', title = 'Audit trail' }: {
  events: DisputeEvent[];
  members: Record<string, MemberSummary>;
  id?: string;
  title?: React.ReactNode;
}) {
  return (
    <Ledger
      id={id}
      className="scroll-mt-24"
      title={title}
      description={<span className="inline-flex items-center gap-1.5"><Lock className="size-3.5 shrink-0" aria-hidden /> Recorded by TrustLance. Entries cannot be edited or removed.</span>}
      empty={<p className="border-y py-5 text-sm text-ink-secondary">No events yet.</p>}
    >
      {events.map((e) => {
        const actor = e.actor_id ? members[e.actor_id]?.display_name ?? 'A participant' : 'TrustLance';
        const extra = detail(e, members);
        return (
          <li key={e.id} className="flex items-start gap-4 py-3.5 sm:gap-6">
            <DateBlock iso={e.created_at} />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm font-medium">{eventLabel(e.type)}</p>
              <p className="break-words text-sm text-ink-secondary">
                {extra ? <>{extra} <span className="text-ink-muted">· {actor}</span></> : <span className="text-ink-muted">{actor}</span>}
              </p>
            </div>
          </li>
        );
      })}
    </Ledger>
  );
}
