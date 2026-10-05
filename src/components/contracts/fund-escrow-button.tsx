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

const OPEN_EVENT = 'trustlance:fund-escrow';

/**
 * Opens the deposit dialog from anywhere on the page (the next-step band, the phone action bar).
 * The dialog itself lives in `FundEscrowButton trigger={false}`, mounted once at a stable place, so it
 * stays open through the refresh that follows a confirmed deposit.
 */
export function FundEscrowTrigger({ pending, variant = 'primary', size }: { pending: boolean; variant?: 'primary' | 'signal'; size?: 'sm' | 'md' | 'lg' }) {
  if (!isEscrowConfigured()) return <p className="t-meta">On-chain escrow is not configured on this deployment.</p>;
  return (
    <Button variant={variant} size={size} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} disabled={pending}>
      <Lock /> {pending ? 'Deposit confirming…' : 'Fund escrow'}
    </Button>
  );
}

/** The client's deposit of the full contract amount into escrow. */
export function FundEscrowButton({ contract, milestones, pending, variant = 'primary', size, trigger = true }: {
  contract: Contract;
  milestones: Milestone[];
  pending: boolean;
  variant?: 'primary' | 'signal';
  size?: 'sm' | 'md' | 'lg';
  /** false: render only the dialog, opened by a `FundEscrowTrigger`. */
  trigger?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (trigger) return;
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [trigger]);
  const ordered = [...milestones].sort((a, b) => a.position - b.position);
  if (!isEscrowConfigured()) return trigger ? <p className="t-meta">On-chain escrow is not configured on this deployment.</p> : null;
  if (!contract.freelancer_wallet) return null;
  return (
    <>
      {trigger && <Button variant={variant} size={size} onClick={() => setOpen(true)} disabled={pending}><Lock /> {pending ? 'Deposit confirming…' : 'Fund escrow'}</Button>}
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
