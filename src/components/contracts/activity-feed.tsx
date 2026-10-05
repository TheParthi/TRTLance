import { Activity } from 'lucide-react';
import type { PublicMember } from '@/lib/data/projects';
import { formatDateTime, shortHash } from '@/lib/format';
import { formatAmount } from '@/lib/money';
import type { ContractEvent } from '@/lib/types';

const describe = (e: ContractEvent): string => {
  const d = e.data as Record<string, string | number | undefined>;
  switch (e.type) {
    case 'contract.created': return `Contract created from the accepted proposal (${formatAmount(String(d.total_amount ?? '0'))}).`;
    case 'contract.signed': return `${d.name} signed as ${d.role} with wallet ${shortHash(String(d.wallet ?? ''))}.`;
    case 'contract.awaiting_funding': return 'Both parties signed. Waiting for the escrow deposit.';
    case 'contract.cancelled': return `Contract cancelled: ${d.reason}`;
    case 'contract.completed': return 'All milestones closed. Contract completed.';
    case 'escrow.tx_submitted': return `${txLabel(String(d.kind))} transaction broadcast (${shortHash(String(d.tx_hash))}).`;
    case 'escrow.tx_failed': return `${txLabel(String(d.kind))} transaction not accepted: ${d.reason}`;
    case 'escrow.funded': return `Escrow funded with ${formatAmount(String(d.amount))} (verified on-chain).`;
    case 'escrow.dispute_flagged': return `Milestone ${d.position} flagged as disputed on-chain.`;
    case 'milestone.submitted': return `Milestone ${d.position} submitted (version ${d.version}).`;
    case 'milestone.revision_requested': return `Changes requested on milestone ${d.position}.`;
    case 'milestone.approved': return `Milestone ${d.position} approved.`;
    case 'milestone.paid': return `Milestone ${d.position} released: ${formatAmount(String(d.amount))} to the freelancer (verified on-chain).`;
    case 'milestone.refunded': return `Milestone ${d.position} refunded: ${formatAmount(String(d.amount))} to the client (verified on-chain).`;
    case 'milestone.settled': return `Milestone ${d.position} settled: ${formatAmount(String(d.freelancer_amount))} to the freelancer, ${formatAmount(String(d.client_amount))} to the client.`;
    case 'dispute.opened': return `Dispute opened on milestone ${d.position}.`;
    case 'dispute.decided': return `Dispute decided: ${d.decision === 'partial' ? `${d.freelancer_pct}% to the freelancer` : d.decision === 'freelancer' ? 'in favour of the freelancer' : 'in favour of the client'}.`;
    case 'review.submitted': return `The ${d.role} left a ${d.rating}-star review.`;
    default: return e.type;
  }
};

const txLabel = (k: string) => ({ fund: 'Deposit', release: 'Release', refund: 'Refund', dispute: 'Dispute flag', resolve: 'Settlement' }[k] ?? 'Escrow');

/** Append-only record of everything that happened on the contract. */
export function ActivityFeed({ events, members }: { events: ContractEvent[]; members: Map<string, PublicMember> }) {
  if (!events.length) return <p className="text-sm text-ink-secondary">No activity yet.</p>;
  return (
    <ol className="relative space-y-5 border-l pl-6">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[1.85rem] top-0.5 flex size-5 items-center justify-center rounded-full border bg-surface"><Activity className="size-3 text-ink-muted" aria-hidden /></span>
          <p className="text-sm">{describe(e)}</p>
          <p className="t-meta">{formatDateTime(e.created_at)} · {e.actor_id ? members.get(e.actor_id)?.display_name ?? 'Member' : 'TrustLance (verified)'}</p>
        </li>
      ))}
    </ol>
  );
}
