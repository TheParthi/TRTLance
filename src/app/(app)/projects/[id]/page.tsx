import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, FileText, Lock, PenLine } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EscrowRail } from '@/components/common/escrow-rail';
import { LedgerRow } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { MoneyRing } from '@/components/common/money-ring';
import { PageHeader } from '@/components/common/page-header';
import { ProjectStatusMark } from '@/components/common/status-mark';
import { ProposalStatusMark } from '@/components/common/status-mark';
import { TrustLine } from '@/components/common/trust-signals';
import { MobileActionBar } from '@/components/projects/mobile-action-bar';
import { CloseProjectButton, MessageButton, WithdrawProposalButton } from '@/components/projects/project-actions';
import { RiskPanel } from '@/components/projects/risk-panel';
import { timelineText } from '@/components/projects/timeline';
import { SetSection } from '@/components/shell/section';
import { getViewer } from '@/lib/auth';
import { getCategories, getMyProposal, getProject } from '@/lib/data/projects';
import { proposalSegments } from '@/lib/escrow-summary';
import { formatBytes, formatDate, formatRelative } from '@/lib/format';
import { formatAmount, sumAmounts } from '@/lib/money';
import { experienceLabel } from '@/lib/status';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await getProject((await params).id);
  return { title: data?.project.title ?? 'Project' };
}

export default async function ProjectPage({ params }: Params) {
  const { id } = await params;
  const [data, viewer, categories] = await Promise.all([getProject(id), getViewer(), getCategories().catch(() => [])]);
  if (!data) notFound();
  const { project, attachments, riskReport, client } = data;
  const isOwner = viewer?.id === project.client_id;
  const isHired = viewer?.id === project.hired_freelancer_id;
  const myProposal = viewer && !isOwner ? await getMyProposal(project.id, viewer.id) : null;
  const category = categories.find((c) => c.slug === project.category)?.label;

  const supabase = await createClient();
  const files = await Promise.all(
    attachments.map(async (a) => {
      const { data: signed } = await supabase.storage.from('project-files').createSignedUrl(a.storage_path, 600);
      return { ...a, url: signed?.signedUrl ?? null };
    }),
  );
  const contract = isOwner || isHired
    ? (await supabase.from('contracts').select('id, status').eq('project_id', project.id).neq('status', 'cancelled').maybeSingle()).data
    : null;

  // The one thing this viewer can do next, said once in the terms column.
  let primary: React.ReactNode = null;
  let secondary: React.ReactNode = null;
  let note: string | null = null;
  if (!viewer) {
    if (project.status === 'open') primary = <Button asChild size="lg" className="w-full"><Link href={`/login?next=/projects/${project.id}/apply`}>Sign in to apply</Link></Button>;
  } else if (isOwner) {
    if (project.status === 'draft') {
      primary = <Button asChild size="lg" className="w-full"><Link href={`/projects/${project.id}/edit`}><PenLine /> Continue editing</Link></Button>;
      note = 'Draft — only you can see it. Finish the posting steps to publish.';
    } else if (project.status === 'open') {
      primary = <Button asChild size="lg" className="w-full"><Link href={`/projects/${project.id}/proposals`}>Review proposals ({project.proposal_count}) <ArrowRight /></Link></Button>;
      secondary = <CloseProjectButton projectId={project.id} proposalCount={project.proposal_count} variant="ghost" className="w-full text-danger-strong hover:text-danger-strong" />;
    } else if (contract) {
      primary = <Button asChild size="lg" className="w-full"><Link href={`/contracts/${contract.id}`}>Open contract <ArrowRight /></Link></Button>;
    }
  } else if (isHired && contract) {
    primary = <Button asChild size="lg" className="w-full"><Link href={`/contracts/${contract.id}`}>Open contract <ArrowRight /></Link></Button>;
  } else if (project.status === 'open' && (!myProposal || myProposal.status === 'withdrawn')) {
    primary = viewer.profile.intent === 'hire'
      ? <Button asChild variant="secondary" className="w-full"><Link href="/settings">Switch to finding work to apply</Link></Button>
      : <Button asChild size="lg" className="w-full"><Link href={`/projects/${project.id}/apply`}>Submit a proposal <ArrowRight /></Link></Button>;
  }
  if (!primary && !note && project.status !== 'open' && project.status !== 'draft' && !(myProposal && myProposal.status !== 'withdrawn')) {
    note = 'This project is no longer accepting proposals.';
  }

  const plan = project.milestone_plan.map((m, i) => ({ position: i + 1, title: m.title, amount: m.amount, description: m.description }));
  const { summary, scope } = splitBrief(project.description);
  const proposalShown = myProposal && myProposal.status !== 'withdrawn' ? myProposal : null;
  const funding = contract
    ? ({ pending_signatures: 'Awaiting signatures', awaiting_funding: 'Awaiting the deposit', active: 'Secured in escrow', disputed: 'Secured — in dispute', completed: 'Released', cancelled: 'No money moved' } as Record<string, string>)[contract.status] ?? 'In the contract'
    : project.status === 'in_contract' ? 'Handled in the contract'
    : project.status === 'completed' ? 'Completed'
    : project.status === 'cancelled' ? 'No money moved'
    : 'Deposited after hiring';

  return (
    <>
      <SetSection section={isOwner ? 'projects' : 'work'} />
      <PageHeader
        breadcrumbs={[{ label: isOwner ? 'Projects' : 'Find work', href: isOwner ? '/projects' : '/work' }, { label: project.title || 'Untitled draft' }]}
        eyebrow={category ?? 'Project'}
        title={project.title || 'Untitled draft'}
        description={summary ? <span className="block text-base text-ink md:text-lg">{summary}</span> : undefined}
        meta={
          <>
            <ProjectStatusMark status={project.status} />
            {project.published_at && <span>Posted {formatRelative(project.published_at)}</span>}
            <span>{project.proposal_count} proposal{project.proposal_count === 1 ? '' : 's'}</span>
          </>
        }
        aside={
          <MoneyRing
            className="-mx-4 h-[240px] sm:h-[300px] lg:mx-0 lg:h-[360px]"
            parts={plan.length ? plan.map((m) => ({ amount: Number(m.amount) || 0, state: 'unfunded' as const })) : [{ amount: Number(project.budget_amount) || 1, state: 'unfunded' as const }]}
            readout={{
              label: plan.length ? `${plan.length} milestone${plan.length === 1 ? '' : 's'} planned` : 'Budget',
              state: 'Funded into escrow after hiring',
              amount: project.budget_amount ? formatAmount(project.budget_amount) : 'Open budget',
            }}
          />
        }
      />

      {proposalShown && (
        <ul className="ledger mb-10" aria-label="Your application">
          <LedgerRow
            tone={proposalShown.status === 'declined' ? 'warning' : 'brand'}
            meta={<span>{formatAmount(proposalShown.amount)} over {proposalShown.duration_days} days in {proposalShown.milestones.length} milestone{proposalShown.milestones.length === 1 ? '' : 's'} · sent {formatRelative(proposalShown.created_at)}</span>}
            trail={proposalShown.status === 'pending' ? (
              <div className="flex flex-wrap gap-2">
                <MessageButton proposalId={proposalShown.id} label="Message client" />
                <WithdrawProposalButton proposalId={proposalShown.id} projectId={project.id} variant="ghost" />
              </div>
            ) : undefined}
          >
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold">Your proposal <ProposalStatusMark status={proposalShown.status} /></p>
            {proposalShown.milestones.length > 0 && (
              <EscrowRail segments={proposalSegments(proposalShown.milestones)} size="sm" className="mt-2 max-w-sm" label="Proposed milestones" />
            )}
          </LedgerRow>
        </ul>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-16">
        {/* Terms first in reading order, so on phones the budget and the next step come before the brief. */}
        <aside aria-labelledby="terms-title" className="min-w-0 lg:col-start-2 lg:row-start-1">
          <div className="space-y-6 lg:sticky lg:top-20">
            <div className="space-y-2">
              <h2 id="terms-title" className="t-label-caps">Terms</h2>
              <Money amount={project.budget_amount} size="xl" />
              <p className="flex items-start gap-2 text-xs text-ink-secondary">
                <Lock className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
                Fixed price. The client deposits the agreed amount into escrow before work starts.
              </p>
            </div>

            {(primary || secondary || note) && (
              <div className="space-y-2">
                {primary && (
                  <>
                    <div className="hidden lg:block">{primary}</div>
                    {/* Phones and tablets: the one action sticks to the bottom of the screen. */}
                    <MobileActionBar aboveTabBar={Boolean(viewer)}>
                      <div className="min-w-0 flex-1">
                        <Money amount={project.budget_amount} size="lg" />
                        <p className="t-meta">Fixed price</p>
                      </div>
                      <div className="shrink-0">{primary}</div>
                    </MobileActionBar>
                  </>
                )}
                {secondary}
                {note && <p className="text-sm text-ink-secondary">{note}</p>}
              </div>
            )}

            <dl className="ledger grid grid-cols-1 text-sm">
              {[
                { label: 'Timeline', value: timelineText(project.start_date, project.due_date) },
                { label: 'Milestones', value: plan.length ? `${plan.length} suggested` : 'Freelancer proposes' },
                { label: 'Funding', value: funding },
                { label: 'Experience', value: project.experience_level ? experienceLabel[project.experience_level] : 'Any level' },
                { label: 'Visibility', value: project.visibility === 'public' ? 'Listed publicly' : 'Unlisted (link only)' },
              ].map((f) => (
                <div key={f.label} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-ink-muted">{f.label}</dt>
                  <dd className="text-right">{f.value}</dd>
                </div>
              ))}
            </dl>

            {client && (
              <section aria-labelledby="client-title" className="space-y-3">
                <h2 id="client-title" className="t-label-caps">Client</h2>
                <Link href={`/u/${client.username}`} className="group flex items-center gap-3">
                  <Avatar name={client.display_name} path={client.avatar_path} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium group-hover:text-brand">{client.display_name}{isOwner && <span className="font-normal text-ink-muted"> (you)</span>}</span>
                    <span className="t-meta block">Member since {formatDate(client.created_at, 'MMM yyyy')}</span>
                  </span>
                </Link>
                {client.stats && <TrustLine stats={client.stats} role="client" />}
                <p className="t-meta">Verified by TrustLance from account and contract records.</p>
              </section>
            )}
          </div>
        </aside>

        <article aria-label="Project brief" className="min-w-0 space-y-12 lg:col-start-1 lg:row-start-1">
          <section aria-labelledby="scope-title" className="space-y-4">
            <h2 id="scope-title" className="t-label-caps">Scope</h2>
            <div className="max-w-reading space-y-4">
              {scope.map((para, i) => <p key={i} className="whitespace-pre-line leading-relaxed text-ink-secondary">{para}</p>)}
              {!summary && <p className="text-ink-secondary">No description yet.</p>}
            </div>
            {project.skills.length > 0 && (
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <span className="t-label-caps mr-1">Skills</span>
                {project.skills.map((s) => <span key={s} className="text-ink-secondary">#{s}</span>)}
              </p>
            )}
          </section>

          {project.deliverables.length > 0 && (
            <section aria-labelledby="deliverables-title" className="space-y-3">
              <div className="space-y-0.5">
                <h2 id="deliverables-title" className="t-label-caps">Deliverables</h2>
                <p className="text-sm text-ink-secondary">What the client expects to receive.</p>
              </div>
              <ol className="ledger">
                {project.deliverables.map((d, i) => (
                  <li key={i} className="flex gap-4 py-3 text-sm">
                    <span className="t-mono pt-0.5 text-ink-muted">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0">{d}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {plan.length > 0 && (
            <section aria-labelledby="plan-title" className="space-y-4">
              <div className="space-y-0.5">
                <h2 id="plan-title" className="t-label-caps">Suggested milestone plan</h2>
                <p className="text-sm text-ink-secondary">The client’s proposed payment plan. Freelancers can propose their own.</p>
              </div>
              <EscrowRail segments={proposalSegments(plan)} size="lg" detail label="Suggested milestone plan" />
              {/* The rail's captions carry number, state and amount; this list adds what each milestone is. On phones the rail already lists titles, so it shows only when there are descriptions. */}
              <ol className={cn('ledger', !plan.some((m) => m.description) && 'hidden sm:block')}>
                {plan.map((m) => (
                  <li key={m.position} className="flex items-start gap-4 py-3">
                    <span className="t-mono pt-0.5 text-ink-muted">{String(m.position).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{m.title}</p>
                      {m.description && <p className="mt-0.5 text-sm text-ink-secondary">{m.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
              <p className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-ink-muted">Total</span>
                <Money amount={sumAmounts(plan.map((m) => m.amount))} />
              </p>
            </section>
          )}

          {files.length > 0 && (
            <section aria-labelledby="files-title" className="space-y-3">
              <h2 id="files-title" className="t-label-caps">Attachments</h2>
              <ul className="ledger">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 py-3 text-sm">
                    <FileText className="size-4 shrink-0 text-ink-muted" aria-hidden />
                    {f.url ? <a href={f.url} className="link min-w-0 flex-1 truncate" target="_blank" rel="noreferrer">{f.file_name}</a> : <span className="min-w-0 flex-1 truncate">{f.file_name}</span>}
                    <span className="t-meta shrink-0">{formatBytes(f.size_bytes)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {project.status !== 'draft' && <RiskPanel projectId={project.id} initial={riskReport} canGenerate={Boolean(viewer)} />}
        </article>
      </div>
      {primary && <div className="h-20 lg:hidden" aria-hidden />}
    </>
  );
}

/** Splits a description into a one-sentence summary and the rest (the scope). */
function splitBrief(description: string) {
  const paras = (description || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (!paras.length) return { summary: '', scope: [] as string[] };
  const first = /^(.{20,}?[.!?])\s+(\S[\s\S]*)$/.exec(paras[0]);
  return first
    ? { summary: first[1], scope: [first[2], ...paras.slice(1)] }
    : { summary: paras[0], scope: paras.slice(1) };
}
