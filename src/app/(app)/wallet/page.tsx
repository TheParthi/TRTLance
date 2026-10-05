import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import { Ledger } from '@/components/common/ledger';
import { MoneyRing } from '@/components/common/money-ring';
import { PageHeader } from '@/components/common/page-header';
import { escrowStatement, moneyParts } from '@/lib/escrow-summary';
import { formatAmount } from '@/lib/money';
import { EmptyState } from '@/components/common/states';
import { ConnectedWallet } from '@/components/wallet/connected-wallet';
import { RoleStatement } from '@/components/wallet/role-statement';
import { TransactionLedgerRows } from '@/components/wallet/transaction-ledger';
import { WalletVerify } from '@/components/wallet/wallet-verify';
import { canHire, canWork, requireViewer } from '@/lib/auth';
import { isEscrowConfigured, publicEnv } from '@/lib/env';
import { explorerAddressUrl, formatDateTime, shortAddress } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import type { Contract, EscrowTransaction, Milestone } from '@/lib/types';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Wallet' };

type WalletContract = Pick<Contract, 'id' | 'title' | 'client_id' | 'freelancer_id' | 'status'> & { milestones: Milestone[] };

/** A labelled line of the wallet header: label column, then the facts. */
function FactRow({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <li className={cn('grid gap-2 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6', className)}>
      <p className="t-label-caps sm:pt-1">{label}</p>
      <div className="min-w-0">{children}</div>
    </li>
  );
}

export default async function WalletPage() {
  const viewer = await requireViewer('/wallet');
  const supabase = await createClient();
  const [contractsRes, txRes] = await Promise.all([
    supabase.from('contracts').select('id, title, client_id, freelancer_id, status, milestones(*)').returns<WalletContract[]>(),
    supabase.from('escrow_transactions').select('*').order('created_at', { ascending: false }).limit(50).returns<EscrowTransaction[]>(),
  ]);
  if (contractsRes.error) throw contractsRes.error;
  if (txRes.error) throw txRes.error;
  // A contract cancelled before funding never held money; leave it out of the totals.
  const contracts = (contractsRes.data ?? []).filter((c) => c.status !== 'cancelled' || c.milestones.some((m) => m.status !== 'pending'));
  const txs = txRes.data ?? [];
  const asClient = contracts.filter((c) => c.client_id === viewer.id);
  const asFreelancer = contracts.filter((c) => c.freelancer_id === viewer.id);
  const titles = new Map((contractsRes.data ?? []).map((c) => [c.id, c.title]));
  const allMilestones = (contractsRes.data ?? []).flatMap((c) => c.milestones);
  const walletParts = moneyParts(contracts.flatMap((c) => c.milestones));
  const w = viewer.wallet;
  const addrUrl = w ? explorerAddressUrl(w.address) : null;
  const network = publicEnv.chain.name || `Chain ${publicEnv.chain.id}`;
  const start = canWork(viewer) ? { label: 'Find work', href: '/work' } : canHire(viewer) ? { label: 'Post a project', href: '/projects/new' } : null;

  return (
    <div className="space-y-12">
      <PageHeader
        className="mb-0 md:mb-0"
        title="Wallet"
        description={`Your verified wallet and the money in your contracts, in ${publicEnv.chain.symbol}. TrustLance never holds a balance for you: clients fund escrow from their own wallet and approved milestones are paid straight to the freelancer’s verified wallet.`}
        aside={
          <MoneyRing
            className="-mx-4 h-[240px] sm:h-[300px] lg:mx-0 lg:h-[360px]"
            parts={walletParts.length ? walletParts : [{ amount: 1, state: 'unfunded' }]}
            readout={{ label: 'In your contracts', state: walletParts.length ? 'By money state' : 'Nothing in escrow yet', amount: `${formatAmount(escrowStatement(contracts.flatMap((c) => c.milestones)).secured)} in escrow` }}
          />
        }
      />

      <section aria-label="Wallets">
        <ul className="ledger">
          <FactRow label={w ? 'Verified wallet' : 'Verify a wallet'}>
            {w ? (
              <div className="space-y-1.5">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {addrUrl ? (
                    <a className="inline-flex items-center gap-1 font-mono text-base hover:underline" href={addrUrl} target="_blank" rel="noreferrer">
                      {shortAddress(w.address)} <ExternalLink className="size-3.5 text-ink-muted" aria-hidden /><span className="sr-only">(opens the block explorer)</span>
                    </a>
                  ) : (
                    <span className="font-mono text-base">{shortAddress(w.address)}</span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-success-strong">
                    <span className="inline-block size-1.5 rounded-full bg-success" aria-hidden />
                    <span>Verified</span>
                  </span>
                </p>
                <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
                  <span>{network}</span>
                  <span>Verified {formatDateTime(w.verified_at)}</span>
                  <span>Proof: signed message (Sign-In with Ethereum)</span>
                </p>
                <p className="text-xs text-ink-muted">Linked permanently to your account. If you lose access to it, contact support before signing new contracts.</p>
              </div>
            ) : (
              <WalletVerify />
            )}
          </FactRow>
          {/* Before verification the verify flow above already shows the browser wallet. */}
          {w && (
            <FactRow label="This device">
              {isEscrowConfigured() ? (
                <ConnectedWallet verifiedAddress={w.address} />
              ) : (
                <p className="text-sm text-ink-secondary">On-chain escrow is not configured on this deployment, so network details are unavailable.</p>
              )}
            </FactRow>
          )}
        </ul>
      </section>

      {asClient.length || asFreelancer.length ? (
        <div className={cn('grid grid-cols-1 gap-6', asClient.length && asFreelancer.length && 'lg:grid-cols-2')}>
          {asClient.length > 0 && <RoleStatement role="client" wide={!asFreelancer.length} contractCount={asClient.length} milestones={asClient.flatMap((c) => c.milestones)} />}
          {asFreelancer.length > 0 && <RoleStatement role="freelancer" wide={!asClient.length} contractCount={asFreelancer.length} milestones={asFreelancer.flatMap((c) => c.milestones)} />}
        </div>
      ) : (
        <EmptyState
          compact
          title="Nothing in escrow yet"
          description="When one of your contracts is funded, what is secured, released and refunded shows here."
          action={start ?? undefined}
        />
      )}

      <Ledger
        id="transactions"
        title="Transactions"
        description="The latest 50 escrow transactions on your contracts, verified on-chain by TrustLance."
        empty={<EmptyState compact title="No escrow transactions yet" description="Deposits, releases and refunds appear here with their network status." />}
      >
        {txs.length > 0 && <TransactionLedgerRows transactions={txs} milestones={allMilestones} titles={titles} />}
      </Ledger>
    </div>
  );
}
