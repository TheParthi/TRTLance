import Link from 'next/link';
import { BadgeCheck, MessageSquareQuote } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Section } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/states';
import { Stars } from '@/components/common/trust-signals';
import type { PublicMember } from '@/lib/data/projects';
import { formatDate } from '@/lib/format';
import type { ProfileStats, Review } from '@/lib/types';

const label = (key: string) => key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Average of each category score, per reviewer role, from the reviews' `ratings` jsonb. */
function breakdown(reviews: Review[], role: Review['reviewer_role']) {
  const sums = new Map<string, { total: number; n: number }>();
  for (const r of reviews) {
    if (r.reviewer_role !== role) continue;
    for (const [key, value] of Object.entries(r.ratings ?? {})) {
      if (typeof value !== 'number' || value < 1 || value > 5) continue;
      const s = sums.get(key) ?? { total: 0, n: 0 };
      sums.set(key, { total: s.total + value, n: s.n + 1 });
    }
  }
  return Array.from(sums, ([key, s]) => ({ key, avg: s.total / s.n, n: s.n }));
}

export function ReviewsSection({ name, stats, reviews, reviewers, limit }: {
  name: string;
  stats: ProfileStats | null;
  reviews: Review[];
  reviewers: Map<string, PublicMember>;
  limit: number;
}) {
  const count = stats?.review_count ?? 0;
  const avg = stats?.rating_avg ? Number(stats.rating_avg) : null;
  const groups = [
    { role: 'client' as const, title: 'From clients', items: breakdown(reviews, 'client') },
    { role: 'freelancer' as const, title: 'From freelancers', items: breakdown(reviews, 'freelancer') },
  ].filter((g) => g.items.length > 0);

  return (
    <Section id="reviews" title="Reviews" description="Written by the other party after a contract on TrustLance.">
      {count === 0 || reviews.length === 0 ? (
        <EmptyState compact icon={MessageSquareQuote} title="No reviews yet" description={`Reviews appear here after ${name} completes a contract and the other party leaves feedback.`} />
      ) : (
        <div className="space-y-4">
          <div className="panel grid gap-6 p-5 sm:grid-cols-[10rem_1fr]">
            <div className="space-y-1">
              <p className="t-eyebrow">Overall</p>
              <p className="t-money text-3xl">{avg !== null ? avg.toFixed(1) : '—'}</p>
              {avg !== null && <Stars rating={avg} label={`Average ${avg.toFixed(1)} out of 5 stars`} />}
              <p className="t-meta">{count} review{count === 1 ? '' : 's'}</p>
            </div>
            {groups.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                {groups.map((g) => (
                  <div key={g.role} className="space-y-2">
                    <p className="t-eyebrow">{g.title}</p>
                    <dl className="space-y-2">
                      {g.items.map((item) => (
                        <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                          <dt className="text-ink-secondary">{label(item.key)}</dt>
                          <dd className="flex items-center gap-2">
                            <Stars rating={item.avg} label={`${label(item.key)}: ${item.avg.toFixed(1)} out of 5`} />
                            <span className="t-mono text-ink-secondary">{item.avg.toFixed(1)}</span>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            )}
          </div>
          {count > reviews.length && <p className="t-meta">Category scores and the list below cover the {limit} most recent reviews.</p>}
          <ul className="space-y-3">
            {reviews.map((r) => <ReviewItem key={r.id} review={r} reviewer={reviewers.get(r.reviewer_id)} />)}
          </ul>
        </div>
      )}
    </Section>
  );
}

function ReviewItem({ review, reviewer }: { review: Review; reviewer: PublicMember | undefined }) {
  const name = reviewer?.display_name ?? 'Former member';
  return (
    <li className="panel space-y-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={name} path={reviewer?.avatar_path} size="sm" />
          <div className="min-w-0">
            {reviewer ? (
              <Link href={`/u/${reviewer.username}`} className="block truncate text-sm font-semibold hover:text-brand">{name}</Link>
            ) : (
              <span className="block truncate text-sm font-semibold">{name}</span>
            )}
            <p className="t-meta">{review.reviewer_role === 'client' ? 'Client' : 'Freelancer'} · {formatDate(review.created_at)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Stars rating={review.rating} />
          <Badge tone="success"><BadgeCheck aria-hidden /> Verified contract</Badge>
        </div>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-ink-secondary">{review.body}</p>
    </li>
  );
}
