import Link from 'next/link';
import { Coins } from 'lucide-react';
import { formatAmount } from '@/lib/money';

/**
 * Always-visible coin balance, with the coins held in escrow for this member. Compact on purpose —
 * the wallet page tells the full story.
 */
export function WalletChip({ coins, inEscrow }: { coins: string; inEscrow: string | null }) {
  const held = inEscrow && inEscrow !== '0' ? formatAmount(inEscrow) : null;
  return (
    <Link
      href="/wallet"
      aria-label={`Wallet: ${formatAmount(coins)}${held ? `. ${held} in escrow` : ''}`}
      className="hidden h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full pl-2.5 pr-3 text-xs font-medium text-ink-secondary transition-colors duration-base ease-ledger hover:bg-ink/5 lg:inline-flex"
    >
      <Coins className="size-4 text-brass" aria-hidden />
      <span className="flex items-baseline gap-1">
        <span className="t-money text-ink">{formatAmount(coins)}</span>
        {held && <span className="hidden text-ink-muted xl:inline">· {held} in escrow</span>}
      </span>
    </Link>
  );
}
