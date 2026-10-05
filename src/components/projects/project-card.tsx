import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { EscrowRail } from '@/components/common/escrow-rail';
import { Money } from '@/components/common/money';
import { TrustLine } from '@/components/common/trust-signals';
import { proposalSegments } from '@/lib/escrow-summary';
import { experienceLabel } from '@/lib/status';
import { formatRelative } from '@/lib/format';
import type { Category, MilestonePlanItem, ProjectSearchRow } from '@/lib/types';
import { timelineText } from './timeline';

/**
 * A project as a ledger entry: what, for how much, from whom (verified facts only), when, and how
 * the client suggests paying for it. Place inside a `.ledger` list; the title is the link and the whole row is clickable.
 * Pass `plan` (the project's suggested milestones) to draw the milestone rail; without it the rail is left out.
 */
export function ProjectCard({ project, categories, plan }: {
  project: ProjectSearchRow;
  categories: Map<string, Category>;
  plan?: MilestonePlanItem[];
}) {
  const category = project.category ? categories.get(project.category)?.label : null;
  const timeline = timelineText(project.start_date, project.due_date);
  const facts = [
    project.experience_level ? experienceLabel[project.experience_level] : 'Any level',
    timeline === 'Flexible' ? 'Flexible timeline' : timeline,
  ];
  const segments = plan?.length
    ? proposalSegments(plan.map((m, i) => ({ position: i + 1, title: m.title, amount: m.amount })))
    : plan
      ? proposalSegments([{ position: 1, title: 'Whole budget', amount: project.budget_amount }])
      : null;
  return (
    <article className="group relative grid gap-4 px-1 py-5 transition-colors duration-base ease-ledger hover:bg-surface-subtle/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-10">
      <div className="min-w-0 space-y-2">
        <p className="t-label-caps">
          {category ?? 'Uncategorised'}
          <span className="font-normal normal-case tracking-normal"> · {formatRelative(project.published_at)}</span>
        </p>
        <h3 className="text-lg font-semibold leading-snug">
          <Link
            href={`/projects/${project.id}`}
            className="after:absolute after:inset-0 after:rounded focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-focus"
          >
            <span className="row-title inline-block">{project.title}</span>
          </Link>
        </h3>
        <p className="line-clamp-2 max-w-2xl text-sm text-ink-secondary">{project.description}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          {project.skills.slice(0, 4).map((s) => <span key={s} className="text-ink-secondary">#{s}</span>)}
          {facts.map((f) => <span key={f}>{f}</span>)}
        </p>
        {segments && (
          <div className="flex max-w-md items-center gap-3 pt-1">
            <EscrowRail segments={segments} size="sm" className="flex-1" label={`Suggested payment plan for ${project.title}`} />
            <span className="t-meta shrink-0">
              {plan?.length ? `${plan.length} milestone${plan.length === 1 ? '' : 's'} suggested` : 'Freelancer proposes milestones'}
            </span>
          </div>
        )}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
          <Avatar name={project.client_name} path={project.client_avatar} size="xs" />
          <span className="text-xs font-medium">{project.client_name}</span>
          <TrustLine
            role="client"
            stats={{
              email_verified: project.client_email_verified,
              wallet_verified: project.client_wallet_verified,
              funded_as_client: project.client_funded,
              rating_avg: project.client_rating,
              review_count: project.client_reviews,
            }}
          />
        </p>
      </div>
      <div className="flex items-end justify-between gap-3 sm:flex-col sm:items-end">
        <div className="space-y-0.5 sm:text-right">
          <Money amount={project.budget_amount} size="xl" />
          <p className="t-meta">Fixed price · {project.proposal_count} proposal{project.proposal_count === 1 ? '' : 's'}</p>
        </div>
        <span aria-hidden className="inline-flex items-center gap-1 text-sm font-medium text-brand">
          View project <ArrowRight className="row-arrow size-4" />
        </span>
      </div>
    </article>
  );
}
