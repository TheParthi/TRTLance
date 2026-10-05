import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { TrustSignals } from '@/components/common/trust-signals';
import { experienceLabel } from '@/lib/status';
import type { PersonSearchRow } from './people';

export function PersonCard({ person }: { person: PersonSearchRow }) {
  return (
    <article className="panel group relative flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <Avatar name={person.display_name} path={person.avatar_path} size="lg" />
        <div className="min-w-0 space-y-0.5">
          <h3 className="truncate text-base font-semibold leading-snug">
            <Link href={`/u/${person.username}`} className="after:absolute after:inset-0 focus-visible:outline-none group-hover:text-brand">
              {person.display_name}
            </Link>
          </h3>
          <p className="t-meta truncate">
            @{person.username}
            {person.experience_level && ` · ${experienceLabel[person.experience_level]}`}
          </p>
          {person.location && (
            <p className="t-meta flex items-center gap-1"><MapPin className="size-3" aria-hidden />{person.location}</p>
          )}
        </div>
      </div>
      {person.headline && <p className="line-clamp-2 text-sm text-ink-secondary">{person.headline}</p>}
      {person.skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
          {person.skills.slice(0, 6).map((s) => <li key={s} className="rounded bg-surface-sunken px-2 py-0.5 text-xs text-ink-secondary">{s}</li>)}
          {person.skills.length > 6 && <li className="px-1 py-0.5 text-xs text-ink-muted">+{person.skills.length - 6} more</li>}
        </ul>
      )}
      <div className="mt-auto border-t pt-3">
        <TrustSignals
          compact
          role="freelancer"
          stats={{
            email_verified: person.email_verified,
            wallet_verified: person.wallet_verified,
            completed_as_freelancer: person.completed_as_freelancer,
            rating_avg: person.rating_avg,
            review_count: person.review_count,
          }}
        />
      </div>
    </article>
  );
}
