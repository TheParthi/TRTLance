import Link from 'next/link';
import { CalendarDays, Layers, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Money } from '@/components/common/money';
import { TrustSignals } from '@/components/common/trust-signals';
import { experienceLabel } from '@/lib/status';
import { formatDate, formatRelative } from '@/lib/format';
import type { Category, ProjectSearchRow } from '@/lib/types';

export function ProjectCard({ project, categories }: { project: ProjectSearchRow; categories: Map<string, Category> }) {
  const category = project.category ? categories.get(project.category)?.label : null;
  return (
    <article className="panel group relative flex flex-col gap-4 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="t-meta">{category ?? 'Uncategorised'} · Posted {formatRelative(project.published_at)}</p>
          <h3 className="text-base font-semibold leading-snug">
            <Link href={`/projects/${project.id}`} className="after:absolute after:inset-0 focus-visible:outline-none group-hover:text-brand">
              {project.title}
            </Link>
          </h3>
        </div>
        <div className="shrink-0 text-right">
          <Money amount={project.budget_amount} size="lg" />
          <p className="t-meta">Fixed price</p>
        </div>
      </div>
      <p className="line-clamp-2 text-sm text-ink-secondary">{project.description}</p>
      <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
        {project.skills.slice(0, 6).map((s) => (
          <li key={s} className="rounded bg-surface-sunken px-2 py-0.5 text-xs text-ink-secondary">{s}</li>
        ))}
      </ul>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-secondary">
        <div className="flex items-center gap-1.5"><dt className="sr-only">Experience</dt><Layers className="size-3.5 text-ink-muted" aria-hidden /><dd>{project.experience_level ? experienceLabel[project.experience_level] : 'Any level'}</dd></div>
        {project.due_date && <div className="flex items-center gap-1.5"><dt className="sr-only">Due</dt><CalendarDays className="size-3.5 text-ink-muted" aria-hidden /><dd>Due {formatDate(project.due_date)}</dd></div>}
        <div className="flex items-center gap-1.5"><dt className="sr-only">Proposals</dt><Users className="size-3.5 text-ink-muted" aria-hidden /><dd>{project.proposal_count} proposal{project.proposal_count === 1 ? '' : 's'}</dd></div>
      </dl>
      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2 text-sm">
          <Avatar name={project.client_name} path={project.client_avatar} size="xs" />
          <span className="font-medium">{project.client_name}</span>
        </span>
        <TrustSignals
          compact
          role="client"
          stats={{
            email_verified: project.client_email_verified,
            wallet_verified: project.client_wallet_verified,
            funded_as_client: project.client_funded,
            rating_avg: project.client_rating,
            review_count: project.client_reviews,
          }}
        />
      </div>
    </article>
  );
}
