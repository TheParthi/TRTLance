'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, Loader2, PlugZap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/common/money';
import { getNativeBalance, useWallet } from '@/lib/chain/use-wallet';
import { publicEnv } from '@/lib/env';
import { shortAddress } from '@/lib/format';
import { weiToAmount } from '@/lib/money';

/** Live view of the browser wallet on one line: account, network and on-chain balance, with every state handled. */
export function ConnectedWallet({ verifiedAddress }: { verifiedAddress: string | null }) {
  const wallet = useWallet();
  const [balance, setBalance] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!wallet.account || wallet.wrongNetwork) return setBalance(null);
    setLoading(true);
    const wei = await getNativeBalance(wallet.account);
    setBalance(wei === null ? null : weiToAmount(wei));
    setLoading(false);
  }, [wallet.account, wallet.wrongNetwork]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (wallet.status === 'checking') return <p className="flex items-center gap-2 text-sm text-ink-muted"><Loader2 className="size-4 animate-spin" aria-hidden /> Checking wallet…</p>;
  if (wallet.status === 'unavailable') return <p className="text-sm text-ink-secondary">No browser wallet detected on this device.</p>;
  if (wallet.status !== 'connected') {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm text-ink-secondary">Your wallet is not connected to this site.</p>
          <Button size="sm" variant="secondary" onClick={() => void wallet.connect()} loading={wallet.status === 'connecting'}><PlugZap /> Connect</Button>
        </div>
        {wallet.error && <p role="alert" className="text-xs text-danger-strong">{wallet.error}</p>}
      </div>
    );
  }
  const matches = verifiedAddress && wallet.account === verifiedAddress;
  return (
    <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <dt className="text-ink-muted">Account</dt>
        <dd className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono">{shortAddress(wallet.account)}</span>
          {verifiedAddress && (
            matches
              ? <span className="flex items-center gap-1 text-xs text-success-strong"><CheckCircle2 className="size-3.5" aria-hidden /> Your verified wallet</span>
              : <span className="flex items-center gap-1 text-xs text-warning-strong"><AlertTriangle className="size-3.5" aria-hidden /> Not your verified wallet — switch accounts to pay or get paid</span>
          )}
        </dd>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <dt className="text-ink-muted">Network</dt>
        <dd className="flex flex-wrap items-center gap-2">
          {wallet.wrongNetwork ? (
            <>
              <span className="flex items-center gap-1 text-warning-strong"><AlertTriangle className="size-3.5" aria-hidden /> Chain {wallet.chainId}</span>
              <Button size="sm" variant="secondary" onClick={() => void wallet.switchNetwork().catch(() => undefined)}>Switch to {publicEnv.chain.name || `chain ${publicEnv.chain.id}`}</Button>
            </>
          ) : (
            <span>{publicEnv.chain.name || `Chain ${wallet.chainId}`}</span>
          )}
        </dd>
      </div>
      <div className="flex items-center gap-2">
        <dt className="text-ink-muted">On-chain balance</dt>
        <dd className="flex items-center gap-1">
          {loading ? <Loader2 className="size-4 animate-spin" aria-label="Loading balance" /> : balance !== null ? <Money amount={balance} size="sm" /> : <span className="t-meta">Switch network to see it</span>}
          <Button variant="ghost" size="icon-sm" onClick={() => void load()} aria-label="Refresh balance"><RefreshCw /></Button>
        </dd>
      </div>
    </dl>
  );
}
