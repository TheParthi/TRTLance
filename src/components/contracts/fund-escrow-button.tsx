'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Coins, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toaster';
import { Money } from '@/components/common/money';
import { fundContract } from '@/lib/actions/contracts';
import { feePercent, toCoins } from '@/lib/money';
import type { Contract, Milestone } from '@/lib/types';

const OPEN_EVENT = 'trustlance:fund-escrow';

/**
 * Opens the funding dialog from anywhere on the page (the next-step band, the phone action bar).
 * The dialog itself lives in `FundEscrowButton trigger={false}`, mounted once at a stable place.
 */
export function FundEscrowTrigger({ variant = 'primary', size }: { variant?: 'primary' | 'signal'; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Button variant={variant} size={size} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      <Lock /> Fund escrow
    </Button>
  );
}

/** The client locks the full contract amount from their coin wallet into TrustLance escrow. */
export function FundEscrowButton({ contract, milestones, walletBalance, variant = 'primary', size, trigger = true }: {
  contract: Contract;
  milestones: Milestone[];
  /** The client's spendable coins. */
  walletBalance: string;
  variant?: 'primary' | 'signal';
  size?: 'sm' | 'md' | 'lg';
  /** false: render only the dialog, opened by a `FundEscrowTrigger`. */
  trigger?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (trigger) return;
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [trigger]);

  const total = toCoins(contract.total_amount);
  const balance = toCoins(walletBalance);
  const shortfall = total > balance ? total - balance : 0n;
  const buyHref = `/wallet?buy=${shortfall}&next=${encodeURIComponent(`/contracts/${contract.id}`)}`;

  const fund = async () => {
    setBusy(true);
    const r = await fundContract(contract.id);
    setBusy(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success('Escrow funded. The freelancer has been told to start.');
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      {trigger && <Button variant={variant} size={size} onClick={() => setOpen(true)}><Lock /> Fund escrow</Button>}
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent size="md" onInteractOutside={(e) => busy && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Fund escrow</DialogTitle>
            <DialogDescription>
              Lock the full amount for “{contract.title}” from your coin wallet. It stays in TrustLance escrow and is paid out
              milestone by milestone as you release work.
            </DialogDescription>
          </DialogHeader>
          <dl className="divide-y border-y text-sm">
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Amount to lock</dt><dd><Money amount={contract.total_amount} /></dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Milestones</dt><dd>{milestones.length}</dd></div>
            <div className="flex justify-between gap-4 py-2.5"><dt className="text-ink-muted">Your coin wallet</dt><dd><Money amount={walletBalance} /></dd></div>
            <div className="flex justify-between gap-4 py-2.5">
              <dt className="text-ink-muted">Platform fee</dt>
              <dd className="text-right">{feePercent(contract.fee_bps)}<span className="t-meta block">taken from each payment to the freelancer, not from you</span></dd>
            </div>
          </dl>
          {shortfall > 0n ? (
            <Callout tone="warning" title={`You need ${shortfall.toLocaleString('en-IN')} more coins`}
              action={<Button asChild size="sm" variant="secondary"><Link href={buyHref}><Coins /> Buy coins</Link></Button>}>
              Buy the difference, then come back here to lock the full amount.
            </Callout>
          ) : (
            <p className="text-sm text-ink-secondary">
              After funding, the contract becomes active and the freelancer is told to start. You release each milestone separately;
              if you dispute one, it stays frozen until an arbitrator decides.
            </p>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={() => void fund()} loading={busy} disabled={shortfall > 0n}><Lock /> Lock coins</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
