import { ExternalLink, ReceiptText } from 'lucide-react';
import { Money } from '@/components/common/money';
import { TxStatusBadge } from '@/components/common/status-badge';
import { EmptyState } from '@/components/common/states';
import { explorerTxUrl, formatDateTime, shortAddress, shortHash } from '@/lib/format';
import { txKindLabel } from '@/lib/status';
import type { EscrowTransaction, Milestone } from '@/lib/types';

/** Every on-chain transaction for a contract: kind, amount, status, hash. Cards on phones, table on desktop. */
export function TransactionsList({ transactions, milestones }: { transactions: EscrowTransaction[]; milestones: Milestone[] }) {
  if (!transactions.length) {
    return <EmptyState compact icon={ReceiptText} title="No transactions yet" description="Deposits, releases and refunds appear here with their network status." />;
  }
  const label = (t: EscrowTransaction) => {
    const m = milestones.find((x) => x.id === t.milestone_id);
    return `${txKindLabel[t.kind]}${m ? ` · milestone ${m.position}` : ''}`;
  };
  const hash = (t: EscrowTransaction) => {
    const url = explorerTxUrl(t.tx_hash);
    return url
      ? <a href={url} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1 font-mono text-xs">{shortHash(t.tx_hash)} <ExternalLink className="size-3" aria-hidden /></a>
      : <span className="font-mono text-xs">{shortHash(t.tx_hash)}</span>;
  };
  return (
    <>
      <ul className="space-y-3 md:hidden">
        {transactions.map((t) => (
          <li key={t.id} className="panel space-y-2 p-4 text-sm">
            <div className="flex items-center justify-between gap-2"><span className="font-medium">{label(t)}</span><TxStatusBadge status={t.status} /></div>
            <div className="flex items-center justify-between gap-2">{t.amount ? <Money amount={t.amount} size="sm" /> : <span className="t-meta">—</span>}{hash(t)}</div>
            <p className="t-meta">{formatDateTime(t.created_at)}{t.from_address && ` · from ${shortAddress(t.from_address)}`}</p>
            {t.failure_reason && <p className="text-xs text-danger-strong">{t.failure_reason}</p>}
          </li>
        ))}
      </ul>
      <div className="panel hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Escrow transactions</caption>
          <thead><tr className="border-b bg-surface-subtle text-left text-ink-muted">
            <th scope="col" className="p-3 font-medium">Type</th><th scope="col" className="p-3 font-medium">Amount</th>
            <th scope="col" className="p-3 font-medium">Status</th><th scope="col" className="p-3 font-medium">Transaction</th>
            <th scope="col" className="p-3 font-medium">Date</th>
          </tr></thead>
          <tbody className="divide-y">
            {transactions.map((t) => (
              <tr key={t.id} className="align-top">
                <td className="p-3">{label(t)}{t.failure_reason && <p className="mt-1 max-w-xs text-xs text-danger-strong">{t.failure_reason}</p>}</td>
                <td className="p-3">{t.amount ? <Money amount={t.amount} size="sm" /> : '—'}</td>
                <td className="p-3"><TxStatusBadge status={t.status} /></td>
                <td className="p-3">{hash(t)}{t.block_number && <p className="t-meta">Block {t.block_number}</p>}</td>
                <td className="p-3 text-ink-secondary">{formatDateTime(t.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
