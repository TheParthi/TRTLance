import { BadgeCheck, Landmark, Mail, ShieldCheck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProfileStats } from '@/lib/types';

type TrustFacts = Pick<ProfileStats, 'email_verified' | 'identity_verified' | 'rating_avg' | 'review_count'> &
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
    { icon: Landmark, label: stats.identity_verified ? 'Identity verified (PAN and bank)' : 'Identity not verified', ok: stats.identity_verified },
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

/**
 * One quiet line of verified, positive facts ("Identity verified · 3 contracts funded · 5.0 from 2 reviews").
 * The absence of facts collapses into a single "New to TrustLance" instead of a list of negatives.
 */
export function TrustLine({ stats, role, className }: { stats: TrustFacts; role: 'client' | 'freelancer'; className?: string }) {
  const facts: React.ReactNode[] = [];
  if (stats.identity_verified) facts.push(<span key="w" className="inline-flex items-center gap-1"><Landmark className="size-3.5 text-success" aria-hidden />Identity verified</span>);
  else if (stats.email_verified) facts.push(<span key="e" className="inline-flex items-center gap-1"><Mail className="size-3.5 text-success" aria-hidden />Email verified</span>);
  if (role === 'client' && stats.funded_as_client) facts.push(<span key="f">{stats.funded_as_client} contract{stats.funded_as_client === 1 ? '' : 's'} funded</span>);
  if (role === 'freelancer' && stats.completed_as_freelancer) facts.push(<span key="c">{stats.completed_as_freelancer} completed</span>);
  if (stats.review_count) {
    facts.push(
      <span key="r" className="inline-flex items-center gap-1">
        <Star className="size-3.5 fill-brass text-brass" aria-hidden />
        <span className="font-semibold text-ink">{Number(stats.rating_avg).toFixed(1)}</span>
        <span>({stats.review_count})</span>
      </span>,
    );
  }
  const onlyContact = facts.length <= 1 && !stats.review_count && !(stats.funded_as_client || stats.completed_as_freelancer);
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-secondary', className)}>
      {facts.map((f, i) => (
        <span key={i} className="inline-flex items-center gap-2">{i > 0 && <span aria-hidden className="text-line-strong">·</span>}{f}</span>
      ))}
      {onlyContact && <>{facts.length > 0 && <span aria-hidden className="text-line-strong">·</span>}<span className="text-ink-muted">New to TrustLance</span></>}
    </span>
  );
}
