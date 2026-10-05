'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/common/money';
import { EscrowTxDialog, EscrowUnavailableNote } from '@/components/escrow/escrow-tx-dialog';
import { isEscrowConfigured } from '@/lib/env';

/**
 * On-chain protection: a party flags the disputed milestone in the escrow contract so the arbiter can
 * settle it. Until then the decision cannot be paid out. Renders the one control for the next-step line.
 */
const FLAG_EVENT = 'trustlance:flag-milestone';

/**
 * Opens the flag dialog. The dialog lives in `FlagMilestoneButton trigger={false}`, mounted once at a
 * stable place on the page, so it stays open through the refresh that follows a confirmed flag.
 */
export function FlagMilestoneTrigger({ escrowKey }: { escrowKey: string | null }) {
  if (!isEscrowConfigured()) return <EscrowUnavailableNote />;
  if (!escrowKey) return <p className="t-meta sm:max-w-64 sm:text-right">This contract has no recorded escrow deposit, so there is nothing to flag on-chain.</p>;
  return <Button onClick={() => window.dispatchEvent(new Event(FLAG_EVENT))}><Flag /> Flag milestone on-chain</Button>;
}

export function FlagMilestoneButton({ contractId, milestoneId, milestonePosition, milestoneTitle, amount, escrowKey, requiredWallet, trigger = true }: {
  contractId: string;
  milestoneId: string;
  milestonePosition: number;
  milestoneTitle: string;
  amount: string;
  escrowKey: string | null;
  requiredWallet: string | null;
  /** false: render only the dialog, opened by a `FlagMilestoneTrigger`. */
  trigger?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (trigger) return;
    const onOpen = () => setOpen(true);
    window.addEventListener(FLAG_EVENT, onOpen);
    return () => window.removeEventListener(FLAG_EVENT, onOpen);
  }, [trigger]);

  if (!isEscrowConfigured()) return trigger ? <EscrowUnavailableNote /> : null;
  if (!escrowKey) return trigger ? <p className="t-meta sm:max-w-64 sm:text-right">This contract has no recorded escrow deposit, so there is nothing to flag on-chain.</p> : null;

  return (
    <>
      {trigger && <Button onClick={() => setOpen(true)}><Flag /> Flag milestone on-chain</Button>}
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
    </>
  );
}
