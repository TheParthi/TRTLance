import { ArrowRight, MapPin } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { LedgerRow } from '@/components/common/ledger';
import { TrustLine } from '@/components/common/trust-signals';
import { experienceLabel } from '@/lib/status';
import type { PersonSearchRow } from './people';

/** A freelancer as a ledger row: who, what they do, verified facts only. The whole row opens the profile. */
export function PersonRow({ person }: { person: PersonSearchRow }) {
  return (
    <LedgerRow
      href={`/u/${person.username}`}
      className="group flex-row items-start gap-4 sm:items-start"
      lead={<Avatar name={person.display_name} path={person.avatar_path} size="md" />}
      meta={
        <>
          {person.skills.slice(0, 5).map((s) => <span key={s} className="text-ink-secondary">#{s}</span>)}
          {person.skills.length > 5 && <span>+{person.skills.length - 5} more</span>}
          <TrustLine
            role="freelancer"
            stats={{
              email_verified: person.email_verified,
              identity_verified: person.identity_verified,
              completed_as_freelancer: person.completed_as_freelancer,
              rating_avg: person.rating_avg,
              review_count: person.review_count,
            }}
          />
        </>
      }
      trail={<ArrowRight className="row-arrow mt-1 hidden size-4 text-ink-muted sm:block" aria-hidden />}
    >
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="row-title inline-block font-medium">{person.display_name}</span>
        <span className="t-meta">
          @{person.username}
          {person.experience_level && ` · ${experienceLabel[person.experience_level]}`}
        </span>
        {person.location && <span className="t-meta inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden />{person.location}</span>}
      </p>
      {person.headline && <p className="mt-0.5 line-clamp-2 text-sm text-ink-secondary">{person.headline}</p>}
    </LedgerRow>
  );
}
