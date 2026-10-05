import Link from 'next/link';
import { LedgerRow } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { TxStatusMark } from '@/components/common/status-mark';
import { explorerTxUrl, formatDate, formatDateTime, shortHash } from '@/lib/format';
import { txKindLabel } from '@/lib/status';
import type { EscrowTransaction, Milestone } from '@/lib/types';

/**
 * Escrow transactions across all of the member's contracts as plain ledger rows:
 * date · what happened (and on which contract) · amount · status · short hash.
 */
export function TransactionLedgerRows({ transactions, milestones, titles }: {
  transactions: EscrowTransaction[];
  milestones: Pick<Milestone, 'id' | 'position'>[];
  titles: Map<string, string>;
}) {
  const positions = new Map(milestones.map((m) => [m.id, m.position]));
  return transactions.map((t) => {
    const position = t.milestone_id ? positions.get(t.milestone_id) : undefined;
    const url = explorerTxUrl(t.tx_hash);
    const hash = <span className="font-mono" title={t.block_number ? `Block ${t.block_number}` : undefined}>{shortHash(t.tx_hash)}</span>;
    return (
      <LedgerRow
        key={t.id}
        tone={t.status === 'failed' ? 'danger' : undefined}
        className="sm:items-start"
        lead={
          <time dateTime={t.created_at} title={formatDateTime(t.created_at)} className="block font-mono text-xs tabular-nums text-ink-muted sm:w-20 sm:pt-0.5">
            {formatDate(t.created_at, 'd MMM yyyy')}
          </time>
        }
        trail={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:flex-col sm:items-end">
            {t.amount ? <Money amount={t.amount} /> : <span className="t-meta">No amount</span>}
            <span className="flex items-center gap-3">
              <TxStatusMark status={t.status} />
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="text-xs text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                  {hash}<span className="sr-only"> (opens the block explorer)</span>
                </a>
              ) : (
                <span className="text-xs text-ink-muted">{hash}</span>
              )}
            </span>
          </div>
        }
      >
        <p className="text-sm font-medium">
          {txKindLabel[t.kind]}
          {position !== undefined && <span className="font-normal text-ink-secondary"> · milestone {position}</span>}
        </p>
        <Link href={`/contracts/${t.contract_id}?tab=funding`} className="block truncate text-sm text-ink-secondary hover:text-ink hover:underline">
          {titles.get(t.contract_id) ?? 'Contract'}
        </Link>
        {t.failure_reason && <p className="mt-1 text-xs text-danger-strong">{t.failure_reason}</p>}
      </LedgerRow>
    );
  });
}
