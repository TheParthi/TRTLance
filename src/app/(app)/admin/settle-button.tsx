'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/common/money';
import { EscrowTxDialog } from '@/components/escrow/escrow-tx-dialog';
import { shortAddress } from '@/lib/format';
import { splitByPct } from '@/lib/money';

/** Sends the arbiter's resolveDispute transaction. Success is shown only after on-chain verification. */
export function SettleButton({ disputeLabel, contractId, milestoneId, milestoneTitle, position, escrowKey, amount, freelancerPct, arbiter }: {
  disputeLabel: string;
  contractId: string;
  milestoneId: string;
  milestoneTitle: string;
  position: number;
  escrowKey: string;
  amount: string;
  freelancerPct: number;
  arbiter: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const split = splitByPct(amount, freelancerPct);
  return (
    <>
      <Button onClick={() => setOpen(true)}><Scale /> Settle on-chain</Button>
      <EscrowTxDialog
        open={open}
        onOpenChange={setOpen}
        title={`Settle ${disputeLabel}`}
        purpose="Instructs the escrow contract to pay out the arbitrator’s decision for this milestone. Only the escrow’s arbiter account can send it."
        kind="resolve"
        contractId={contractId}
        milestoneId={milestoneId}
        call={{ fn: 'resolveDispute', args: [escrowKey, position - 1, freelancerPct] }}
        requiredWallet={arbiter}
        rows={[
          { label: 'Milestone', value: `${position}. ${milestoneTitle}` },
          { label: `To the freelancer (${freelancerPct}%)`, value: <Money amount={split.freelancer} size="sm" /> },
          { label: `Back to the client (${100 - freelancerPct}%)`, value: <Money amount={split.client} size="sm" /> },
          { label: 'Total released from escrow', value: <Money amount={amount} size="sm" /> },
          { label: 'Arbiter account', value: <span className="font-mono text-xs">{shortAddress(arbiter)}</span> },
        ]}
        nextSteps="The escrow contract sends each share directly to the parties’ wallets. TrustLance marks the dispute settled only after it verifies the transaction and the exact amounts on-chain."
        confirmLabel="Send settlement"
        onSettled={() => router.refresh()}
      />
    </>
  );
}
