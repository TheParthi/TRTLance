'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getAddress } from 'ethers';
import { BadgeCheck, Loader2, PlugZap, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { toast } from '@/components/ui/toaster';
import { buildSiweMessage } from '@/lib/chain/siwe';
import { getSigner, useWallet, walletErrorMessage } from '@/lib/chain/use-wallet';
import { publicEnv } from '@/lib/env';
import { shortAddress } from '@/lib/format';
import { getBrowserClient } from '@/lib/supabase/client';
import { toAppError } from '@/lib/errors';

type Step = 'idle' | 'nonce' | 'signing' | 'verifying';

/**
 * Proves wallet ownership with Sign-In-With-Ethereum: the server issues a single-use nonce,
 * the wallet signs a readable message (free, moves no funds), and the server verifies it.
 */
export function WalletVerify() {
  const router = useRouter();
  const wallet = useWallet();
  const [step, setStep] = React.useState<Step>('idle');
  const [error, setError] = React.useState<string | null>(null);

  const verify = async () => {
    if (!wallet.account) return;
    setError(null);
    setStep('nonce');
    const { data: nonce, error: nonceError } = await getBrowserClient().rpc('issue_wallet_nonce');
    if (nonceError || !nonce) {
      setStep('idle');
      return setError(toAppError(nonceError).message);
    }
    const message = buildSiweMessage({
      domain: window.location.host,
      address: getAddress(wallet.account),
      uri: window.location.origin,
      chainId: wallet.chainId ?? publicEnv.chain.id,
      nonce: nonce as string,
      issuedAt: new Date().toISOString(),
    });
    setStep('signing');
    let signature: string;
    try {
      signature = await (await getSigner()).signMessage(message);
    } catch (e) {
      setStep('idle');
      return setError(walletErrorMessage(e));
    }
    setStep('verifying');
    const res = await fetch('/api/wallet/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, signature }) });
    const body = await res.json().catch(() => ({}));
    setStep('idle');
    if (!res.ok) return setError(body.error?.message ?? 'Verification failed. Try again.');
    toast.success('Wallet verified');
    router.refresh();
  };

  if (wallet.status === 'checking') return <p className="t-meta flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden /> Looking for a wallet…</p>;
  if (wallet.status === 'unavailable') {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">No browser wallet found</p>
        <p className="text-sm text-ink-secondary">
          Install a wallet such as MetaMask (desktop extension or mobile app browser), then reload this page. You’ll only need it to verify ownership, fund contracts and release payments.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <ol className="space-y-3 text-sm">
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs text-ink-secondary">1</span>
          <div className="flex-1 space-y-2">
            <p className="font-medium">Connect the wallet you want to use</p>
            {wallet.status === 'connected' ? (
              <p className="text-ink-secondary">Connected: <span className="font-mono">{shortAddress(wallet.account)}</span>{wallet.wrongNetwork && ' (wrong network — you can still verify; switch before sending payments)'}</p>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => void wallet.connect()} loading={wallet.status === 'connecting'}><PlugZap /> Connect wallet</Button>
            )}
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs text-ink-secondary">2</span>
          <div className="flex-1 space-y-2">
            <p className="font-medium">Sign a free verification message</p>
            <p className="text-ink-secondary">Your wallet shows a readable message. Signing it costs nothing and cannot move funds.</p>
            <Button size="sm" onClick={verify} disabled={wallet.status !== 'connected' || step !== 'idle'} loading={step !== 'idle'}>
              {step === 'idle' && <ShieldCheck />}
              {step === 'nonce' ? 'Preparing…' : step === 'signing' ? 'Waiting for signature…' : step === 'verifying' ? 'Verifying…' : 'Verify this wallet'}
            </Button>
          </div>
        </li>
      </ol>
      <p className="flex items-start gap-2 text-xs text-ink-muted"><BadgeCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden /> One wallet per account, linked permanently. Contact support if you lose access to it.</p>
      {(error || wallet.error) && <Callout tone="danger" role="alert">{error ?? wallet.error}</Callout>}
    </div>
  );
}
