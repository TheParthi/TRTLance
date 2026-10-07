import { Money } from '@/components/common/money';
import { EmptyState } from '@/components/common/states';
import { formatDate, formatDateTime } from '@/lib/format';
import { toCoins } from '@/lib/money';
import { coinTxLabel } from '@/lib/status';
import type { EscrowEntry, Milestone } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * Every movement of coins into and out of this contract's escrow, from the ledger. Entries are
 * append-only: nothing here can be edited or deleted. Aligned columns from md up; two-line rows on phones.
 */
export function EscrowMovements({ entries, milestones }: { entries: EscrowEntry[]; milestones: Milestone[] }) {
  if (!entries.length) {
    return <EmptyState compact title="No coins have moved yet" description="Locking the coins, releases and refunds appear here as they happen." />;
  }
  const milestoneOf = (e: EscrowEntry) => {
    const m = milestones.find((x) => x.id === e.milestone_id);
    return m ? `${m.position}. ${m.title}` : 'Whole contract';
  };
  const signed = (e: EscrowEntry) => {
    const coins = toCoins(e.amount);
    const incoming = coins > 0n;
    return (
      <span className={cn('inline-flex items-baseline gap-0.5', incoming ? 'text-ink' : 'text-ink-secondary')}>
        <span aria-hidden>{incoming ? '+' : '−'}</span>
        <span className="sr-only">{incoming ? 'into escrow' : 'out of escrow'}</span>
        <Money amount={(incoming ? coins : -coins).toString()} size="sm" />
      </span>
    );
  };

  return (
    <>
      <ul className="ledger md:hidden">
        {entries.map((e) => (
          <li key={e.entry_id} className="space-y-1 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium">{coinTxLabel[e.kind]}</span>
              <span className="shrink-0">{signed(e)}</span>
            </div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
              <time dateTime={e.created_at}>{formatDate(e.created_at, 'd MMM, HH:mm')}</time>
              <span aria-hidden>·</span>
              <span className="min-w-0 truncate">{milestoneOf(e)}</span>
              <span aria-hidden>·</span>
              <span>In escrow after: <Money amount={e.balance_after} size="sm" muted /></span>
            </p>
          </li>
        ))}
      </ul>

      <table className="hidden w-full border-y text-sm md:table">
        <caption className="sr-only">Escrow movements</caption>
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="t-label-caps py-2.5 pr-4 font-semibold">Date</th>
            <th scope="col" className="t-label-caps py-2.5 pr-4 font-semibold">Description</th>
            <th scope="col" className="t-label-caps py-2.5 pr-4 font-semibold">Milestone</th>
            <th scope="col" className="t-label-caps py-2.5 pr-4 text-right font-semibold">Amount</th>
            <th scope="col" className="t-label-caps py-2.5 text-right font-semibold">In escrow after</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {entries.map((e) => (
            <tr key={e.entry_id} className="align-top">
              <td className="whitespace-nowrap py-3 pr-4 text-ink-secondary">
                <time dateTime={e.created_at} title={formatDateTime(e.created_at)}>{formatDate(e.created_at)}<span className="block font-mono text-xs text-ink-muted">{formatDate(e.created_at, 'HH:mm')}</span></time>
              </td>
              <td className="py-3 pr-4">
                <span className="font-medium">{coinTxLabel[e.kind]}</span>
                <span className="t-meta block">{e.memo}</span>
              </td>
              <td className="max-w-48 py-3 pr-4 text-ink-secondary lg:max-w-64"><span className="line-clamp-2">{milestoneOf(e)}</span></td>
              <td className="whitespace-nowrap py-3 pr-4 text-right">{signed(e)}</td>
              <td className="whitespace-nowrap py-3 text-right"><Money amount={e.balance_after} size="sm" muted /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
