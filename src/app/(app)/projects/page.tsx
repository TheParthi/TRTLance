import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EscrowRail } from '@/components/common/escrow-rail';
import { Ledger, LedgerRow } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { PageHeader } from '@/components/common/page-header';
import { ProjectStatusMark, ProposalStatusMark } from '@/components/common/status-mark';
import { EmptyState } from '@/components/common/states';
import { SubNav } from '@/components/shell/sub-nav';
import { canHire, canWork, requireViewer } from '@/lib/auth';
import { proposalSegments } from '@/lib/escrow-summary';
import { formatRelative } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import type { Project, Proposal, ProposalMilestone } from '@/lib/types';

export const metadata: Metadata = { title: 'Projects' };

type ProposalRow = Proposal & {
  project: Pick<Project, 'id' | 'title' | 'status' | 'budget_amount'> | null;
  milestones: Pick<ProposalMilestone, 'id' | 'position' | 'title' | 'amount'>[];
};

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
      ? supabase.from('proposals').select('*, project:projects(id, title, status, budget_amount), milestones:proposal_milestones(id, position, title, amount)').eq('freelancer_id', viewer.id)
          .order('created_at', { ascending: false }).returns<ProposalRow[]>()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (posted.error || proposals.error) throw posted.error ?? proposals.error;

  const projectGroups = [
    { key: 'open', title: 'Open', description: 'Accepting proposals.', rows: (posted.data ?? []).filter((p) => p.status === 'open') },
    { key: 'draft', title: 'Drafts', description: 'Only you can see these until you publish.', rows: (posted.data ?? []).filter((p) => p.status === 'draft') },
    { key: 'past', title: 'Hired and closed', rows: (posted.data ?? []).filter((p) => !['open', 'draft'].includes(p.status)) },
  ].filter((g) => g.rows.length);

  const proposalGroups = [
    { key: 'pending', title: 'Waiting for the client', rows: (proposals.data ?? []).filter((p) => p.status === 'pending') },
    { key: 'accepted', title: 'Hired', rows: (proposals.data ?? []).filter((p) => p.status === 'accepted') },
    { key: 'closed', title: 'Declined and withdrawn', rows: (proposals.data ?? []).filter((p) => p.status === 'declined' || p.status === 'withdrawn') },
  ].filter((g) => g.rows.length);

  return (
    <>
      <PageHeader
        title={views.length === 1 && view === 'proposals' ? 'Proposals' : 'Projects'}
        description={view === 'posted' ? 'Projects you have posted, from draft to completion.' : 'Proposals you have sent and where they stand.'}
        actions={canHire(viewer) ? <Button asChild><Link href="/projects/new"><Plus /> Post a project</Link></Button> : undefined}
      />
      {views.length > 1 && (
        <SubNav
          label="Project views"
          active={view}
          items={views.map((v) => ({ key: v, href: `/projects?view=${v}`, label: v === 'posted' ? 'Posted projects' : 'My proposals' }))}
        />
      )}

      {view === 'posted' && (
        projectGroups.length ? (
          <div className="space-y-12">
            {projectGroups.map((g) => (
              <Ledger key={g.key} id={`projects-${g.key}`} title={g.title} description={g.description}>
                {g.rows.map((p) => (
                  <LedgerRow
                    key={p.id}
                    className="group"
                    href={p.status === 'draft' ? `/projects/${p.id}/edit` : `/projects/${p.id}`}
                    meta={
                      p.status === 'draft'
                        ? <span>Step {p.draft_step} of 9 · saved {formatRelative(p.updated_at)}</span>
                        : <><span className={p.status === 'open' && p.proposal_count > 0 ? 'font-medium text-ink' : undefined}>{p.proposal_count} proposal{p.proposal_count === 1 ? '' : 's'}</span><span>Posted {formatRelative(p.published_at)}</span></>
                    }
                    trail={
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                          {p.budget_amount ? <Money amount={p.budget_amount} /> : <span className="t-meta">No budget yet</span>}
                          <ProjectStatusMark status={p.status} />
                        </div>
                        <ArrowRight className="row-arrow hidden size-4 text-ink-muted sm:block" aria-hidden />
                      </div>
                    }
                  >
                    <p className="row-title truncate font-medium">{p.title || 'Untitled draft'}</p>
                  </LedgerRow>
                ))}
              </Ledger>
            ))}
          </div>
        ) : (
          <EmptyState title="You haven’t posted a project yet" description="Describe the work and set a budget, then compare proposals side by side." action={{ label: 'Post a project', href: '/projects/new' }} />
        )
      )}

      {view === 'proposals' && (
        proposalGroups.length ? (
          <div className="space-y-12">
            {proposalGroups.map((g) => (
              <Ledger key={g.key} id={`proposals-${g.key}`} title={g.title}>
                {g.rows.map((p) => (
                  <LedgerRow
                    key={p.id}
                    className="group"
                    href={`/projects/${p.project_id}`}
                    meta={<><span>{p.duration_days} days · {p.milestones.length} milestone{p.milestones.length === 1 ? '' : 's'}</span><span>Sent {formatRelative(p.created_at)}</span></>}
                    trail={
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                          <Money amount={p.amount} />
                          <ProposalStatusMark status={p.status} />
                        </div>
                        <ArrowRight className="row-arrow hidden size-4 text-ink-muted sm:block" aria-hidden />
                      </div>
                    }
                  >
                    <p className="row-title truncate font-medium">{p.project?.title ?? 'Project'}</p>
                    {p.milestones.length > 0 && (
                      <EscrowRail segments={proposalSegments(p.milestones)} size="sm" className="mt-2 max-w-md" label={`Your proposal for ${p.project?.title ?? 'this project'}`} />
                    )}
                  </LedgerRow>
                ))}
              </Ledger>
            ))}
          </div>
        ) : (
          <EmptyState title="No proposals yet" description="Find a project that fits your skills and send your first proposal." action={{ label: 'Find work', href: '/work' }} />
        )
      )}
    </>
  );
}
