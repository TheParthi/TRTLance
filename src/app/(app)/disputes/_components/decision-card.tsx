import { ExternalLink, Gavel, Lock } from 'lucide-react';
import { Callout } from '@/components/ui/callout';
import { Facts } from '@/components/common/page-header';
import { SettlementStatusBadge } from '@/components/common/status-badge';
import { EmptyState } from '@/components/common/states';
import type { MemberSummary } from '@/lib/data/disputes';
import { explorerTxUrl, formatDateTime, shortHash } from '@/lib/format';
import { settlementStatus } from '@/lib/status';
import type { Dispute, EscrowTransaction } from '@/lib/types';
import { decisionLabel } from './labels';
import { SplitRows } from './split';

export function DecisionCard({ dispute, transactions, members }: {
  dispute: Dispute;
  transactions: EscrowTransaction[];
  members: Record<string, MemberSummary>;
}) {
  if (dispute.status !== 'resolved' || !dispute.decision || dispute.freelancer_pct === null) {
    return <EmptyState compact icon={Gavel} title="No decision yet" description="When the arbitrator decides, the outcome, the exact split and their reasoning appear here." />;
  }
  const settled = dispute.settlement_status === 'settled';
  const resolveTx = transactions.find((t) => t.kind === 'resolve' && t.status === 'confirmed')
    ?? transactions.find((t) => t.kind === 'resolve' && t.status === 'pending');
  const byAdmin = dispute.decided_by !== dispute.arbitrator_id;
  const decider = dispute.decided_by ? members[dispute.decided_by]?.display_name : null;
  const txUrl = resolveTx ? explorerTxUrl(resolveTx.tx_hash) : null;

  return (
    <div className="panel space-y-5 p-5">
      <div className="space-y-1">
        <p className="t-eyebrow">Decision</p>
        <p className="text-lg font-semibold">{decisionLabel(dispute.decision, dispute.freelancer_pct)}</p>
      </div>
      <SplitRows amount={dispute.amount} pct={dispute.freelancer_pct} settled={settled} />
      <div className="space-y-1">
        <p className="t-eyebrow">Reasoning</p>
        <p className="whitespace-pre-line break-words text-sm text-ink-secondary">{dispute.decision_reason}</p>
      </div>
      <Facts items={[
        { label: 'Decided by', value: `${decider ?? 'Unknown'} · ${byAdmin ? 'TrustLance platform team' : 'Independent arbitrator'}` },
        { label: 'Decided on', value: formatDateTime(dispute.decided_at) },
        { label: 'Settlement', value: <span className="flex flex-col items-start gap-1"><SettlementStatusBadge status={dispute.settlement_status} /><span className="t-meta">{settlementStatus[dispute.settlement_status].description}</span></span> },
        {
          label: 'Settlement transaction',
          value: resolveTx ? (
            txUrl ? <a href={txUrl} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1 font-mono text-xs">{shortHash(resolveTx.tx_hash)} <ExternalLink className="size-3" aria-hidden /></a>
              : <span className="font-mono text-xs">{shortHash(resolveTx.tx_hash)}</span>
          ) : 'Not sent yet',
        },
      ]} />
      {!settled && (
        <Callout tone="secure" title="Funds have not moved yet">
          The decision is recorded, but the money stays locked in escrow until the escrow contract settles it on-chain. Amounts above are what each side will receive.
        </Callout>
      )}
      {settled && <p className="flex items-center gap-2 text-xs text-ink-muted"><Lock className="size-3.5" aria-hidden /> Settled by the escrow contract on {formatDateTime(dispute.settled_at)}.</p>}
    </div>
  );
}
