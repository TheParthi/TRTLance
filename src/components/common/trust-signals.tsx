import { BadgeCheck, Mail, ShieldCheck, Star, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProfileStats } from '@/lib/types';

type TrustFacts = Pick<ProfileStats, 'email_verified' | 'wallet_verified' | 'rating_avg' | 'review_count'> &
  Partial<Pick<ProfileStats, 'funded_as_client' | 'completed_as_freelancer' | 'completed_as_client'>>;

/** Verified facts about a member. Only shows what the platform actually knows. */
export function TrustSignals({ stats, role, className, compact }: {
  stats: TrustFacts;
  role: 'client' | 'freelancer';
  className?: string;
  compact?: boolean;
}) {
  const items: { icon: typeof Mail; label: string; ok: boolean }[] = [
    { icon: Mail, label: stats.email_verified ? 'Email verified' : 'Email not verified', ok: stats.email_verified },
    { icon: Wallet, label: stats.wallet_verified ? 'Wallet verified' : 'No verified wallet', ok: stats.wallet_verified },
  ];
  if (role === 'client' && stats.funded_as_client !== undefined) {
    items.push({
      icon: ShieldCheck,
      label: stats.funded_as_client ? `${stats.funded_as_client} contract${stats.funded_as_client === 1 ? '' : 's'} funded in escrow` : 'No funded contracts yet',
      ok: stats.funded_as_client > 0,
    });
  }
  if (role === 'freelancer' && stats.completed_as_freelancer !== undefined) {
    items.push({
      icon: BadgeCheck,
      label: stats.completed_as_freelancer ? `${stats.completed_as_freelancer} completed contract${stats.completed_as_freelancer === 1 ? '' : 's'}` : 'No completed contracts yet',
      ok: stats.completed_as_freelancer > 0,
    });
  }
  return (
    <ul className={cn(compact ? 'flex flex-wrap gap-x-3 gap-y-1' : 'space-y-2', 'text-xs', className)}>
      {items.map(({ icon: Icon, label, ok }) => (
        <li key={label} className={cn('flex items-center gap-1.5', ok ? 'text-ink-secondary' : 'text-ink-muted')}>
          <Icon className={cn('size-3.5', ok ? 'text-success' : 'text-ink-muted/70')} aria-hidden />
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1.5 text-ink-secondary">
        <Star className={cn('size-3.5', stats.review_count ? 'fill-brass text-brass' : 'text-ink-muted/70')} aria-hidden />
        {stats.review_count ? (
          <span>
            <span className="font-semibold text-ink">{Number(stats.rating_avg).toFixed(1)}</span> from {stats.review_count} review{stats.review_count === 1 ? '' : 's'}
          </span>
        ) : (
          <span className="text-ink-muted">No reviews yet</span>
        )}
      </li>
    </ul>
  );
}

export function Stars({ rating, size = 'sm', label }: { rating: number; size?: 'sm' | 'md'; label?: string }) {
  const cls = size === 'sm' ? 'size-3.5' : 'size-5';
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label ?? `${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn(cls, n <= Math.round(rating) ? 'fill-brass text-brass' : 'text-line-strong')} aria-hidden />
      ))}
    </span>
  );
}
