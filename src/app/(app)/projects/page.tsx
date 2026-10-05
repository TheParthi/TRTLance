import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/common/money';
import { PageHeader } from '@/components/common/page-header';
import { ProjectStatusBadge, ProposalStatusBadge } from '@/components/common/status-badge';
import { EmptyState } from '@/components/common/states';
import { canHire, canWork, requireViewer } from '@/lib/auth';
import { formatRelative } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import type { Project, Proposal } from '@/lib/types';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Projects' };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const viewer = await requireViewer('/projects');
  const { view: requested } = await searchParams;
  const views = [canHire(viewer) && 'posted', canWork(viewer) && 'proposals'].filter(Boolean) as string[];
  const view = views.includes(requested ?? '') ? requested! : views[0];
  const supabase = await createClient();

  const [posted, proposals] = await Promise.all([
    view === 'posted'
      ? supabase.from('projects').select('*').eq('client_id', viewer.id).order('updated_at', { ascending: false }).returns<Project[]>()
      : Promise.resolve({ data: null, error: null }),
    view === 'proposals'
      ? supabase.from('proposals').select('*, project:projects(id, title, status, budget_amount)').eq('freelancer_id', viewer.id)
          .order('created_at', { ascending: false }).returns<(Proposal & { project: Pick<Project, 'id' | 'title' | 'status' | 'budget_amount'> | null })[]>()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (posted.error || proposals.error) throw posted.error ?? proposals.error;

  return (
    <>
      <PageHeader
        title={views.length === 1 && view === 'proposals' ? 'Proposals' : 'Projects'}
        description={view === 'posted' ? 'Projects you have posted, from draft to completion.' : 'Proposals you have sent and where they stand.'}
        actions={canHire(viewer) ? <Button asChild><Link href="/projects/new"><Plus /> Post a project</Link></Button> : undefined}
      />
      {views.length > 1 && (
        <nav aria-label="Project views" className="mb-6 flex gap-1 border-b">
          {views.map((v) => (
            <Link key={v} href={`/projects?view=${v}`} aria-current={v === view ? 'page' : undefined}
              className={cn('-mb-px border-b-2 px-3 py-2 text-sm font-medium', v === view ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
              {v === 'posted' ? 'Posted projects' : 'My proposals'}
            </Link>
          ))}
        </nav>
      )}

      {view === 'posted' && (
        posted.data?.length ? (
          <ul className="panel divide-y">
            {posted.data.map((p) => (
              <li key={p.id}>
                <Link href={p.status === 'draft' ? `/projects/${p.id}/edit` : `/projects/${p.id}`} className="grid gap-2 p-4 hover:bg-surface-subtle sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.title || 'Untitled draft'}</span>
                    <span className="t-meta">{p.status === 'draft' ? `Draft · step ${p.draft_step} of 9 · saved ${formatRelative(p.updated_at)}` : `${p.proposal_count} proposal${p.proposal_count === 1 ? '' : 's'} · posted ${formatRelative(p.published_at)}`}</span>
                  </span>
                  {p.budget_amount ? <Money amount={p.budget_amount} size="sm" /> : <span className="t-meta">No budget yet</span>}
                  <ProjectStatusBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Briefcase} title="You haven’t posted a project yet" description="Describe the work, set a budget, and compare proposals from freelancers." action={{ label: 'Post a project', href: '/projects/new' }} />
        )
      )}

      {view === 'proposals' && (
        proposals.data?.length ? (
          <ul className="panel divide-y">
            {proposals.data.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.project_id}`} className="grid gap-2 p-4 hover:bg-surface-subtle sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.project?.title ?? 'Project'}</span>
                    <span className="t-meta">{p.duration_days} days · sent {formatRelative(p.created_at)}</span>
                  </span>
                  <Money amount={p.amount} size="sm" />
                  <ProposalStatusBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Send} title="No proposals yet" description="Find a project that fits your skills and send your first proposal." action={{ label: 'Find work', href: '/work' }} />
        )
      )}
    </>
  );
}
