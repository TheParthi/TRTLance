import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, Circle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { EscrowRail } from '@/components/common/escrow-rail';
import { Ledger, LedgerRow } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { ContractStatusMark } from '@/components/common/status-mark';
import { EscrowStatement } from '@/components/common/statement';
import { MoneyRing, type RingState } from '@/components/common/money-ring';
import { PageHeader } from '@/components/common/page-header';
import { ProjectCard } from '@/components/projects/project-card';
import { canHire, canWork, requireViewer } from '@/lib/auth';
import { getCategories, getMembers, getMilestonePlans, searchProjects } from '@/lib/data/projects';
import { milestoneSegments, stateSegments } from '@/lib/escrow-summary';
import { daysUntil, disputeNumber, formatDate, formatRelative } from '@/lib/format';
import { formatAmount, sumAmounts } from '@/lib/money';
import { nextAction, type NextAction } from '@/lib/next-action';
import { LOCKED_MILESTONE_STATES } from '@/lib/status';
import { createClient } from '@/lib/supabase/server';
import type { Contract, Dispute, Milestone, Notification, Project, Proposal, Review } from '@/lib/types';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Home' };

type ContractRow = Contract & { milestones: Milestone[]; reviews: Pick<Review, 'reviewer_role'>[]; disputes: Pick<Dispute, 'id' | 'status'>[] };

type QueueItem = {
  key: string;
  href: string;
  /** What the row is about — a contract or project name, never "Your move". */
  subject: string;
  counterparty?: string;
  title: string;
  detail: string;
  due?: string | null;
  tone: 'brand' | 'danger' | 'warning';
  cta: string;
};

const ctaFor = (a: NextAction) => a.cta ?? (a.tone === 'alert' ? 'Open the case' : 'Open contract');
const pad = (n: number) => String(n).padStart(2, '0');

function dueLabel(due: string | null | undefined) {
  const days = daysUntil(due);
  if (days === null || !due) return null;
  return days < 0 ? `${-days} day${days === -1 ? '' : 's'} overdue` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due ${formatDate(due, 'd MMM')}`;
}

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
  const queue: QueueItem[] = [];
  if (!viewer.wallet) {
    queue.push({ key: 'wallet', href: '/wallet', subject: 'Your account', title: 'Verify your wallet', detail: 'Needed before you can sign or fund a contract. Free, takes a minute.', tone: 'warning', cta: 'Verify wallet' });
  }
  const actions = contracts
    .map((c) => ({ c, a: nextAction(c.client_id === viewer.id ? 'client' : 'freelancer', c, c.milestones, c.disputes, c.reviews) }))
    .filter(({ a }) => a.tone === 'action' || a.tone === 'alert')
    .sort((x, y) => (x.a.tone === 'alert' ? -1 : 0) - (y.a.tone === 'alert' ? -1 : 0));
  for (const { c, a } of actions) {
    const other = members.get(c.client_id === viewer.id ? c.freelancer_id : c.client_id);
    queue.push({
      key: c.id,
      href: a.target?.startsWith('/') ? a.target : `/contracts/${c.id}${a.target ?? ''}`,
      subject: c.title,
      counterparty: other ? `${c.client_id === viewer.id ? 'Freelancer' : 'Client'} · ${other.display_name}` : undefined,
      title: a.title,
      detail: a.detail,
      due: a.milestoneId ? c.milestones.find((m) => m.id === a.milestoneId)?.due_date : null,
      tone: a.tone === 'alert' ? 'danger' : 'brand',
      cta: ctaFor(a),
    });
  }
  for (const p of projects.filter((p) => p.status === 'open' && p.proposal_count > 0)) {
    queue.push({ key: p.id, href: `/projects/${p.id}/proposals`, subject: p.title, title: `${p.proposal_count} proposal${p.proposal_count === 1 ? '' : 's'} to compare`, detail: 'Compare price, timeline, milestones and verified track record side by side.', tone: 'brand', cta: 'Compare proposals' });
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

  const openWork = (skills?: string[]) => searchProjects({ skills, sort: 'newest' })
    .then((r) => r.rows.filter((p) => p.client_id !== viewer.id).slice(0, isNew ? 5 : 3)).catch(() => null);
  const skilled = Boolean(viewer.profile.skills.length && !isNew);
  let recommendations = work ? await openWork(skilled ? viewer.profile.skills : undefined) : null;
  // Never say "no matching projects" while relevant open work exists: fall back to the newest.
  let matched = skilled;
  if (work && skilled && recommendations?.length === 0) {
    recommendations = await openWork();
    matched = false;
  }
  const plans = await getMilestonePlans((recommendations ?? []).map((p) => p.id)).catch(() => new Map());

  const stateLine = isNew ? 'A few steps and you’re ready for your first contract.' : [
    queue.length ? `${queue.length} thing${queue.length === 1 ? '' : 's'} need${queue.length === 1 ? 's' : ''} you` : 'Nothing needs you right now',
    asClient.length ? `${formatAmount(locked(asClient))} of your money secured in escrow` : null,
    asFreelancer.length ? `${formatAmount(locked(asFreelancer))} in escrow for your work` : null,
  ].filter(Boolean).join(' · ');


  const first = viewer.profile.display_name.split(' ')[0];
  // Everything this member has in contracts, by money state, for the ring.
  const ringParts = stateSegments([...asClient, ...asFreelancer])
    .filter((seg) => seg.parts[0].state !== 'proposed')
    .map((seg) => ({ amount: Number(seg.parts[0].amount) || 0, state: seg.parts[0].state as RingState }));
  const disputes = disputesRes.data ?? [];

  return (
    <div className="space-y-12 md:space-y-16">
      <PageHeader
        className="mb-0 md:mb-0"
        eyebrow={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}
        title={`${isNew ? 'Welcome' : 'Welcome back'}, ${first}`}
        description={stateLine}
        aside={
          <MoneyRing
            className="-mx-4 h-[260px] sm:h-[320px] lg:mx-0 lg:h-[400px]"
            parts={ringParts.length ? ringParts : [{ amount: 1, state: 'unfunded' }]}
            readout={ringParts.length
              ? { label: 'Your escrow', state: `${active.length} live contract${active.length === 1 ? '' : 's'}`, amount: `${formatAmount(sumAmounts([locked(asClient), locked(asFreelancer)]))} held` }
              : { label: 'Your escrow', state: 'Nothing in escrow yet', amount: formatAmount('0') }}
          />
        }
      />

      {failed && <Callout tone="danger" title="Some information could not be loaded">Refresh the page to try again. Nothing shown below is estimated.</Callout>}

      {isNew ? (
        <GettingStarted viewer={viewer} hire={hire} work={work} />
      ) : (
        <section aria-labelledby="next-up-title" className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="next-up-title" className="t-label-caps">Next up</h2>
            {queue.length > 0 && <p className="t-meta">Most urgent first</p>}
          </div>
          {queue.length ? (
            <ol className="ledger">
              {queue.map((q, i) => (
                <li key={q.key}>
                  <Link href={q.href} className="ledger-row-link group grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-3 px-1 py-5 focus-visible:ring-inset sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-6">
                    <span className={cn('t-mono pt-0.5 text-sm sm:self-start', q.tone === 'danger' ? 'text-danger-strong' : q.tone === 'warning' ? 'text-warning-strong' : 'text-ink-muted')}>{pad(i + 1)}</span>
                    <div className="min-w-0 space-y-1">
                      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <span className="truncate text-2xs font-semibold uppercase tracking-[0.12em] text-ink">{q.subject}</span>
                        {q.counterparty && <span className="text-xs text-ink-muted">{q.counterparty}</span>}
                      </p>
                      <p className={cn('row-title text-base font-semibold md:text-lg', q.tone === 'danger' && 'text-danger-strong')}>{q.title}</p>
                      <p className="max-w-reading text-sm text-ink-secondary">{q.detail}</p>
                      {dueLabel(q.due) && <p className={cn('t-meta', (daysUntil(q.due) ?? 1) <= 0 && 'font-medium text-danger-strong')}>{dueLabel(q.due)}</p>}
                    </div>
                    <span className={cn(
                      'col-start-2 justify-self-start sm:col-start-3 sm:justify-self-end',
                      i === 0 ? buttonVariants({ variant: q.tone === 'danger' ? 'danger' : 'primary', size: 'sm' }) : 'inline-flex items-center gap-1 text-sm font-semibold text-brand',
                    )}>
                      {q.cta} <ArrowRight className={cn('size-4', i > 0 && 'transition-transform duration-base ease-ledger group-hover:translate-x-0.5')} aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="flex items-center gap-2 border-y py-5 text-sm text-ink-secondary"><Check className="size-4 text-success" aria-hidden /> You’re all caught up. Nothing is waiting on you.</p>
          )}
        </section>
      )}

      {!isNew && (
        <div className="flex flex-col gap-12 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-14">
          {/* On phones the two columns interleave so money comes right after contracts. */}
          <div className="contents lg:block lg:min-w-0 lg:space-y-12">
            <Ledger
              id="contracts"
              className="order-1"
              title={<span className="t-label-caps">Contracts</span>}
              action={<Link className="link" href="/contracts">All contracts</Link>}
              empty={<EmptyLine>{hire ? 'Hire from your project’s proposals to start a contract.' : 'When a client hires you, the contract appears here.'}</EmptyLine>}
            >
              {active.slice(0, 6).map((c) => {
                const mine = c.client_id === viewer.id;
                const other = members.get(mine ? c.freelancer_id : c.client_id);
                const a = nextAction(mine ? 'client' : 'freelancer', c, c.milestones, c.disputes, c.reviews);
                return (
                  <li key={c.id}>
                    <Link href={`/contracts/${c.id}`} className="ledger-row-link group grid gap-3 px-1 py-5 focus-visible:ring-inset sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-8">
                      <div className="min-w-0 space-y-2">
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="row-title truncate font-semibold">{c.title}</span>
                          <ContractStatusMark status={c.status} />
                        </p>
                        <p className="text-xs text-ink-muted">{mine ? 'Freelancer' : 'Client'} · {other?.display_name ?? 'member'}</p>
                        <EscrowRail segments={milestoneSegments(c.milestones)} size="sm" className="max-w-md pt-1" label={c.title} />
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center sm:gap-1.5">
                        <Money amount={c.total_amount} />
                        <span className={cn('inline-flex items-center gap-1 text-xs', a.tone === 'action' ? 'font-semibold text-brand' : a.tone === 'alert' ? 'font-semibold text-danger-strong' : 'text-ink-muted')}>
                          {a.tone === 'action' || a.tone === 'alert' ? a.cta ?? a.title : a.title}
                          <ArrowRight className="row-arrow size-3.5" aria-hidden />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </Ledger>

            {hire && (
              <Ledger
                id="projects"
                className="order-4"
                title={<span className="t-label-caps">Your projects</span>}
                action={<Link className="link" href="/projects">All projects</Link>}
                empty={<EmptyLine>No open projects. <Link className="link" href="/projects/new">Post one</Link> — you fund escrow only after you hire.</EmptyLine>}
              >
                {projects.map((p) => (
                  <LedgerRow
                    key={p.id}
                    href={p.status === 'draft' ? `/projects/${p.id}/edit` : `/projects/${p.id}`}
                    className="group"
                    meta={<span>{p.status === 'draft' ? `Draft · step ${p.draft_step} of 9 · saved ${formatRelative(p.updated_at)}` : `Open · ${p.proposal_count} proposal${p.proposal_count === 1 ? '' : 's'}`}</span>}
                    trail={p.budget_amount ? <Money amount={p.budget_amount} /> : <span className="t-meta">No budget yet</span>}
                  >
                    <p className="row-title truncate font-medium">{p.title || 'Untitled draft'}</p>
                  </LedgerRow>
                ))}
              </Ledger>
            )}

            {work && (
              <Ledger
                id="recommended"
                className="order-5"
                title={<span className="t-label-caps">{matched ? 'Recommended for you' : 'Open projects'}</span>}
                description={matched ? `Matching ${viewer.profile.skills.slice(0, 4).join(', ')}` : viewer.profile.skills.length ? 'Newest open work. Nothing matches your skills exactly yet.' : 'Newest open work. Add skills to your profile for closer matches.'}
                action={<Link className="link" href="/work">Find work</Link>}
                empty={<EmptyLine>{recommendations === null ? 'Open projects could not be loaded. Refresh to try again.' : 'No open projects right now — new work appears here as soon as it is posted.'}</EmptyLine>}
              >
                {(recommendations ?? []).map((p) => <li key={p.id}><ProjectCard project={p} categories={catMap} plan={plans.get(p.id)} /></li>)}
              </Ledger>
            )}
          </div>

          <aside className="contents lg:block lg:space-y-10" aria-label="Money and dates">
            {(asClient.length > 0 || asFreelancer.length > 0) && (
              <div className="order-2 space-y-6">
                {asClient.length > 0 && (
                  <EscrowStatement compact aggregate title="Your escrow as a client" milestones={asClient} note={<Link className="link" href="/wallet">Wallet</Link>} />
                )}
                {asFreelancer.length > 0 && (
                  <EscrowStatement compact aggregate title="Escrow for your work" milestones={asFreelancer} note={<Link className="link" href="/wallet">Wallet</Link>} />
                )}
              </div>
            )}

            <Ledger className="order-3" title={<span className="t-label-caps">Due in the next two weeks</span>} empty={<EmptyLine>Nothing due in the next two weeks.</EmptyLine>}>
              {deadlines.map(({ c, m, days }) => (
                <li key={m.id}>
                  <Link href={`/contracts/${c.id}#milestone-${m.position}`} className="ledger-row-link group grid grid-cols-[3.25rem_minmax(0,1fr)] items-baseline gap-3 px-1 py-3 focus-visible:ring-inset">
                    <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{formatDate(m.due_date, 'd MMM')}</span>
                    <span className="min-w-0">
                      <span className="row-title block truncate text-sm font-medium">{m.title}</span>
                      <span className="block truncate text-xs text-ink-muted">
                        {c.title} · <span className={days < 0 ? 'text-danger-strong' : days <= 2 ? 'text-warning-strong' : undefined}>{days < 0 ? `${-days} days overdue` : days === 0 ? 'today' : `in ${days} days`}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </Ledger>

            {work && proposals.length > 0 && (
              <Ledger className="order-6" title={<span className="t-label-caps">Proposals waiting</span>} action={<Link className="link text-xs" href="/projects?view=proposals">All</Link>}>
                {proposals.map((p) => (
                  <LedgerRow key={p.id} href={`/projects/${p.project_id}`} className="group" meta={<span>Sent {formatRelative(p.created_at)}</span>} trail={<Money amount={p.amount} size="sm" />}>
                    <p className="row-title truncate text-sm font-medium">{p.project?.title ?? 'Project'}</p>
                  </LedgerRow>
                ))}
              </Ledger>
            )}

            {disputes.length > 0 && (
              <Ledger className="order-6" title={<span className="t-label-caps">Open disputes</span>}>
                {disputes.map((d) => (
                  <LedgerRow key={d.id} tone="danger" href={d.arbitrator_id === viewer.id ? `/arbitration/cases/${d.id}` : `/disputes/${d.id}`} className="group" meta={<span>Opened {formatRelative(d.created_at)}</span>} trail={<Money amount={d.amount} size="sm" />}>
                    <p className="row-title text-sm font-medium">{disputeNumber(d.number)}</p>
                  </LedgerRow>
                ))}
              </Ledger>
            )}

            <Ledger className="order-7" title={<span className="t-label-caps">Recent activity</span>} action={<Link className="link text-xs" href="/notifications">All</Link>} empty={<EmptyLine>No activity yet.</EmptyLine>}>
              {groupNotifications(notesRes.data ?? []).map(({ n, count }) => (
                <li key={n.id}>
                  <Link href={n.link ?? '/notifications'} className="ledger-row-link group grid grid-cols-[3.25rem_minmax(0,1fr)] items-baseline gap-3 px-1 py-3 focus-visible:ring-inset">
                    <span className="t-mono text-ink-muted">{sameDay(n.created_at) ? formatDate(n.created_at, 'HH:mm') : formatDate(n.created_at, 'd MMM')}</span>
                    <span className={cn('row-title text-sm', n.read_at ? 'text-ink-secondary' : 'font-medium text-ink')}>
                      {!n.read_at && <span className="mr-1.5 inline-block size-1.5 -translate-y-0.5 rounded-full bg-brand" aria-label="Unread" />}
                      {n.title}{count > 1 && <span className="ml-1 text-ink-muted">×{count}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </Ledger>
          </aside>
        </div>
      )}

      {isNew && work && (
        <Ledger id="open-work" title={<span className="t-label-caps">Live projects</span>} description="Open work on TrustLance right now. Every payment is held in on-chain escrow." action={<Link className="link" href="/work">Browse all</Link>} empty={<EmptyLine>No open projects yet — new work appears here as soon as it is posted.</EmptyLine>}>
          {(recommendations ?? []).map((p) => <li key={p.id}><ProjectCard project={p} categories={catMap} plan={plans.get(p.id)} /></li>)}
        </Ledger>
      )}
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="border-y py-5 text-sm text-ink-secondary">{children}</p>;
}

function sameDay(iso: string) {
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
  return fmt(new Date(iso)) === fmt(new Date());
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
  const nextStep = steps.find((s) => !s.done);
  return (
    <Ledger id="start" title={<span className="t-label-caps">Get started</span>} action={<span className="t-meta">{done} of {steps.length} done</span>}>
      {steps.map((s) => (
        <LedgerRow
          key={s.title}
          lead={s.done ? <Check className="size-5 text-success" aria-label="Done" /> : <Circle className="size-5 text-line-strong" aria-label="To do" />}
          meta={<span>{s.detail}</span>}
          trail={!s.done && <Button asChild size="sm" variant={s === nextStep ? 'primary' : 'ghost'}><Link href={s.href}>{s.cta}</Link></Button>}
        >
          <p className={cn('font-medium', s.done && 'text-ink-muted line-through')}>{s.title}</p>
        </LedgerRow>
      ))}
    </Ledger>
  );
}
