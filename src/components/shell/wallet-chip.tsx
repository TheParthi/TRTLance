import Link from 'next/link';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { shortAddress } from '@/lib/format';
import { formatAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * Always-visible wallet state: verified, with the money currently held in escrow for this member,
 * or a prompt to verify. Compact on purpose — the wallet page tells the full story.
 */
export function WalletChip({ address, inEscrow }: { address: string | null; inEscrow: string | null }) {
  const held = inEscrow && Number(inEscrow) > 0 ? formatAmount(inEscrow) : null;
  return (
    <Link
      href="/wallet"
      aria-label={address ? `Wallet ${shortAddress(address)}, verified${held ? `. ${held} in escrow` : ''}` : 'Wallet not verified — verify now'}
      className={cn(
        'hidden h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full pl-2.5 pr-3 text-xs font-medium transition-colors duration-base ease-ledger lg:inline-flex',
        address ? 'text-ink-secondary hover:bg-ink/5' : 'bg-warning-soft text-warning-strong hover:bg-warning-soft/70',
      )}
    >
      {address ? <ShieldCheck className="size-4 text-success" aria-hidden /> : <ShieldAlert className="size-4" aria-hidden />}
      {address ? (
        held ? (
          <span className="flex items-baseline gap-1"><span className="t-money text-ink">{held}</span><span className="hidden text-ink-muted xl:inline">in escrow</span></span>
        ) : (
          <span className="font-mono">{shortAddress(address)}</span>
        )
      ) : (
        <span>Verify wallet</span>
      )}
    </Link>
  );
}
