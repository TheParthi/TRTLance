import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bell, CalendarClock, CheckCircle2, Compass, FileSignature, Plus, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Money, MoneyStat } from '@/components/common/money';
import { PageHeader, Section } from '@/components/common/page-header';
import { ContractStatusBadge, DisputeStatusBadge, ProposalStatusBadge } from '@/components/common/status-badge';
import { EmptyState } from '@/components/common/states';
import { NextActionBanner } from '@/components/contracts/next-action-banner';
import { ProjectCard } from '@/components/projects/project-card';
import { canHire, canWork, requireViewer } from '@/lib/auth';
import { getCategories, searchProjects } from '@/lib/data/projects';
import { daysUntil, disputeNumber, formatDate, formatRelative } from '@/lib/format';
import { sumAmounts } from '@/lib/money';
import { nextAction } from '@/lib/next-action';
import { LOCKED_MILESTONE_STATES } from '@/lib/status';
import { createClient } from '@/lib/supabase/server';
import type { Contract, Dispute, Milestone, Notification, Project, Proposal, Review } from '@/lib/types';

export const metadata: Metadata = { title: 'Home' };

type ContractRow = Contract & { milestones: Milestone[]; reviews: Pick<Review, 'reviewer_role'>[]; disputes: Pick<Dispute, 'id' | 'status'>[] };

export default async function DashboardPage() {
  const viewer = await requireViewer('/dashboard');
  const supabase = await createClient();
  const hire = canHire(viewer);
  const work = canWork(viewer);

  const [contractsRes, projectsRes, proposalsRes, disputesRes, notesRes, categories] = await Promise.all([
    supabase.from('contracts').select('*, milestones(*), reviews(reviewer_role), disputes(id, status)').neq('status', 'cancelled').order('created_at', { ascending: false }).returns<ContractRow[]>(),
    hire ? supabase.from('projects').select('*').eq('client_id', viewer.id).in('status', ['draft', 'open']).order('updated_at', { ascending: false }).limit(6).returns<Project[]>() : Promise.resolve({ data: [] as Project[], error: null }),
    work ? supabase.from('proposals').select('*, project:projects(title)').eq('freelancer_id', viewer.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(5).returns<(Proposal & { project: { title: string } | null })[]>() : Promise.resolve({ data: [], error: null }),
    supabase.from('disputes').select('*').neq('status', 'resolved').order('created_at', { ascending: false }).returns<Dispute[]>(),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(5).returns<Notification[]>(),
    getCategories().catch(() => []),
  ]);
  const failed = [contractsRes, projectsRes, proposalsRes, disputesRes, notesRes].some((r) => r.error);
  const contracts = contractsRes.data ?? [];
  const recommendations = work && viewer.profile.skills.length
    ? await searchProjects({ skills: viewer.profile.skills, sort: 'newest' }).then((r) => r.rows.filter((p) => p.client_id !== viewer.id).slice(0, 3)).catch(() => null)
    : null;

  const actions = contracts
    .map((c) => ({ c, role: (c.client_id === viewer.id ? 'client' : 'freelancer') as 'client' | 'freelancer' }))
    .map(({ c, role }) => ({ c, role, a: nextAction(role, c, c.milestones, c.disputes, c.reviews) }))
    .filter(({ a }) => a.tone === 'action' || a.tone === 'alert');

  const myClient = contracts.filter((c) => c.client_id === viewer.id).flatMap((c) => c.milestones);
  const myFreelance = contracts.filter((c) => c.freelancer_id === viewer.id).flatMap((c) => c.milestones);
  const locked = (ms: Milestone[]) => sumAmounts(ms.filter((m) => LOCKED_MILESTONE_STATES.includes(m.status)).map((m) => m.amount));
  const deadlines = contracts
    .flatMap((c) => c.milestones.filter((m) => ['funded', 'revision_requested', 'submitted'].includes(m.status) && m.due_date).map((m) => ({ c, m, days: daysUntil(m.due_date) ?? 0 })))
    .filter((x) => x.days <= 14)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);
  const active = contracts.filter((c) => ['pending_signatures', 'awaiting_funding', 'active', 'disputed'].includes(c.status));
  const catMap = new Map(categories.map((c) => [c.slug, c]));
  const pendingProposalsOnMine = (projectsRes.data ?? []).reduce((n, p) => n + (p.status === 'open' ? p.proposal_count : 0), 0);

  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        title={`Welcome back, ${viewer.profile.display_name.split(' ')[0]}`}
        actions={
          <>
            {work && <Button asChild variant="secondary"><Link href="/work"><Compass /> Find work</Link></Button>}
            {hire && <Button asChild className="sm:hidden"><Link href="/projects/new"><Plus /> Post a project</Link></Button>}
          </>
        }
      />

      {failed && <Callout tone="danger" className="mb-6" title="Some information could not be loaded">Refresh the page to try again. Nothing shown below is estimated.</Callout>}
      {!viewer.wallet && (
        <Callout tone="warning" className="mb-6" title="Verify a wallet before you sign a contract" action={<Button asChild size="sm" variant="secondary"><Link href="/wallet">Verify wallet</Link></Button>}>
          Escrow is funded from, and pays out to, a wallet you prove you own. It takes a minute and costs nothing.
        </Callout>
      )}

      <div className="grid gap-8 xl:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-8">
          <Section title="Action required" description="Things waiting on you, most important first.">
            {actions.length ? (
              <ul className="space-y-3">
                {actions.map(({ c, a }) => (
                  <li key={c.id} className="space-y-1">
                    <p className="t-meta"><Link className="hover:text-ink hover:underline" href={`/contracts/${c.id}`}>{c.title}</Link></p>
                    <NextActionBanner action={{ ...a, target: a.target?.startsWith('/') ? a.target : `/contracts/${c.id}${a.target ?? ''}` }} />
                  </li>
                ))}
                {hire && pendingProposalsOnMine > 0 && (
                  <li>
                    <NextActionBanner action={{ tone: 'action', title: `${pendingProposalsOnMine} proposal${pendingProposalsOnMine === 1 ? '' : 's'} to review`, detail: 'Compare freelancers on your open projects.', target: '/projects' }} />
                  </li>
                )}
              </ul>
            ) : hire && pendingProposalsOnMine > 0 ? (
              <NextActionBanner action={{ tone: 'action', title: `${pendingProposalsOnMine} proposal${pendingProposalsOnMine === 1 ? '' : 's'} to review`, detail: 'Compare freelancers on your open projects.', target: '/projects' }} />
            ) : (
              <div className="panel flex items-center gap-3 p-5 text-sm text-ink-secondary"><CheckCircle2 className="size-5 text-success" aria-hidden /> You’re all caught up.</div>
            )}
          </Section>

          <Section title="Active contracts" action={<Link className="text-sm link" href="/contracts">All contracts</Link>}>
            {active.length ? (
              <ul className="panel divide-y">
                {active.slice(0, 6).map((c) => {
                  const closed = c.milestones.filter((m) => ['paid', 'refunded', 'settled'].includes(m.status)).length;
                  return (
                    <li key={c.id}>
                      <Link href={`/contracts/${c.id}`} className="grid gap-2 p-4 hover:bg-surface-subtle sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{c.title}</span>
                          <span className="t-meta">{c.client_id === viewer.id ? 'You hired' : 'You are working'} · {closed}/{c.milestones.length} milestones closed</span>
                        </span>
                        <Money amount={c.total_amount} size="sm" />
                        <ContractStatusBadge status={c.status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState compact icon={FileSignature} title="No active contracts" description={hire ? 'Hire a freelancer from your project’s proposals to start one.' : 'When a client hires you, the contract appears here.'} />
            )}
          </Section>

          {hire && (
            <Section title="Your open projects" action={<Link className="text-sm link" href="/projects">All projects</Link>}>
              {projectsRes.data?.length ? (
                <ul className="panel divide-y">
                  {projectsRes.data.map((p) => (
                    <li key={p.id}>
                      <Link href={p.status === 'draft' ? `/projects/${p.id}/edit` : `/projects/${p.id}/proposals`} className="flex items-center justify-between gap-4 p-4 hover:bg-surface-subtle">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{p.title || 'Untitled draft'}</span>
                          <span className="t-meta">{p.status === 'draft' ? `Draft · saved ${formatRelative(p.updated_at)}` : `${p.proposal_count} proposal${p.proposal_count === 1 ? '' : 's'}`}</span>
                        </span>
                        <ArrowRight className="size-4 text-ink-muted" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact title="No open projects" description="Post a project to start receiving proposals." action={{ label: 'Post a project', href: '/projects/new' }} />
              )}
            </Section>
          )}

          {work && (
            <Section title="Recommended for you" description={viewer.profile.skills.length ? `Open projects matching your skills: ${viewer.profile.skills.slice(0, 4).join(', ')}` : undefined} action={<Link className="text-sm link" href="/work">Browse all</Link>}>
              {!viewer.profile.skills.length ? (
                <EmptyState compact title="Add skills to get recommendations" description="We match open projects to the skills on your profile." action={{ label: 'Add skills', href: '/settings' }} />
              ) : recommendations === null ? (
                <Callout tone="danger">Recommendations could not be loaded.</Callout>
              ) : recommendations.length ? (
                <ul className="space-y-3">{recommendations.map((p) => <li key={p.id}><ProjectCard project={p} categories={catMap} /></li>)}</ul>
              ) : (
                <EmptyState compact icon={Compass} title="No matching projects right now" description="We’ll show new ones as clients post them." action={{ label: 'Browse all projects', href: '/work' }} />
              )}
            </Section>
          )}
        </div>

        <aside className="space-y-6">
          {(myClient.length > 0 || myFreelance.length > 0) && (
            <section className="panel space-y-4 p-5" aria-labelledby="money-title">
              <h2 id="money-title" className="t-section-title">Money</h2>
              {myClient.length > 0 && <MoneyStat label="Your funds secured in escrow" amount={locked(myClient)} tone="brand" />}
              {myFreelance.length > 0 && <MoneyStat label="In escrow for your work" amount={locked(myFreelance)} tone="brand" />}
              {myFreelance.length > 0 && <MoneyStat label="Earned on TrustLance" amount={sumAmounts(myFreelance.map((m) => m.freelancer_payout ?? '0'))} tone="success" />}
              <Link href="/wallet" className="text-sm link">Open wallet</Link>
            </section>
          )}

          <section className="panel space-y-3 p-5" aria-labelledby="deadlines-title">
            <h2 id="deadlines-title" className="t-section-title flex items-center gap-2"><CalendarClock className="size-4 text-ink-muted" aria-hidden /> Upcoming deadlines</h2>
            {deadlines.length ? (
              <ul className="space-y-3 text-sm">
                {deadlines.map(({ c, m, days }) => (
                  <li key={m.id}>
                    <Link href={`/contracts/${c.id}#milestone-${m.position}`} className="block hover:text-brand">
                      <span className="block truncate font-medium">{m.title}</span>
                      <span className={days < 0 ? 'text-danger-strong' : days <= 2 ? 'text-warning-strong' : 't-meta'}>
                        {days < 0 ? `${-days} days overdue` : days === 0 ? 'Due today' : `Due ${formatDate(m.due_date)} (${days} days)`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-secondary">Nothing due in the next two weeks.</p>}
          </section>

          {work && (
            <section className="panel space-y-3 p-5" aria-labelledby="proposals-title">
              <h2 id="proposals-title" className="t-section-title">Pending proposals</h2>
              {proposalsRes.data?.length ? (
                <ul className="space-y-3 text-sm">
                  {proposalsRes.data.map((p) => (
                    <li key={p.id} className="flex items-start justify-between gap-3">
                      <Link href={`/projects/${p.project_id}`} className="min-w-0 truncate hover:text-brand">{p.project?.title ?? 'Project'}</Link>
                      <ProposalStatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-ink-secondary">No proposals waiting for a decision.</p>}
            </section>
          )}

          {(disputesRes.data?.length ?? 0) > 0 && (
            <section className="panel space-y-3 p-5" aria-labelledby="disputes-title">
              <h2 id="disputes-title" className="t-section-title flex items-center gap-2"><Scale className="size-4 text-danger" aria-hidden /> Open disputes</h2>
              <ul className="space-y-2 text-sm">
                {disputesRes.data!.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <Link className="link" href={d.arbitrator_id === viewer.id ? `/arbitration/cases/${d.id}` : `/disputes/${d.id}`}>{disputeNumber(d.number)}</Link>
                    <DisputeStatusBadge status={d.status} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="panel space-y-3 p-5" aria-labelledby="recent-title">
            <h2 id="recent-title" className="t-section-title flex items-center gap-2"><Bell className="size-4 text-ink-muted" aria-hidden /> Recent activity</h2>
            {notesRes.data?.length ? (
              <ul className="space-y-3 text-sm">
                {notesRes.data.map((n) => (
                  <li key={n.id}>
                    {n.link ? <Link href={n.link} className="block font-medium hover:text-brand">{n.title}</Link> : <span className="block font-medium">{n.title}</span>}
                    <span className="t-meta">{formatRelative(n.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-secondary">No activity yet.</p>}
            <Link href="/notifications" className="text-sm link">All notifications</Link>
          </section>
        </aside>
      </div>
    </>
  );
}
