import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Money } from '@/components/common/money';
import { TrustLine } from '@/components/common/trust-signals';
import { experienceLabel } from '@/lib/status';
import { formatDate, formatRelative } from '@/lib/format';
import type { Category, ProjectSearchRow } from '@/lib/types';

/**
 * A project as a ledger entry: what, for how much, from whom (verified facts only), and how busy it is.
 * Place inside a `.ledger` list; the title is the link and the whole row is clickable.
 */
export function ProjectCard({ project, categories }: { project: ProjectSearchRow; categories: Map<string, Category> }) {
  const category = project.category ? categories.get(project.category)?.label : null;
  const facts = [
    project.experience_level ? experienceLabel[project.experience_level] : 'Any level',
    project.milestone_count ? `${project.milestone_count} milestones suggested` : null,
    project.due_date ? `Due ${formatDate(project.due_date)}` : null,
  ].filter(Boolean);
  return (
    <article className="group relative grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:gap-8">
      <div className="min-w-0 space-y-2">
        <p className="t-meta">{category ?? 'Uncategorised'} · {formatRelative(project.published_at)}</p>
        <h3 className="text-lg font-semibold leading-snug">
          <Link href={`/projects/${project.id}`} className="after:absolute after:inset-0 group-hover:text-brand focus-visible:outline-none">
            {project.title}
          </Link>
        </h3>
        <p className="line-clamp-2 max-w-2xl text-sm text-ink-secondary">{project.description}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          {project.skills.slice(0, 5).map((s) => <span key={s} className="text-ink-secondary">#{s}</span>)}
          {facts.map((f) => <span key={f}>{f}</span>)}
        </p>
        <p className="flex flex-wrap items-center gap-2 pt-1">
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
      <div className="flex items-baseline gap-3 sm:block sm:space-y-1 sm:text-right">
        <Money amount={project.budget_amount} size="xl" />
        <p className="t-meta">Fixed price · {project.proposal_count} proposal{project.proposal_count === 1 ? '' : 's'}</p>
      </div>
    </article>
  );
}
