import type { PublicMember } from '@/lib/data/projects';
import { formatDate, formatDateTime, shortHash } from '@/lib/format';
import { formatAmount } from '@/lib/money';
import type { ContractEvent } from '@/lib/types';

const txLabel = (k: string) => ({ fund: 'Deposit', release: 'Release', refund: 'Refund', dispute: 'Dispute flag', resolve: 'Settlement' }[k] ?? 'Escrow');

/** A title and one detail sentence for each event. */
const describe = (e: ContractEvent): { title: string; detail?: string } => {
  const d = e.data as Record<string, string | number | undefined>;
  switch (e.type) {
    case 'contract.created': return { title: 'Contract created', detail: `From the accepted proposal, for ${formatAmount(String(d.total_amount ?? '0'))}.` };
    case 'contract.signed': return { title: `Signed by the ${d.role}`, detail: `${d.name} signed with wallet ${shortHash(String(d.wallet ?? ''))}.` };
    case 'contract.awaiting_funding': return { title: 'Both parties signed', detail: 'Waiting for the escrow deposit.' };
    case 'contract.cancelled': return { title: 'Contract cancelled', detail: String(d.reason ?? '') || undefined };
    case 'contract.completed': return { title: 'Contract completed', detail: 'All milestones are closed.' };
    case 'escrow.tx_submitted': return { title: `${txLabel(String(d.kind))} transaction broadcast`, detail: `Transaction ${shortHash(String(d.tx_hash))}, waiting for confirmation.` };
    case 'escrow.tx_failed': return { title: `${txLabel(String(d.kind))} transaction not accepted`, detail: String(d.reason ?? '') || undefined };
    case 'escrow.funded': return { title: 'Escrow funded', detail: `${formatAmount(String(d.amount))} deposited, verified on-chain.` };
    case 'escrow.dispute_flagged': return { title: `Milestone ${d.position} flagged on-chain`, detail: 'Marked as disputed in the escrow contract.' };
    case 'milestone.submitted': return { title: `Milestone ${d.position} submitted`, detail: `Version ${d.version} sent for review.` };
    case 'milestone.revision_requested': return { title: `Changes requested on milestone ${d.position}` };
    case 'milestone.approved': return { title: `Milestone ${d.position} approved` };
    case 'milestone.paid': return { title: `Milestone ${d.position} released`, detail: `${formatAmount(String(d.amount))} to the freelancer, verified on-chain.` };
    case 'milestone.refunded': return { title: `Milestone ${d.position} refunded`, detail: `${formatAmount(String(d.amount))} to the client, verified on-chain.` };
    case 'milestone.settled': return { title: `Milestone ${d.position} settled`, detail: `${formatAmount(String(d.freelancer_amount))} to the freelancer, ${formatAmount(String(d.client_amount))} to the client.` };
    case 'dispute.opened': return { title: `Dispute opened on milestone ${d.position}` };
    case 'dispute.decided': return { title: 'Dispute decided', detail: d.decision === 'partial' ? `${d.freelancer_pct}% to the freelancer.` : d.decision === 'freelancer' ? 'In favour of the freelancer.' : 'In favour of the client.' };
    case 'review.submitted': return { title: `The ${d.role} left a review`, detail: `${d.rating} out of 5 stars.` };
    default: return { title: e.type };
  }
};

/** "05 OCT" over "10:42" — the left column of chronological ledgers. */
export function DateBlock({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className="flex w-14 shrink-0 flex-col pt-0.5 leading-tight">
      <span className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{formatDate(iso, 'dd MMM')}</span>
      <span className="font-mono text-xs tabular-nums text-ink-secondary">{formatDate(iso, 'HH:mm')}</span>
    </time>
  );
}

/** Append-only record of everything that happened on the contract: a chronological ledger. */
export function ActivityFeed({ events, members }: { events: ContractEvent[]; members: Map<string, PublicMember> }) {
  if (!events.length) return <p className="border-y py-5 text-sm text-ink-secondary">No activity yet.</p>;
  return (
    <ol className="ledger">
      {events.map((e) => {
        const { title, detail } = describe(e);
        const who = e.actor_id ? members.get(e.actor_id)?.display_name ?? 'Member' : 'TrustLance (verified)';
        return (
          <li key={e.id} className="flex items-start gap-4 py-3.5 sm:gap-6">
            <DateBlock iso={e.created_at} />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="break-words text-sm font-medium">{title}</p>
              <p className="break-words text-sm text-ink-secondary">
                {detail ? <>{detail} <span className="text-ink-muted">· {who}</span></> : <span className="text-ink-muted">{who}</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
