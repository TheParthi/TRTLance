import Link from 'next/link';
import { Stars } from '@/components/common/trust-signals';
import type { PublicMember } from '@/lib/data/projects';
import { formatDate } from '@/lib/format';
import type { ProfileStats, Review } from '@/lib/types';
import { ProfileSection, VerifiedContractMark } from './sections';

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
    <ProfileSection id="reviews" title="Reviews" note="Written by the other party after a contract on TrustLance">
      {count === 0 || reviews.length === 0 ? (
        <div className="space-y-1">
          <p className="font-medium">No reviews yet</p>
          <p className="text-sm text-ink-secondary">Reviews appear here after {name} completes a contract and the other party leaves feedback.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
            <div className="shrink-0 space-y-1">
              <p className="flex items-baseline gap-2">
                <span className="t-money text-3xl">{avg !== null ? avg.toFixed(1) : '—'}</span>
                <span className="text-sm text-ink-muted">out of 5</span>
              </p>
              {avg !== null && <Stars rating={avg} label={`Average ${avg.toFixed(1)} out of 5 stars`} />}
              <p className="t-meta">{count} review{count === 1 ? '' : 's'}</p>
            </div>
            {groups.map((g) => (
              <div key={g.role} className="min-w-0 max-w-xs flex-1 space-y-2">
                <p className="t-label-caps">{g.title}</p>
                <dl className="space-y-1.5">
                  {g.items.map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                      <dt className="text-ink-secondary">{label(item.key)}</dt>
                      <dd className="flex items-center gap-2">
                        <Stars rating={item.avg} label={`${label(item.key)}: ${item.avg.toFixed(1)} out of 5`} />
                        <span className="w-7 text-right font-mono text-xs text-ink-secondary">{item.avg.toFixed(1)}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          {count > reviews.length && <p className="t-meta">Category scores and the list below cover the {limit} most recent reviews.</p>}
          <ul className="divide-y border-t">
            {reviews.map((r) => <ReviewRow key={r.id} review={r} reviewer={reviewers.get(r.reviewer_id)} />)}
          </ul>
        </div>
      )}
    </ProfileSection>
  );
}

function ReviewRow({ review, reviewer }: { review: Review; reviewer: PublicMember | undefined }) {
  const name = reviewer?.display_name ?? 'Former member';
  return (
    <li className="space-y-2 py-5 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Stars rating={review.rating} />
        <p className="text-sm">
          {reviewer ? (
            <Link href={`/u/${reviewer.username}`} className="font-semibold hover:text-brand-strong hover:underline">{name}</Link>
          ) : (
            <span className="font-semibold">{name}</span>
          )}
          <span className="text-ink-muted"> · {review.reviewer_role === 'client' ? 'Client' : 'Freelancer'} · {formatDate(review.created_at)}</span>
        </p>
        <VerifiedContractMark />
      </div>
      <p className="max-w-prose whitespace-pre-line text-sm leading-relaxed text-ink-secondary">{review.body}</p>
    </li>
  );
}
