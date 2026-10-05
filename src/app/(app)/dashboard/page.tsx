import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { EscrowRail } from '@/components/common/escrow-rail';
import { Ledger, LedgerRow } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { ContractStatusBadge } from '@/components/common/status-badge';
import { EscrowStatement } from '@/components/common/statement';
import { ProjectCard } from '@/components/projects/project-card';
import { canHire, canWork, requireViewer } from '@/lib/auth';
import { getCategories, getMembers, searchProjects } from '@/lib/data/projects';
import { milestoneSegments } from '@/lib/escrow-summary';
import { daysUntil, disputeNumber, formatDate, formatRelative } from '@/lib/format';
import { formatAmount, sumAmounts } from '@/lib/money';
import { nextAction, type NextAction } from '@/lib/next-action';
import { LOCKED_MILESTONE_STATES } from '@/lib/status';
import { createClient } from '@/lib/supabase/server';
import type { Contract, Dispute, Milestone, Notification, Project, Proposal, Review } from '@/lib/types';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Home' };

type ContractRow = Contract & { milestones: Milestone[]; reviews: Pick<Review, 'reviewer_role'>[]; disputes: Pick<Dispute, 'id' | 'status'>[] };

function greeting() {
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const ctaFor = (a: NextAction) => (a.tone === 'alert' ? 'Open case' : a.tone === 'action' ? 'Go' : 'View');

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
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(12).returns<Notification[]>(),
    getCategories().catch(() => []),
  ]);
  const failed = [contractsRes, projectsRes, proposalsRes, disputesRes, notesRes].some((r) => r.error);
  const contracts = contractsRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const proposals = proposalsRes.data ?? [];
  const isNew = !failed && contracts.length === 0 && projects.length === 0 && proposals.length === 0;
  const catMap = new Map(categories.map((c) => [c.slug, c]));

  const members = await getMembers(contracts.map((c) => (c.client_id === viewer.id ? c.freelancer_id : c.client_id)));

  // What needs this member, most urgent first.
  const queue: { key: string; href: string; title: string; context: string; detail: string; tone: 'brand' | 'danger' | 'warning'; cta: string }[] = [];
  if (!viewer.wallet) {
    queue.push({ key: 'wallet', href: '/wallet', title: 'Verify your wallet', context: 'Account', detail: 'Needed before you can sign or fund a contract. Free, takes a minute.', tone: 'warning', cta: 'Verify' });
  }
  const actions = contracts
    .map((c) => ({ c, a: nextAction(c.client_id === viewer.id ? 'client' : 'freelancer', c, c.milestones, c.disputes, c.reviews) }))
    .filter(({ a }) => a.tone === 'action' || a.tone === 'alert')
    .sort((x, y) => (x.a.tone === 'alert' ? -1 : 0) - (y.a.tone === 'alert' ? -1 : 0));
  for (const { c, a } of actions) {
    queue.push({
      key: c.id,
      href: a.target?.startsWith('/') ? a.target : `/contracts/${c.id}${a.target ?? ''}`,
      title: a.title,
      context: c.title,
      detail: a.detail,
      tone: a.tone === 'alert' ? 'danger' : 'brand',
      cta: ctaFor(a),
    });
  }
  for (const p of projects.filter((p) => p.status === 'open' && p.proposal_count > 0)) {
    queue.push({ key: p.id, href: `/projects/${p.id}/proposals`, title: `${p.proposal_count} proposal${p.proposal_count === 1 ? '' : 's'} to compare`, context: p.title, detail: 'Compare price, timeline, milestones and verified track record.', tone: 'brand', cta: 'Compare' });
  }

  const asClient = contracts.filter((c) => c.client_id === viewer.id).flatMap((c) => c.milestones);
  const asFreelancer = contracts.filter((c) => c.freelancer_id === viewer.id).flatMap((c) => c.milestones);
  const locked = (ms: Milestone[]) => sumAmounts(ms.filter((m) => LOCKED_MILESTONE_STATES.includes(m.status)).map((m) => m.amount));
  const active = contracts.filter((c) => ['pending_signatures', 'awaiting_funding', 'active', 'disputed'].includes(c.status));
  const deadlines = contracts
    .flatMap((c) => c.milestones.filter((m) => ['funded', 'revision_requested', 'submitted'].includes(m.status) && m.due_date).map((m) => ({ c, m, days: daysUntil(m.due_date) ?? 0 })))
    .filter((x) => x.days <= 14)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  const recommendations = work
    ? await searchProjects({ skills: viewer.profile.skills.length && !isNew ? viewer.profile.skills : undefined, sort: 'newest' })
        .then((r) => r.rows.filter((p) => p.client_id !== viewer.id).slice(0, isNew ? 5 : 3)).catch(() => null)
    : null;

  const stateLine = [
    queue.length ? `${queue.length} thing${queue.length === 1 ? '' : 's'} need${queue.length === 1 ? 's' : ''} you` : 'Nothing needs you right now',
    asClient.length ? `${formatAmount(locked(asClient))} of your money secured in escrow` : null,
    asFreelancer.length ? `${formatAmount(locked(asFreelancer))} in escrow for your work` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <p className="t-label-caps">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}</p>
        <h1 className="t-page-title">{greeting()}, {viewer.profile.display_name.split(' ')[0]}</h1>
        <p className="text-ink-secondary">{stateLine}</p>
      </header>

      {failed && <Callout tone="danger" title="Some information could not be loaded">Refresh the page to try again. Nothing shown below is estimated.</Callout>}

      {isNew ? (
        <GettingStarted viewer={viewer} hire={hire} work={work} />
      ) : (
        <Ledger
          id="next-up"
          title="Next up"
          description="Everything waiting on you, most urgent first."
          empty={<p className="flex items-center gap-2 border-y py-5 text-sm text-ink-secondary"><Check className="size-4 text-success" aria-hidden /> You’re all caught up.</p>}
        >
          {queue.map((q, i) => (
            <LedgerRow
              key={q.key}
              href={q.href}
              tone={q.tone}
              lead={<span className={cn('flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums', q.tone === 'danger' ? 'bg-danger-soft text-danger-strong' : q.tone === 'warning' ? 'bg-warning-soft text-warning-strong' : 'bg-brand-soft text-brand-strong')}>{i + 1}</span>}
              meta={<span>{q.detail}</span>}
              trail={<span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">{q.cta} <ArrowRight className="size-4" aria-hidden /></span>}
            >
              <p className="font-semibold">{q.title}</p>
              <p className="truncate text-sm text-ink-secondary">{q.context}</p>
            </LedgerRow>
          ))}
        </Ledger>
      )}

      {!isNew && (
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 space-y-12">
            <Ledger
              id="contracts"
              title="Contracts"
              action={<Link className="link" href="/contracts">All contracts</Link>}
              empty={<p className="border-y py-5 text-sm text-ink-secondary">{hire ? 'Hire from your project’s proposals to start a contract.' : 'When a client hires you, the contract appears here.'}</p>}
            >
              {active.slice(0, 6).map((c) => {
                const other = members.get(c.client_id === viewer.id ? c.freelancer_id : c.client_id);
                const closed = c.milestones.filter((m) => ['paid', 'refunded', 'settled'].includes(m.status)).length;
                return (
                  <LedgerRow
                    key={c.id}
                    href={`/contracts/${c.id}`}
                    meta={<><span>{c.client_id === viewer.id ? 'You hired' : 'Client'} {other?.display_name ?? 'member'}</span><span>{closed} of {c.milestones.length} milestones closed</span></>}
                    trail={<div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5"><Money amount={c.total_amount} /><ContractStatusBadge status={c.status} /></div>}
                  >
                    <p className="truncate font-medium">{c.title}</p>
                    <EscrowRail segments={milestoneSegments(c.milestones)} size="sm" className="mt-2 max-w-md" label={c.title} />
                  </LedgerRow>
                );
              })}
            </Ledger>

            {hire && (
              <Ledger
                id="projects"
                title="Your projects"
                action={<Link className="link" href="/projects">All projects</Link>}
                empty={<p className="border-y py-5 text-sm text-ink-secondary">No open projects. <Link className="link" href="/projects/new">Post one</Link>.</p>}
              >
                {projects.map((p) => (
                  <LedgerRow
                    key={p.id}
                    href={p.status === 'draft' ? `/projects/${p.id}/edit` : `/projects/${p.id}`}
                    meta={<span>{p.status === 'draft' ? `Draft · step ${p.draft_step} of 9 · saved ${formatRelative(p.updated_at)}` : `Open · ${p.proposal_count} proposal${p.proposal_count === 1 ? '' : 's'}`}</span>}
                    trail={p.budget_amount ? <Money amount={p.budget_amount} /> : <span className="t-meta">No budget yet</span>}
                  >
                    <p className="truncate font-medium">{p.title || 'Untitled draft'}</p>
                  </LedgerRow>
                ))}
              </Ledger>
            )}

            {work && (
              <Ledger
                id="recommended"
                title="Recommended for you"
                description={viewer.profile.skills.length ? `Open projects that match ${viewer.profile.skills.slice(0, 4).join(', ')}` : 'Add skills to your profile for better matches.'}
                action={<Link className="link" href="/work">Find work</Link>}
                empty={<p className="border-y py-5 text-sm text-ink-secondary">{recommendations === null ? 'Recommendations could not be loaded.' : 'No matching open projects right now.'} <Link className="link" href="/work">Browse all projects</Link></p>}
              >
                {(recommendations ?? []).map((p) => <li key={p.id}><ProjectCard project={p} categories={catMap} /></li>)}
              </Ledger>
            )}
          </div>

          <aside className="space-y-10">
            {asClient.length > 0 && (
              <EscrowStatement compact aggregate title="Your escrow as a client" milestones={asClient} note={<Link className="link" href="/wallet">Wallet</Link>} />
            )}
            {asFreelancer.length > 0 && (
              <EscrowStatement compact aggregate title="Escrow for your work" milestones={asFreelancer} note={<Link className="link" href="/wallet">Wallet</Link>} />
            )}

            <Ledger title={<span className="t-label-caps">Due in the next two weeks</span>} empty={<p className="border-y py-4 text-sm text-ink-secondary">Nothing due soon.</p>}>
              {deadlines.map(({ c, m, days }) => (
                <LedgerRow key={m.id} href={`/contracts/${c.id}#milestone-${m.position}`} meta={<span className={days < 0 ? 'text-danger-strong' : days <= 2 ? 'text-warning-strong' : undefined}>{days < 0 ? `${-days} days overdue` : days === 0 ? 'Due today' : `${formatDate(m.due_date)} · ${days} days`}</span>}>
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <p className="truncate text-xs text-ink-muted">{c.title}</p>
                </LedgerRow>
              ))}
            </Ledger>

            {work && proposals.length > 0 && (
              <Ledger title={<span className="t-label-caps">Proposals waiting</span>}>
                {proposals.map((p) => (
                  <LedgerRow key={p.id} href={`/projects/${p.project_id}`} meta={<span>Sent {formatRelative(p.created_at)}</span>} trail={<Money amount={p.amount} size="sm" />}>
                    <p className="truncate text-sm font-medium">{p.project?.title ?? 'Project'}</p>
                  </LedgerRow>
                ))}
              </Ledger>
            )}

            {(disputesRes.data?.length ?? 0) > 0 && (
              <Ledger title={<span className="t-label-caps">Open disputes</span>}>
                {disputesRes.data!.map((d) => (
                  <LedgerRow key={d.id} tone="danger" href={d.arbitrator_id === viewer.id ? `/arbitration/cases/${d.id}` : `/disputes/${d.id}`} meta={<span>Opened {formatRelative(d.created_at)}</span>} trail={<Money amount={d.amount} size="sm" />}>
                    <p className="text-sm font-medium">{disputeNumber(d.number)}</p>
                  </LedgerRow>
                ))}
              </Ledger>
            )}

            <Ledger title={<span className="t-label-caps">Recent activity</span>} action={<Link className="link text-xs" href="/notifications">All</Link>} empty={<p className="border-y py-4 text-sm text-ink-secondary">No activity yet.</p>}>
              {groupNotifications(notesRes.data ?? []).map(({ n, count }) => (
                <LedgerRow key={n.id} href={n.link ?? '/notifications'} meta={<span>{formatRelative(n.created_at)}</span>}>
                  <p className={cn('text-sm', n.read_at ? 'text-ink-secondary' : 'font-medium')}>
                    {n.title}{count > 1 && <span className="ml-1 text-ink-muted">×{count}</span>}
                  </p>
                </LedgerRow>
              ))}
            </Ledger>
          </aside>
        </div>
      )}

      {isNew && work && (
        <Ledger id="open-work" title="Open projects right now" action={<Link className="link" href="/work">Browse all</Link>} empty={<p className="border-y py-5 text-sm text-ink-secondary">No open projects yet — check back soon.</p>}>
          {(recommendations ?? []).map((p) => <li key={p.id}><ProjectCard project={p} categories={catMap} /></li>)}
        </Ledger>
      )}
    </div>
  );
}

/** Collapses consecutive notifications of the same kind about the same thing ("New proposal … ×3"). */
function groupNotifications(list: Notification[]) {
  const out: { n: Notification; count: number }[] = [];
  for (const n of list) {
    const last = out[out.length - 1];
    if (last && last.n.type === n.type && last.n.link === n.link) last.count++;
    else out.push({ n, count: 1 });
  }
  return out.slice(0, 5);
}

/** First-run checklist instead of empty boxes. Each step reflects real account state. */
function GettingStarted({ viewer, hire, work }: { viewer: Awaited<ReturnType<typeof requireViewer>>; hire: boolean; work: boolean }) {
  const steps = [
    { done: Boolean(viewer.profile.headline && viewer.profile.skills.length), title: 'Complete your profile', detail: 'A headline and skills help the right people find you.', href: '/settings', cta: 'Edit profile' },
    { done: Boolean(viewer.wallet), title: 'Verify your wallet', detail: 'Prove you own a wallet by signing a free message. Needed to sign or fund contracts.', href: '/wallet', cta: 'Verify wallet' },
    ...(hire ? [{ done: false, title: 'Post your first project', detail: 'Describe the work and budget. You fund escrow only after you hire.', href: '/projects/new', cta: 'Post a project' }] : []),
    ...(work ? [{ done: false, title: 'Send your first proposal', detail: 'Pick an open project below and propose your own milestones.', href: '/work', cta: 'Find work' }] : []),
  ];
  const done = steps.filter((s) => s.done).length;
  return (
    <Ledger id="start" title="Get started" description={`${done} of ${steps.length} done`}>
      {steps.map((s) => (
        <LedgerRow
          key={s.title}
          lead={s.done ? <Check className="size-5 text-success" aria-label="Done" /> : <Circle className="size-5 text-line-strong" aria-label="To do" />}
          meta={<span>{s.detail}</span>}
          trail={!s.done && <Button asChild size="sm" variant="secondary"><Link href={s.href}>{s.cta}</Link></Button>}
        >
          <p className={cn('font-medium', s.done && 'text-ink-muted line-through')}>{s.title}</p>
        </LedgerRow>
      ))}
    </Ledger>
  );
}
