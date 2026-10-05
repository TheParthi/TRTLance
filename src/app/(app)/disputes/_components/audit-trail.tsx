import { History, Lock } from 'lucide-react';
import { EmptyState } from '@/components/common/states';
import type { MemberSummary } from '@/lib/data/disputes';
import { explorerTxUrl, formatDateTime, shortHash } from '@/lib/format';
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
    case 'dispute.settled': {
      const hash = typeof d.tx_hash === 'string' ? d.tx_hash : null;
      const url = hash ? explorerTxUrl(hash) : null;
      return (
        <>
          {formatAmount(String(d.freelancer_amount ?? '0'))} to the freelancer, {formatAmount(String(d.client_amount ?? '0'))} to the client
          {hash && <> · {url ? <a className="link font-mono" href={url} target="_blank" rel="noreferrer">{shortHash(hash)}</a> : <span className="font-mono">{shortHash(hash)}</span>}</>}
        </>
      );
    }
    case 'evidence.added':
      return typeof d.title === 'string' ? `${String(d.kind)}: ${d.title}` : null;
    default:
      return null;
  }
}

/** Append-only case history from dispute_events. The database forbids edits and deletions. */
export function AuditTrail({ events, members }: { events: DisputeEvent[]; members: Record<string, MemberSummary> }) {
  if (!events.length) return <EmptyState compact icon={History} title="No events yet" />;
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-xs text-ink-muted"><Lock className="size-3.5" aria-hidden /> Recorded by TrustLance. Entries cannot be edited or removed.</p>
      <ol className="panel relative space-y-0 p-4">
        {events.map((e, i) => {
          const actor = e.actor_id ? members[e.actor_id]?.display_name ?? 'A participant' : 'TrustLance';
          const extra = detail(e, members);
          return (
            <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
              {i < events.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-line" aria-hidden />}
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-brand bg-surface" aria-hidden />
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">{eventLabel(e.type)}</p>
                {extra && <p className="break-words text-sm text-ink-secondary">{extra}</p>}
                <p className="t-meta">{actor} · <time dateTime={e.created_at}>{formatDateTime(e.created_at)}</time></p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
