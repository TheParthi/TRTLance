'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Flag, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Money } from '@/components/common/money';
import { EscrowTxDialog, EscrowUnavailableNote } from '@/components/escrow/escrow-tx-dialog';
import { isEscrowConfigured } from '@/lib/env';
import { explorerTxUrl, formatDateTime, shortHash } from '@/lib/format';
import type { EscrowTransaction, SettlementStatus } from '@/lib/types';

/**
 * On-chain protection: a party flags the disputed milestone in the escrow contract so the
 * arbiter can settle it. Until then the decision cannot be paid out.
 */
export function OnchainProtectionCard({ contractId, milestoneId, milestonePosition, milestoneTitle, amount, escrowKey, requiredWallet, settlement, flaggedAt, transactions, isParty }: {
  contractId: string;
  milestoneId: string;
  milestonePosition: number;
  milestoneTitle: string;
  amount: string;
  escrowKey: string | null;
  requiredWallet: string | null;
  settlement: SettlementStatus;
  flaggedAt: string | null;
  transactions: EscrowTransaction[];
  isParty: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const flagTx = transactions.find((t) => t.kind === 'dispute' && t.status === 'confirmed');
  const pendingFlag = transactions.find((t) => t.kind === 'dispute' && t.status === 'pending');
  const failedFlag = !pendingFlag && !flagTx ? transactions.find((t) => t.kind === 'dispute' && t.status === 'failed') : undefined;
  const txLink = (t: EscrowTransaction) => {
    const url = explorerTxUrl(t.tx_hash);
    return url
      ? <a href={url} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1 font-mono text-xs">{shortHash(t.tx_hash)} <ExternalLink className="size-3" aria-hidden /></a>
      : <span className="font-mono text-xs">{shortHash(t.tx_hash)}</span>;
  };

  return (
    <section className="panel space-y-4 p-5" aria-labelledby="onchain-title">
      <h2 id="onchain-title" className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-brand" aria-hidden /> On-chain protection</h2>

      {settlement !== 'awaiting_flag' ? (
        <div className="space-y-2 text-sm text-ink-secondary">
          <p>Milestone {milestonePosition} is flagged as disputed in the escrow contract{flaggedAt ? ` since ${formatDateTime(flaggedAt)}` : ''}. Neither party can release or withdraw it; only the arbiter can settle it according to the decision.</p>
          {flagTx && <p className="t-meta">Flag transaction: {txLink(flagTx)}</p>}
        </div>
      ) : pendingFlag ? (
        <Callout tone="info" title="Flag transaction confirming">
          Your flag was broadcast ({txLink(pendingFlag)}). TrustLance updates this case once it is confirmed on-chain.
        </Callout>
      ) : (
        <div className="space-y-3">
          <Callout tone="warning" title="Flag this milestone on-chain">
            The dispute is recorded on TrustLance, but the escrow contract does not know about it yet. One of the parties must flag
            milestone {milestonePosition} on-chain so the arbiter can settle the decision. This sends no money — it only marks the milestone as disputed.
          </Callout>
          {failedFlag && <p className="text-xs text-danger-strong">A previous flag transaction was not accepted ({txLink(failedFlag)}). You can try again.</p>}
          {!isParty ? (
            <p className="t-meta">Only the client or the freelancer can flag the milestone.</p>
          ) : !isEscrowConfigured() ? (
            <EscrowUnavailableNote />
          ) : !escrowKey ? (
            <p className="t-meta">This contract has no recorded escrow deposit, so there is nothing to flag on-chain.</p>
          ) : (
            <Button onClick={() => setOpen(true)}><Flag /> Flag milestone on-chain</Button>
          )}
        </div>
      )}

      {isParty && escrowKey && (
        <EscrowTxDialog
          open={open}
          onOpenChange={setOpen}
          title="Flag the milestone as disputed"
          purpose="Marks this milestone as disputed in the escrow contract so that only the arbiter can settle it. No funds are sent."
          kind="dispute"
          contractId={contractId}
          milestoneId={milestoneId}
          call={{ fn: 'raiseDispute', args: [escrowKey, milestonePosition - 1] }}
          requiredWallet={requiredWallet}
          rows={[
            { label: 'Milestone', value: `${milestonePosition}. ${milestoneTitle}` },
            { label: 'Held in escrow', value: <Money amount={amount} size="sm" /> },
            { label: 'Amount sent', value: <Money amount="0" size="sm" /> },
          ]}
          nextSteps="After confirmation, the milestone is frozen on-chain. When the dispute is decided, the arbiter settles it and the escrow contract pays out the exact split."
          confirmLabel="Flag on-chain"
          onSettled={() => router.refresh()}
        />
      )}
    </section>
  );
}
