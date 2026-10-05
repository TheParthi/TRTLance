import Link from 'next/link';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { shortAddress } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Always-visible wallet state: verified (with address) or a prompt to verify. */
export function WalletChip({ address }: { address: string | null }) {
  return (
    <Link
      href="/wallet"
      aria-label={address ? `Wallet ${shortAddress(address)}, verified` : 'Wallet not verified — verify now'}
      className={cn(
        'hidden h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors lg:inline-flex',
        address ? 'border-line text-ink-secondary hover:bg-surface-subtle' : 'border-warning/40 bg-warning-soft text-warning-strong hover:bg-warning-soft/70',
      )}
    >
      {address ? <ShieldCheck className="size-3.5 text-success" aria-hidden /> : <ShieldAlert className="size-3.5" aria-hidden />}
      <span className="font-mono">{address ? shortAddress(address) : 'Verify wallet'}</span>
    </Link>
  );
}
