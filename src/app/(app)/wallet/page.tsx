import type { Metadata } from 'next';
import Link from 'next/link';
import { Ledger, LedgerRow } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { MoneyCount } from '@/components/common/money-count';
import { MoneyRing } from '@/components/common/money-ring';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/states';
import { StatusMark } from '@/components/common/status-mark';
import { BuyCoins } from '@/components/wallet/buy-coins';
import { BankAccountForm, BankAccountStatus, CancelWithdrawalButton, WithdrawForm } from '@/components/wallet/payouts';
import { DateBlock } from '@/components/contracts/activity-feed';
import { canHire, canWork, requireViewer } from '@/lib/auth';
import { getPlatformSettings } from '@/lib/data/contracts';
import { formatDate } from '@/lib/format';
import { feePercent, formatAmount, formatRupees, toCoins } from '@/lib/money';
import { coinTxLabel, withdrawalStatus } from '@/lib/status';
import { createClient } from '@/lib/supabase/server';
import type { CoinHistoryEntry, PayoutAccount, WalletSummary, Withdrawal } from '@/lib/types';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Wallet' };

const accountLabel = { wallet: 'Coin wallet', pending: 'On hold', earnings: 'Withdrawable' } as const;

type Props = { searchParams: Promise<{ buy?: string; next?: string }> };

export default async function WalletPage({ searchParams }: Props) {
  const viewer = await requireViewer('/wallet');
  const { buy, next } = await searchParams;
  const supabase = await createClient();
  const [summaryRes, historyRes, withdrawalsRes, accountRes, settings] = await Promise.all([
    supabase.rpc('my_wallet'),
    supabase.rpc('my_coin_history', { p_limit: 100 }),
    supabase.from('withdrawals').select('*').eq('user_id', viewer.id).order('requested_at', { ascending: false }).limit(20).returns<Withdrawal[]>(),
    supabase.from('payout_accounts')
      .select('user_id, account_holder, account_last4, ifsc, pan_last4, status, review_note, verified_at, created_at, updated_at')
      .eq('user_id', viewer.id).maybeSingle<PayoutAccount>(),
    getPlatformSettings(),
  ]);
  if (summaryRes.error) throw summaryRes.error;
  if (historyRes.error) throw historyRes.error;
  const w = summaryRes.data as WalletSummary;
  const history = (historyRes.data ?? []) as CoinHistoryEntry[];
  const withdrawals = withdrawalsRes.data ?? [];
  const account = accountRes.data ?? null;
  const open = withdrawals.filter((x) => x.status === 'requested');
  const works = canWork(viewer);
  const hires = canHire(viewer);
  // Only follow `next` back into the app.
  const nextPath = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  const presetBuy = buy && /^\d{1,7}$/.test(buy) ? Number(buy) : null;

  const figures = [
    { label: 'Coin wallet', amount: String(w.wallet), hint: 'Spend on projects and contracts' },
    { label: 'Locked in escrow', amount: String(w.locked), hint: 'For your active contracts' },
    { label: 'On hold', amount: String(w.pending), hint: `Released payments, ${settings.hold_working_days} working days` },
    { label: 'Withdrawable', amount: String(w.earnings), hint: 'Ready to send to your bank' },
  ];
  const ringParts = [
    { amount: w.wallet, state: 'approved' as const },
    { amount: w.locked, state: 'secured' as const },
    { amount: w.pending, state: 'review' as const },
    { amount: w.earnings, state: 'released' as const },
  ].filter((p) => p.amount > 0);
  const totalCoins = w.wallet + w.locked + w.pending + w.earnings;

  return (
    <div className="space-y-12">
      <PageHeader
        className="mb-0 md:mb-0"
        title="Wallet"
        description={`Your TrustLance Coins. 1 coin = ₹1. Buy coins to post projects and fund contracts; milestone payments you receive are held for ${settings.hold_working_days} working days, then you can withdraw them to your bank account. The platform fee is ${feePercent(settings.fee_bps)} of each payment to a freelancer.`}
        aside={
          <MoneyRing
            className="-mx-4 h-[240px] sm:h-[300px] lg:mx-0 lg:h-[360px]"
            parts={ringParts.length ? ringParts : [{ amount: 1, state: 'unfunded' }]}
            readout={{ label: 'Your coins', state: totalCoins ? 'Across wallet, escrow and earnings' : 'No coins yet', amount: formatAmount(totalCoins) }}
          />
        }
      />

      <section aria-label="Balances" className="border-y py-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
          {figures.map((f, i) => (
            <div key={f.label}>
              <dt className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{f.label}</dt>
              <dd className={cn('mt-2 leading-none', f.amount === '0' && 'text-ink-muted')}>
                <MoneyCount amount={f.amount} delay={i * 90} className="text-2xl leading-none md:text-3xl" />
              </dd>
              <dd className="t-meta mt-2">{f.hint}</dd>
            </div>
          ))}
        </dl>
      </section>

      {hires && (
        <section id="buy" aria-labelledby="buy-title" className="scroll-mt-24 space-y-4">
          <div className="space-y-1">
            <h2 id="buy-title" className="t-label-caps">Buy coins</h2>
            <p className="max-w-reading text-sm text-ink-secondary">
              {presetBuy
                ? `You need ${formatAmount(presetBuy)} more to continue. Pay with UPI, cards or net banking.`
                : 'You need enough coins in your wallet to post a project. They are locked in escrow only when you fund a contract.'}
            </p>
          </div>
          <BuyCoins initial={presetBuy} min={settings.min_purchase_coins} max={settings.max_purchase_coins} paisePerCoin={settings.paise_per_coin} next={nextPath} />
        </section>
      )}

      {(works || w.earnings > 0 || w.pending > 0) && (
        <section id="withdraw" aria-labelledby="withdraw-title" className="scroll-mt-24 space-y-5">
          <div className="space-y-1">
            <h2 id="withdraw-title" className="t-label-caps">Withdraw to your bank</h2>
            <p className="max-w-reading text-sm text-ink-secondary">
              Earnings become withdrawable {settings.hold_working_days} working days after a milestone is released. Coins you bought
              can’t be withdrawn; they’re for hiring.
            </p>
          </div>
          {account ? <BankAccountStatus account={account} /> : <BankAccountForm account={null} />}
          {account?.status === 'verified' && (
            <WithdrawForm earnings={String(w.earnings)} min={settings.min_withdrawal_coins} paisePerCoin={settings.paise_per_coin} account={account} />
          )}

          {w.holds.length > 0 && (
            <Ledger title="On hold" description="Released payments waiting out the hold period.">
              {w.holds.map((h, i) => (
                <LedgerRow key={`${h.contract_id}-${i}`} href={`/contracts/${h.contract_id}`} trail={<Money amount={String(h.coins)} />}
                  meta={<span>Withdrawable from {formatDate(h.available_on)}</span>}>
                  <p className="truncate text-sm font-medium">{h.contract_title}</p>
                </LedgerRow>
              ))}
            </Ledger>
          )}

          {withdrawals.length > 0 && (
            <Ledger title="Withdrawals">
              {withdrawals.map((x) => (
                <LedgerRow key={x.id} lead={<DateBlock iso={x.requested_at} />}
                  meta={<>
                    <StatusMark meta={withdrawalStatus[x.status]} />
                    <span>To ••{x.account_last4}</span>
                    {x.reference && <span>Reference {x.reference}</span>}
                    {x.failure_reason && <span className="text-danger-strong">{x.failure_reason}</span>}
                  </>}
                  trail={<div className="space-y-1"><Money amount={String(x.coins)} /><p className="t-meta">{formatRupees(x.amount_paise)}</p></div>}>
                  <p className="text-sm font-medium">WD-{String(x.number).padStart(6, '0')}</p>
                  {open.some((o) => o.id === x.id) && <CancelWithdrawalButton id={x.id} />}
                </LedgerRow>
              ))}
            </Ledger>
          )}
        </section>
      )}

      <Ledger
        id="history"
        title="History"
        description="Every coin that moved in or out of your balances. Entries are permanent and cannot be edited."
        empty={<EmptyState compact title="Nothing yet" description={hires ? 'Buy coins to post your first project.' : 'Payments for your milestones appear here.'} action={hires ? { label: 'Post a project', href: '/projects/new' } : { label: 'Find work', href: '/work' }} />}
      >
        {history.map((e) => {
          const incoming = toCoins(e.amount) > 0n;
          return (
            <LedgerRow key={e.entry_id} lead={<DateBlock iso={e.created_at} />}
              meta={<>
                <span>{accountLabel[e.account]}</span>
                {e.contract_id && <Link className="link" href={`/contracts/${e.contract_id}`}>Contract</Link>}
              </>}
              trail={<span className={cn('t-money text-sm', incoming ? 'text-success-strong' : 'text-ink-secondary')}>{incoming ? '+' : '−'}{formatAmount((incoming ? toCoins(e.amount) : -toCoins(e.amount)).toString())}</span>}>
              <p className="text-sm font-medium">{coinTxLabel[e.kind]}</p>
              <p className="truncate text-xs text-ink-secondary">{e.memo}</p>
            </LedgerRow>
          );
        })}
      </Ledger>
    </div>
  );
}
