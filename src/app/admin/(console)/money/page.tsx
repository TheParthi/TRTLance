import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertOctagon, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Callout } from '@/components/ui/callout';
import { AsOf, ConsoleEmpty, ConsoleHeader } from '@/components/admin/console-shell';
import { FilterBar } from '@/components/admin/filters';
import { Pagination, pageFrom } from '@/components/admin/pagination';
import { Cell, DataTable, Mono, type Column } from '@/components/admin/table';
import { Facts, Panel, Stat, StatGrid } from '@/components/admin/stat';
import { BarList } from '@/components/admin/trend';
import { getCoinLedger, getFinance, type LedgerEntry } from '@/lib/data/admin';
import { formatDateTime } from '@/lib/format';
import { formatAmount, formatRupees } from '@/lib/money';
import { coinTxLabel } from '@/lib/status';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Money' };

const PER_PAGE = 50;

const KINDS = [
  { value: 'all', label: 'Every movement' },
  { value: 'purchase', label: 'Coins bought' },
  { value: 'fund', label: 'Escrow funded' },
  { value: 'release', label: 'Milestone released' },
  { value: 'refund', label: 'Milestone refunded' },
  { value: 'settlement', label: 'Dispute settled' },
  { value: 'hold_release', label: 'Hold expired' },
  { value: 'withdrawal', label: 'Withdrawal requested' },
  { value: 'withdrawal_paid', label: 'Withdrawal paid' },
  { value: 'withdrawal_returned', label: 'Withdrawal returned' },
];

const coins = (value: number) => formatAmount(value, { symbol: false });

type Search = { kind?: string; page?: string };

/**
 * The money screen.
 *
 * The important thing here is the reconciliation, not the totals. The coin ledger is double entry,
 * so two statements must hold at all times: every account's stored balance equals the sum of its own
 * entries, and all the balances added together come to zero (the gateway account is negative by
 * exactly the number of coins ever issued). If either fails, something is wrong with the ledger
 * itself, and that belongs on screen rather than in a support ticket six weeks later.
 */
export default async function MoneyPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const { page, offset } = pageFrom(params.page, PER_PAGE);
  const kind = KINDS.find((k) => k.value === params.kind)?.value ?? 'all';

  const [finance, ledger] = await Promise.all([
    getFinance(),
    getCoinLedger({ kind, limit: PER_PAGE, offset }),
  ]);

  const { reconciliation: check, purchases, withdrawals, holds, settings } = finance;
  const balanced = check.sum_of_balances === 0 && check.drifted_accounts.length === 0;
  const byKind = (name: string) => finance.accounts.find((a) => a.kind === name)?.balance ?? 0;

  const columns: Column<LedgerEntry>[] = [
    {
      header: 'Movement',
      cell: (e) => (
        <Cell
          title={coinTxLabel[e.kind as keyof typeof coinTxLabel] ?? e.kind}
          meta={e.memo}
        />
      ),
    },
    {
      header: 'Account',
      hideBelow: 'md',
      cell: (e) => (
        <div className="min-w-0">
          <span className="block capitalize text-ink">{e.account_kind.replace(/_/g, ' ')}</span>
          {e.account_user ? (
            <Link href={`/admin/members/${e.account_user}`} className="block truncate t-meta hover:text-brand">{e.account_user_name}</Link>
          ) : e.contract_id ? (
            <Link href={`/admin/contracts/${e.contract_id}`} className="block truncate t-meta hover:text-brand">a contract’s escrow</Link>
          ) : (
            <span className="block t-meta">the platform</span>
          )}
        </div>
      ),
    },
    {
      header: 'Amount',
      numeric: true,
      cell: (e) => (
        <span className={cn('t-money', e.amount > 0 ? 'text-success-strong' : 'text-ink')}>
          {e.amount > 0 ? '+' : '−'}{coins(Math.abs(e.amount))}
        </span>
      ),
    },
    { header: 'Balance after', numeric: true, hideBelow: 'lg', cell: (e) => coins(e.balance_after) },
    { header: 'By', hideBelow: 'lg', cell: (e) => e.actor_name ?? <span className="text-ink-muted">the system</span> },
    { header: 'When', numeric: true, hideBelow: 'sm', cell: (e) => <Mono>{formatDateTime(e.created_at)}</Mono> },
  ];

  return (
    <>
      <ConsoleHeader
        title="Money"
        description="Where every coin sits, how much has come in and gone out, and whether the books balance. One coin is ₹1."
        meta={<AsOf at={finance.generated_at} />}
      />

      <div className="space-y-12">
        {balanced ? (
          <Callout tone="success" title="The books balance">
            Every account’s balance matches the sum of its own entries, and all balances together come
            to zero across {check.transactions.toLocaleString('en-IN')} transactions
            and {check.entries.toLocaleString('en-IN')} entries.
          </Callout>
        ) : (
          <Callout tone="danger" title="The ledger does not balance">
            <p>
              This should never happen: the coin ledger is double entry and every movement is written
              in one transaction. Do not change anything by hand — the entries are the record, and the
              balances are the thing that has drifted from them.
            </p>
            <ul className="mt-2 space-y-1">
              {check.sum_of_balances !== 0 && (
                <li>All balances together come to <span className="font-mono">{check.sum_of_balances}</span>, not zero.</li>
              )}
              {check.drifted_accounts.map((account) => (
                <li key={account.account_id}>
                  <span className="capitalize">{account.kind.replace(/_/g, ' ')}</span> account
                  <span className="font-mono"> #{account.account_id}</span> holds
                  <span className="font-mono"> {account.balance}</span> but its entries add up to
                  <span className="font-mono"> {account.entry_sum}</span>
                  {account.user_id && <> (<Link href={`/admin/members/${account.user_id}`} className="underline">member</Link>)</>}
                  {account.contract_id && <> (<Link href={`/admin/contracts/${account.contract_id}`} className="underline">contract</Link>)</>}
                </li>
              ))}
            </ul>
          </Callout>
        )}

        <StatGrid>
          <Stat label="Coins issued" value={coins(finance.issued)} unit="coins" tone="neutral"
            hint={`Worth ${formatRupees(finance.issued * 100)} at ${settings.paise_per_coin ?? 100} paise each`} />
          <Stat label="Locked in escrow" value={coins(byKind('escrow'))} unit="coins" tone="brand"
            hint="Across every funded milestone." />
          <Stat label="Platform fees earned" value={coins(finance.fees.total)} unit="coins" tone="brass"
            hint={`${coins(finance.fees.last_30d)} in the last 30 days`} />
          <Stat label="Withdrawals in transit" value={coins(byKind('payouts_in_transit'))} unit="coins" tone="warning"
            hint={withdrawals.requested > 0 ? `${withdrawals.requested} request${withdrawals.requested === 1 ? '' : 's'} to pay` : 'Nothing to send.'}
            href="/admin/queues#withdrawals" urgent={withdrawals.requested > 0} />
        </StatGrid>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <Panel title="In and out" description="Real money entering and leaving the platform.">
            <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
              <Facts
                items={[
                  { label: 'Coins bought', value: <>{coins(purchases.paid_coins)} coins <span className="t-meta">over {purchases.paid.toLocaleString('en-IN')} purchases</span></> },
                  { label: 'Money taken', value: formatRupees(purchases.paid_paise) },
                  { label: 'Bought this week', value: `${coins(purchases.paid_7d)} coins` },
                  { label: 'Not completed', value: <>{purchases.created} started · {purchases.failed} failed</> },
                ]}
              />
              <Facts
                items={[
                  { label: 'Withdrawals paid', value: <>{coins(withdrawals.paid_coins)} coins <span className="t-meta">over {withdrawals.paid.toLocaleString('en-IN')} payouts</span></> },
                  { label: 'Money sent', value: formatRupees(withdrawals.paid_paise) },
                  { label: 'Waiting to be paid', value: `${coins(withdrawals.requested_coins)} coins` },
                  { label: 'Not completed', value: <>{withdrawals.failed} rejected · {withdrawals.cancelled} cancelled</> },
                ]}
              />
            </div>
          </Panel>

          <Panel title="Where the coins are" description="Every coin issued sits in exactly one account.">
            <BarList
              total={finance.issued || 1}
              format={coins}
              items={finance.accounts
                .filter((a) => a.kind !== 'gateway')
                .map((a) => ({
                  label: a.kind.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
                  value: a.balance,
                  hint: `${a.accounts.toLocaleString('en-IN')} account${a.accounts === 1 ? '' : 's'}`,
                  tone: ({ escrow: 'brand', wallet: 'info', pending: 'brass', earnings: 'success', platform_fees: 'refund', payouts_in_transit: 'danger' } as const)[a.kind] ?? 'brand',
                }))}
            />
            <Facts
              items={[
                { label: 'On hold', value: <>{coins(holds.coins)} coins <span className="t-meta">over {holds.count} hold{holds.count === 1 ? '' : 's'}</span></> },
                { label: 'Due today', value: `${coins(holds.due_today)} coins` },
                { label: 'Hold length', value: `${settings.hold_working_days ?? '—'} working days` },
                { label: 'Platform fee', value: `${(settings.fee_bps ?? 0) / 100}%` },
              ]}
            />
          </Panel>
        </div>

        <Panel
          id="ledger"
          title="The platform ledger"
          description="Every coin movement on TrustLance, newest first. Entries are append-only: nothing here can be edited or deleted, by anyone."
          action={
            <Badge tone={balanced ? 'success' : 'danger'}>
              {balanced ? <CheckCircle2 /> : <AlertOctagon />}
              {balanced ? 'balanced' : 'drifted'}
            </Badge>
          }
        >
          <div className="space-y-6">
            <FilterBar selects={[{ name: 'kind', label: 'Kind', options: KINDS }]} />
            <DataTable
              caption="Coin ledger entries, with the account, amount and resulting balance"
              columns={columns}
              rows={ledger.rows}
              rowKey={(e) => String(e.entry_id)}
              empty={<ConsoleEmpty title="No movements of this kind" description="Change the filter to see more of the ledger." />}
            />
            <Pagination total={ledger.total} page={page} perPage={PER_PAGE} params={params} />
          </div>
        </Panel>
      </div>
    </>
  );
}
