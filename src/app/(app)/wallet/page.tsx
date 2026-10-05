import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink, Info, ShieldCheck, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Callout } from '@/components/ui/callout';
import { MoneyStat } from '@/components/common/money';
import { PageHeader, Section } from '@/components/common/page-header';
import { TransactionsList } from '@/components/contracts/transactions-list';
import { ConnectedWallet } from '@/components/wallet/connected-wallet';
import { WalletVerify } from '@/components/wallet/wallet-verify';
import { requireViewer } from '@/lib/auth';
import { isEscrowConfigured, publicEnv } from '@/lib/env';
import { explorerAddressUrl, formatDateTime, shortAddress } from '@/lib/format';
import { sumAmounts } from '@/lib/money';
import { LOCKED_MILESTONE_STATES } from '@/lib/status';
import { createClient } from '@/lib/supabase/server';
import type { Contract, EscrowTransaction, Milestone } from '@/lib/types';

export const metadata: Metadata = { title: 'Wallet' };

export default async function WalletPage() {
  const viewer = await requireViewer('/wallet');
  const supabase = await createClient();
  const [{ data: contracts }, { data: txs }] = await Promise.all([
    supabase.from('contracts').select('id, title, client_id, freelancer_id, status, milestones(*)').returns<(Pick<Contract, 'id' | 'title' | 'client_id' | 'freelancer_id' | 'status'> & { milestones: Milestone[] })[]>(),
    supabase.from('escrow_transactions').select('*').order('created_at', { ascending: false }).limit(50).returns<EscrowTransaction[]>(),
  ]);
  const asClient = (contracts ?? []).filter((c) => c.client_id === viewer.id).flatMap((c) => c.milestones);
  const asFreelancer = (contracts ?? []).filter((c) => c.freelancer_id === viewer.id).flatMap((c) => c.milestones);
  const locked = (ms: Milestone[]) => sumAmounts(ms.filter((m) => LOCKED_MILESTONE_STATES.includes(m.status)).map((m) => m.amount));
  const paid = (ms: Milestone[]) => sumAmounts(ms.map((m) => m.freelancer_payout ?? '0'));
  const refunded = (ms: Milestone[]) => sumAmounts(ms.map((m) => m.client_refund ?? '0'));
  const titles = new Map((contracts ?? []).map((c) => [c.id, c.title]));
  const allMilestones = (contracts ?? []).flatMap((c) => c.milestones);
  const w = viewer.wallet;
  const addrUrl = w ? explorerAddressUrl(w.address) : null;

  return (
    <>
      <PageHeader
        title="Wallet"
        description={`Your verified wallet and everything you have in escrow. All amounts are in ${publicEnv.chain.symbol}, the native coin of the escrow network.`}
      />
      <Callout tone="info" className="mb-6" title="TrustLance never holds a balance for you">
        Clients fund escrow directly from their wallet, and approved milestones are paid straight to the freelancer’s verified wallet. There is nothing to withdraw from TrustLance.
      </Callout>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Verified wallet" description="The wallet that funds your contracts and receives your payments.">
          <div className="panel p-5">
            {w ? (
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-muted">Address</dt>
                  <dd className="flex items-center gap-2 font-mono">
                    {addrUrl ? <a className="link inline-flex items-center gap-1" href={addrUrl} target="_blank" rel="noreferrer">{shortAddress(w.address)} <ExternalLink className="size-3" aria-hidden /></a> : shortAddress(w.address)}
                    <Badge tone="success"><ShieldCheck /> Verified</Badge>
                  </dd>
                </div>
                <div className="flex justify-between gap-3"><dt className="text-ink-muted">Verified</dt><dd>{formatDateTime(w.verified_at)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink-muted">Proof</dt><dd>Signed message (Sign-In with Ethereum)</dd></div>
                <p className="border-t pt-3 text-xs text-ink-muted">Linked permanently to your account. If you lose access to this wallet, contact support before signing new contracts.</p>
              </dl>
            ) : (
              <WalletVerify />
            )}
          </div>
        </Section>

        <Section title="This device" description="The wallet currently connected in your browser.">
          <div className="panel p-5">
            {isEscrowConfigured() ? <ConnectedWallet verifiedAddress={w?.address ?? null} /> : (
              <p className="flex items-start gap-2 text-sm text-ink-secondary"><Info className="mt-0.5 size-4 shrink-0" aria-hidden /> On-chain escrow is not configured on this deployment, so network details are unavailable.</p>
            )}
          </div>
        </Section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section title="As a client" description="Money you deposited into escrow.">
          <div className="panel grid grid-cols-2 gap-5 p-5 sm:grid-cols-3">
            <MoneyStat label="Secured in escrow" amount={locked(asClient)} tone="brand" hint="Still locked" />
            <MoneyStat label="Paid to freelancers" amount={paid(asClient)} tone="success" />
            <MoneyStat label="Refunded to you" amount={refunded(asClient)} tone="refund" />
          </div>
        </Section>
        <Section title="As a freelancer" description="Money held or paid for your work.">
          <div className="panel grid grid-cols-2 gap-5 p-5 sm:grid-cols-3">
            <MoneyStat label="In escrow for you" amount={locked(asFreelancer)} tone="brand" hint="Paid on approval" />
            <MoneyStat label="Received" amount={paid(asFreelancer)} tone="success" />
            <MoneyStat label="Returned to clients" amount={refunded(asFreelancer)} tone="refund" />
          </div>
        </Section>
      </div>

      <Section className="mt-8" title="Transaction history" description="The latest 50 escrow transactions on your contracts, verified on-chain by TrustLance.">
        {txs && txs.length > 0 ? (
          <div className="space-y-2">
            <TransactionsList transactions={txs} milestones={allMilestones} />
            <p className="t-meta">Open a contract to see its full history: {Array.from(new Set(txs.map((t) => t.contract_id))).slice(0, 5).map((id, i) => (
              <span key={id}>{i > 0 && ', '}<Link className="link" href={`/contracts/${id}?tab=funding`}>{titles.get(id) ?? 'contract'}</Link></span>
            ))}</p>
          </div>
        ) : (
          <div className="panel flex items-center gap-3 p-5 text-sm text-ink-secondary"><Wallet className="size-5 text-ink-muted" aria-hidden /> No escrow transactions yet.</div>
        )}
      </Section>
    </>
  );
}
