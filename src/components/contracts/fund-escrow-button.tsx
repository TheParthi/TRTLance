'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/common/money';
import { EscrowTxDialog } from '@/components/escrow/escrow-tx-dialog';
import { escrowRef } from '@/lib/chain/escrow';
import { isEscrowConfigured, publicEnv } from '@/lib/env';
import { shortAddress } from '@/lib/format';
import { toWei } from '@/lib/money';
import type { Contract, Milestone } from '@/lib/types';

/** The client's deposit of the full contract amount into escrow. */
export function FundEscrowButton({ contract, milestones, pending }: { contract: Contract; milestones: Milestone[]; pending: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const ordered = [...milestones].sort((a, b) => a.position - b.position);
  if (!isEscrowConfigured()) return <p className="t-meta">On-chain escrow is not configured on this deployment.</p>;
  if (!contract.freelancer_wallet) return null;
  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={pending}><Lock /> {pending ? 'Deposit confirming…' : 'Fund escrow'}</Button>
      <EscrowTxDialog
        open={open}
        onOpenChange={setOpen}
        title="Fund escrow"
        purpose={`Deposit the full contract amount for “${contract.title}”. It stays locked in the escrow contract and is released milestone by milestone as you approve work.`}
        kind="fund"
        contractId={contract.id}
        milestoneId={null}
        requiredWallet={contract.client_wallet}
        call={{
          fn: 'fund',
          args: [escrowRef(contract.id), contract.freelancer_wallet, ordered.map((m) => toWei(m.amount))],
          value: toWei(contract.total_amount),
        }}
        rows={[
          { label: 'Amount', value: <Money amount={contract.total_amount} /> },
          { label: 'Milestones', value: `${ordered.length}` },
          { label: 'Platform fee', value: <Money amount="0" /> },
          { label: 'Held by', value: <span className="font-mono text-xs">{shortAddress(publicEnv.chain.escrowAddress)}</span> },
          { label: 'Paid out to', value: <span className="font-mono text-xs">{shortAddress(contract.freelancer_wallet)} (freelancer)</span> },
        ]}
        nextSteps="After the network confirms the deposit, the contract becomes active and the freelancer is told to start. You approve and release each milestone separately."
        confirmLabel="Deposit in wallet"
        onSettled={() => router.refresh()}
      />
    </>
  );
}
