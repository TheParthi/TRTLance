import { ExternalLink } from 'lucide-react';
import { Money } from '@/components/common/money';
import { EmptyState } from '@/components/common/states';
import { StatusMark } from '@/components/common/status-mark';
import { explorerTxUrl, formatDate, formatDateTime, shortAddress, shortHash } from '@/lib/format';
import { txKindLabel, txStatus } from '@/lib/status';
import type { EscrowTransaction, EscrowTxStatus, Milestone } from '@/lib/types';
import { cn } from '@/lib/utils';

/** "Verified" says what a confirmed transaction means here: TrustLance checked it on-chain. */
const TxState = ({ status }: { status: EscrowTxStatus }) => (
  <StatusMark meta={status === 'confirmed' ? { ...txStatus.confirmed, label: 'Verified' } : txStatus[status]} />
);

function Hash({ hash, className }: { hash: string; className?: string }) {
  const url = explorerTxUrl(hash);
  return url
    ? <a href={url} target="_blank" rel="noreferrer" className={cn('inline-flex items-center gap-1 font-mono text-xs text-ink-secondary underline-offset-4 hover:text-brand hover:underline', className)}>{shortHash(hash)} <ExternalLink className="size-3" aria-hidden /><span className="sr-only"> (opens the block explorer)</span></a>
    : <span className={cn('font-mono text-xs text-ink-secondary', className)}>{shortHash(hash)}</span>;
}

/**
 * Every on-chain transaction for a contract, as a financial ledger.
 * Aligned columns from md up; two-line rows on phones.
 */
export function TransactionsList({ transactions, milestones }: { transactions: EscrowTransaction[]; milestones: Milestone[] }) {
  if (!transactions.length) {
    return <EmptyState compact title="No transactions yet" description="Deposits, releases and refunds appear here with their network status." />;
  }
  const milestoneOf = (t: EscrowTransaction) => {
    const m = milestones.find((x) => x.id === t.milestone_id);
    return m ? `${m.position}. ${m.title}` : 'Whole contract';
  };
  const amount = (t: EscrowTransaction, size: 'sm' | 'md' = 'sm') => (t.amount ? <Money amount={t.amount} size={size} /> : <span className="t-meta">No funds moved</span>);

  return (
    <>
      <ul className="ledger md:hidden">
        {transactions.map((t) => (
          <li key={t.id} className="space-y-1 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium">{txKindLabel[t.kind]}</span>
              <span className="shrink-0">{amount(t)}</span>
            </div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
              <time dateTime={t.created_at}>{formatDate(t.created_at, 'd MMM, HH:mm')}</time>
              <span aria-hidden>·</span>
              <span className="min-w-0 truncate">{milestoneOf(t)}</span>
              <span aria-hidden>·</span>
              <TxState status={t.status} />
              <span aria-hidden>·</span>
              <Hash hash={t.tx_hash} />
            </p>
            {t.failure_reason && <p className="text-xs text-danger-strong">{t.failure_reason}</p>}
          </li>
        ))}
      </ul>

      <table className="hidden w-full border-y text-sm md:table">
        <caption className="sr-only">Escrow transactions</caption>
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="t-label-caps py-2.5 pr-4 font-semibold">Date</th>
            <th scope="col" className="t-label-caps py-2.5 pr-4 font-semibold">Description</th>
            <th scope="col" className="t-label-caps py-2.5 pr-4 font-semibold">Milestone</th>
            <th scope="col" className="t-label-caps py-2.5 pr-4 text-right font-semibold">Amount</th>
            <th scope="col" className="t-label-caps py-2.5 pr-4 font-semibold">State</th>
            <th scope="col" className="t-label-caps py-2.5 font-semibold">Transaction</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {transactions.map((t) => (
            <tr key={t.id} className="align-top">
              <td className="whitespace-nowrap py-3 pr-4 text-ink-secondary">
                <time dateTime={t.created_at} title={formatDateTime(t.created_at)}>{formatDate(t.created_at)}<span className="block font-mono text-xs text-ink-muted">{formatDate(t.created_at, 'HH:mm')}</span></time>
              </td>
              <td className="py-3 pr-4">
                <span className="font-medium">{txKindLabel[t.kind]}</span>
                {t.from_address && <span className="t-meta block">From {shortAddress(t.from_address)}</span>}
                {t.failure_reason && <span className="mt-1 block max-w-xs text-xs text-danger-strong">{t.failure_reason}</span>}
              </td>
              <td className="max-w-48 py-3 pr-4 text-ink-secondary lg:max-w-64"><span className="line-clamp-2">{milestoneOf(t)}</span></td>
              <td className="whitespace-nowrap py-3 pr-4 text-right">{amount(t)}</td>
              <td className="whitespace-nowrap py-3 pr-4"><TxState status={t.status} /></td>
              <td className="whitespace-nowrap py-3">
                <Hash hash={t.tx_hash} />
                {t.block_number && <span className="t-meta block">Block {t.block_number}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
