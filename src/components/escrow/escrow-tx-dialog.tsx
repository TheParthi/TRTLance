'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle, CheckCircle2, ExternalLink, Loader2, OctagonX, PlugZap, ShieldCheck, Wallet, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { reportEscrowTx } from '@/lib/actions/escrow';
import { sendEscrowCall, useWallet, walletErrorMessage } from '@/lib/chain/use-wallet';
import { isEscrowConfigured, publicEnv } from '@/lib/env';
import { explorerTxUrl, shortAddress, shortHash } from '@/lib/format';
import type { EscrowTxKind } from '@/lib/types';

export interface EscrowCall {
  fn: 'fund' | 'release' | 'refund' | 'raiseDispute' | 'resolveDispute';
  args: unknown[];
  value?: bigint;
}

type Phase =
  | { name: 'review' }
  | { name: 'signing' }
  | { name: 'confirming'; hash: string; txId: string; note?: string }
  | { name: 'confirmed'; hash: string }
  | { name: 'failed'; reason: string; hash?: string }
  | { name: 'rejected'; reason: string };

/**
 * The one way money moves in the UI. Shows what, why, how much, where it goes and on which network,
 * checks the wallet, sends the transaction, and reports success only after on-chain verification.
 */
export function EscrowTxDialog({ open, onOpenChange, title, purpose, kind, contractId, milestoneId, call, requiredWallet, rows, nextSteps, confirmLabel, onSettled }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  purpose: string;
  kind: EscrowTxKind;
  contractId: string;
  milestoneId: string | null;
  call: EscrowCall;
  /** The verified wallet that must send this transaction (lower case). */
  requiredWallet: string | null;
  rows: { label: string; value: React.ReactNode }[];
  nextSteps: string;
  confirmLabel: string;
  onSettled?: (status: 'confirmed' | 'failed') => void;
}) {
  const wallet = useWallet();
  const [phase, setPhase] = React.useState<Phase>({ name: 'review' });
  const busy = phase.name === 'signing' || phase.name === 'confirming';

  React.useEffect(() => {
    if (open && !busy && phase.name !== 'confirmed') setPhase({ name: 'review' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when reopened
  }, [open]);

  // Poll the server until the transaction is verified (or fails).
  React.useEffect(() => {
    if (phase.name !== 'confirming') return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch('/api/escrow/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ txId: phase.txId }) });
        const body = await res.json();
        if (stop) return;
        if (body.status === 'confirmed') {
          setPhase({ name: 'confirmed', hash: phase.hash });
          onSettled?.('confirmed');
          return;
        }
        if (body.status === 'failed') {
          setPhase({ name: 'failed', reason: body.reason ?? 'The transaction was not accepted.', hash: phase.hash });
          onSettled?.('failed');
          return;
        }
        setPhase((p) => (p.name === 'confirming' ? { ...p, note: body.reason ?? body.error?.message } : p));
      } catch {
        /* network blip: keep polling */
      }
      if (!stop) timer = setTimeout(tick, 4000);
    };
    let timer = setTimeout(tick, 2500);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [phase, onSettled]);

  const wrongAccount = Boolean(wallet.account && requiredWallet && wallet.account !== requiredWallet);
  const ready = isEscrowConfigured() && wallet.status === 'connected' && !wallet.wrongNetwork && !wrongAccount && Boolean(requiredWallet);

  const send = async () => {
    setPhase({ name: 'signing' });
    let hash: string;
    try {
      hash = await sendEscrowCall(call.fn, call.args, call.value);
    } catch (error) {
      setPhase({ name: 'rejected', reason: walletErrorMessage(error) });
      return;
    }
    const r = await reportEscrowTx({ contractId, kind, milestoneId, txHash: hash });
    if (!r.ok) {
      // The transaction is on the network even if recording failed: show the hash so it is never lost.
      setPhase({ name: 'failed', reason: `${r.error.message} Your transaction ${shortHash(hash)} was broadcast — keep this hash and contact support.`, hash });
      return;
    }
    setPhase({ name: 'confirming', hash, txId: r.data });
  };

  const explorer = (hash: string) => {
    const url = explorerTxUrl(hash);
    return url ? (
      <a href={url} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1 font-mono text-xs">{shortHash(hash)} <ExternalLink className="size-3" aria-hidden /></a>
    ) : <span className="font-mono text-xs">{shortHash(hash)}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent size="md" onInteractOutside={(e) => busy && e.preventDefault()} hideClose={busy}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{purpose}</DialogDescription>
        </DialogHeader>

        <dl className="divide-y rounded-lg border text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start justify-between gap-4 p-3">
              <dt className="text-ink-muted">{r.label}</dt>
              <dd className="text-right">{r.value}</dd>
            </div>
          ))}
          <div className="flex items-start justify-between gap-4 p-3">
            <dt className="text-ink-muted">Network</dt>
            <dd className="text-right">{publicEnv.chain.name || `Chain ${publicEnv.chain.id}`}<span className="t-meta block">Network fee paid in {publicEnv.chain.symbol}, set by your wallet</span></dd>
          </div>
          <div className="flex items-start justify-between gap-4 p-3">
            <dt className="text-ink-muted">From wallet</dt>
            <dd className="font-mono text-xs">{requiredWallet ? shortAddress(requiredWallet) : 'No verified wallet'}</dd>
          </div>
        </dl>

        <div className="mt-4 space-y-3" aria-live="polite">
          {phase.name === 'review' && (
            <>
              {!isEscrowConfigured() && <Callout tone="warning" title="Escrow is not configured">This TrustLance deployment has no escrow contract set up, so no transaction can be sent.</Callout>}
              {!requiredWallet && <Callout tone="warning" title="Verify your wallet first">Transactions must come from your verified wallet. <Link href="/wallet">Verify a wallet</Link>.</Callout>}
              {isEscrowConfigured() && requiredWallet && <WalletChecks wallet={wallet} wrongAccount={wrongAccount} requiredWallet={requiredWallet} />}
              <p className="text-xs text-ink-secondary"><strong className="text-ink">What happens next:</strong> {nextSteps}</p>
            </>
          )}
          {phase.name === 'signing' && (
            <Callout tone="info" title="Confirm in your wallet">
              <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden /> Review the amount and network in your wallet, then approve. Nothing has been sent yet.</span>
            </Callout>
          )}
          {phase.name === 'confirming' && (
            <Callout tone="info" title="Waiting for network confirmation">
              <span className="block">Your transaction was broadcast: {explorer(phase.hash)}</span>
              <span className="mt-1 flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden /> {phase.note ?? 'TrustLance is verifying it on-chain. This usually takes under a minute.'}</span>
              <span className="mt-1 block text-xs">You can close this window — the status updates on the contract page.</span>
            </Callout>
          )}
          {phase.name === 'confirmed' && (
            <Callout tone="success" title="Confirmed on-chain">
              <span className="flex items-center gap-2"><CheckCircle2 className="size-4" aria-hidden /> Verified by TrustLance. Transaction {explorer(phase.hash)}</span>
            </Callout>
          )}
          {phase.name === 'failed' && (
            <Callout tone="danger" title="Transaction not accepted">
              <span className="block">{phase.reason}</span>
              {phase.hash && <span className="mt-1 block">Transaction: {explorer(phase.hash)}</span>}
            </Callout>
          )}
          {phase.name === 'rejected' && (
            <Callout tone="warning" title="Nothing was sent"><span className="flex items-center gap-2"><XCircle className="size-4" aria-hidden />{phase.reason}</span></Callout>
          )}
        </div>

        <DialogFooter>
          {phase.name === 'review' || phase.name === 'rejected' ? (
            <>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={send} disabled={!ready}><ShieldCheck /> {confirmLabel}</Button>
            </>
          ) : phase.name === 'confirming' ? (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Close and keep checking</Button>
          ) : phase.name === 'signing' ? (
            <Button disabled loading>Waiting for wallet</Button>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WalletChecks({ wallet, wrongAccount, requiredWallet }: { wallet: ReturnType<typeof useWallet>; wrongAccount: boolean; requiredWallet: string }) {
  if (wallet.status === 'checking') return <p className="t-meta flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" aria-hidden /> Checking your wallet…</p>;
  if (wallet.status === 'unavailable') {
    return <Callout tone="warning" title="No wallet found">Install a browser wallet such as MetaMask, then reload this page.</Callout>;
  }
  if (wallet.status !== 'connected') {
    return (
      <Callout tone="info" title="Connect your wallet" action={<Button size="sm" variant="secondary" onClick={() => void wallet.connect()} loading={wallet.status === 'connecting'}><PlugZap /> Connect</Button>}>
        {wallet.error ?? 'Connect the wallet you verified on TrustLance.'}
      </Callout>
    );
  }
  if (wrongAccount) {
    return (
      <Callout tone="danger" title="Wrong wallet account">
        Your wallet is on {shortAddress(wallet.account)}. Switch to your verified wallet {shortAddress(requiredWallet)} in your wallet app — funds sent from another account would not count.
      </Callout>
    );
  }
  if (wallet.wrongNetwork) {
    return (
      <Callout tone="warning" title="Wrong network" action={<Button size="sm" variant="secondary" onClick={() => void wallet.switchNetwork().catch(() => undefined)}><AlertTriangle /> Switch network</Button>}>
        Your wallet is on chain {wallet.chainId}. Switch to {publicEnv.chain.name || `chain ${publicEnv.chain.id}`}.
      </Callout>
    );
  }
  return <p className="flex items-center gap-2 text-xs text-success-strong"><Wallet className="size-3.5" aria-hidden /> Verified wallet connected on the right network.</p>;
}

export function EscrowUnavailableNote() {
  return (
    <p className="flex items-center gap-2 text-xs text-ink-muted"><OctagonX className="size-3.5" aria-hidden /> On-chain escrow is not configured on this deployment.</p>
  );
}
