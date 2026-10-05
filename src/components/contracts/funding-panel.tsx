'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Money, MoneyStat } from '@/components/common/money';
import { EscrowTxDialog, EscrowUnavailableNote } from '@/components/escrow/escrow-tx-dialog';
import { escrowRef } from '@/lib/chain/escrow';
import { isEscrowConfigured, publicEnv } from '@/lib/env';
import { explorerAddressUrl, formatDateTime, shortAddress } from '@/lib/format';
import { sumAmounts, toWei } from '@/lib/money';
import type { Contract, Milestone } from '@/lib/types';

export function FundingPanel({ contract, milestones, role, pendingFunding }: {
  contract: Contract;
  milestones: Milestone[];
  role: 'client' | 'freelancer';
  pendingFunding: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const by = (states: Milestone['status'][]) => sumAmounts(milestones.filter((m) => states.includes(m.status)).map((m) => m.amount));
  const released = sumAmounts(milestones.map((m) => m.freelancer_payout ?? '0'));
  const refunded = sumAmounts(milestones.map((m) => m.client_refund ?? '0'));
  const secured = by(['funded', 'submitted', 'revision_requested', 'approved']);
  const disputed = by(['disputed']);
  const funded = Boolean(contract.funded_at);
  const ordered = [...milestones].sort((a, b) => a.position - b.position);
  const escrowUrl = contract.escrow_address ? explorerAddressUrl(contract.escrow_address) : null;

  return (
    <section id="fund" aria-labelledby="funding-title" className="panel scroll-mt-24 space-y-5 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="funding-title" className="t-section-title flex items-center gap-2"><Lock className="size-5 text-brand" aria-hidden /> Escrow</h2>
          <p className="text-sm text-ink-secondary">
            {funded
              ? `Funded ${formatDateTime(contract.funded_at)}. Funds are held by the escrow contract, not by TrustLance.`
              : contract.status === 'awaiting_funding'
                ? 'Signed by both parties. The client now deposits the full amount.'
                : contract.status === 'cancelled' ? 'Cancelled before funding. No money moved.' : 'Escrow is funded after both parties sign.'}
          </p>
        </div>
        <Money amount={contract.total_amount} size="xl" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MoneyStat label="Secured in escrow" amount={secured} tone="brand" />
        <MoneyStat label="Released to freelancer" amount={released} tone="success" />
        <MoneyStat label="Refunded to client" amount={refunded} tone="refund" />
        <MoneyStat label="Frozen in dispute" amount={disputed} tone="warning" />
      </div>

      {funded && contract.escrow_address && (
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
          <ShieldCheck className="size-3.5 text-success" aria-hidden />
          Escrow contract {escrowUrl ? <a className="link inline-flex items-center gap-1 font-mono" href={escrowUrl} target="_blank" rel="noreferrer">{shortAddress(contract.escrow_address)} <ExternalLink className="size-3" aria-hidden /></a> : <span className="font-mono">{shortAddress(contract.escrow_address)}</span>}
          on {publicEnv.chain.name || `chain ${contract.chain_id}`}
        </p>
      )}

      {contract.status === 'awaiting_funding' && role === 'client' && (
        <div className="space-y-2 rounded-lg border border-brand/25 bg-brand-soft/30 p-4">
          {pendingFunding ? (
            <p className="text-sm">A deposit transaction is being confirmed. See <a className="link" href="?tab=funding">transactions</a>.</p>
          ) : isEscrowConfigured() ? (
            <>
              <p className="text-sm">Deposit <strong>{sumAmounts(milestones.map((m) => m.amount))} {publicEnv.chain.symbol}</strong> from your verified wallet to start the work.</p>
              <Button onClick={() => setOpen(true)}><Lock /> Fund escrow</Button>
            </>
          ) : (
            <EscrowUnavailableNote />
          )}
        </div>
      )}
      {contract.status === 'awaiting_funding' && role === 'freelancer' && (
        <p className="rounded-lg bg-warning-soft p-3 text-sm text-warning-strong">Don’t start work yet — wait until escrow shows as funded.</p>
      )}

      {(contract.status === 'awaiting_funding' || open) && role === 'client' && contract.freelancer_wallet && (
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
      )}
    </section>
  );
}
