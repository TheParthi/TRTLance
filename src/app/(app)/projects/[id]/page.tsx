import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, FileText, Lock, PenLine } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Money } from '@/components/common/money';
import { Facts, PageHeader, Section } from '@/components/common/page-header';
import { ProjectStatusBadge, ProposalStatusBadge } from '@/components/common/status-badge';
import { TrustSignals } from '@/components/common/trust-signals';
import { CloseProjectButton, MessageButton, WithdrawProposalButton } from '@/components/projects/project-actions';
import { RiskPanel } from '@/components/projects/risk-panel';
import { getViewer } from '@/lib/auth';
import { getCategories, getMyProposal, getProject } from '@/lib/data/projects';
import { formatBytes, formatDate, formatRelative } from '@/lib/format';
import { formatAmount } from '@/lib/money';
import { experienceLabel } from '@/lib/status';
import { createClient } from '@/lib/supabase/server';

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

  let primary: React.ReactNode = null;
  if (!viewer) {
    primary = project.status === 'open'
      ? <Button asChild size="lg"><Link href={`/login?next=/projects/${project.id}/apply`}>Sign in to apply</Link></Button>
      : null;
  } else if (isOwner) {
    if (project.status === 'draft') primary = <Button asChild size="lg"><Link href={`/projects/${project.id}/edit`}><PenLine /> Continue editing</Link></Button>;
    else if (project.status === 'open') primary = (
      <>
        <CloseProjectButton projectId={project.id} proposalCount={project.proposal_count} />
        <Button asChild size="lg"><Link href={`/projects/${project.id}/proposals`}>Review proposals ({project.proposal_count}) <ArrowRight /></Link></Button>
      </>
    );
    else if (contract) primary = <Button asChild size="lg"><Link href={`/contracts/${contract.id}`}>Open contract <ArrowRight /></Link></Button>;
  } else if (isHired && contract) {
    primary = <Button asChild size="lg"><Link href={`/contracts/${contract.id}`}>Open contract <ArrowRight /></Link></Button>;
  } else if (project.status === 'open' && (!myProposal || myProposal.status === 'withdrawn')) {
    primary = viewer.profile.intent === 'hire'
      ? <Button asChild variant="secondary"><Link href="/settings">Switch to finding work to apply</Link></Button>
      : <Button asChild size="lg"><Link href={`/projects/${project.id}/apply`}>Submit a proposal <ArrowRight /></Link></Button>;
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: isOwner ? 'Projects' : 'Find work', href: isOwner ? '/projects' : '/work' }, { label: project.title || 'Untitled draft' }]}
        eyebrow={category ?? 'Project'}
        title={project.title || 'Untitled draft'}
        meta={
          <>
            <ProjectStatusBadge status={project.status} />
            {project.published_at && <span>Posted {formatRelative(project.published_at)}</span>}
            <span>{project.proposal_count} proposal{project.proposal_count === 1 ? '' : 's'}</span>
          </>
        }
        actions={primary}
      />

      {project.status === 'draft' && isOwner && (
        <Callout tone="info" className="mb-6" title="This is a draft">Only you can see it. Finish the posting steps to publish.</Callout>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-8">
          {myProposal && myProposal.status !== 'withdrawn' && (
            <Callout
              tone={myProposal.status === 'accepted' ? 'success' : myProposal.status === 'declined' ? 'warning' : 'info'}
              title={<span className="flex flex-wrap items-center gap-2">Your proposal <ProposalStatusBadge status={myProposal.status} /></span>}
              action={myProposal.status === 'pending' ? (
                <div className="flex flex-wrap gap-2">
                  <MessageButton proposalId={myProposal.id} label="Message client" />
                  <WithdrawProposalButton proposalId={myProposal.id} projectId={project.id} />
                </div>
              ) : undefined}
            >
              {formatAmount(myProposal.amount)} over {myProposal.duration_days} days in {myProposal.milestones.length} milestone{myProposal.milestones.length === 1 ? '' : 's'} · sent {formatRelative(myProposal.created_at)}
            </Callout>
          )}

          <Section title="Scope">
            <div className="panel p-5">
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-secondary">{project.description || 'No description yet.'}</p>
            </div>
          </Section>

          {project.deliverables.length > 0 && (
            <Section title="Deliverables" description="What the client expects to receive.">
              <ul className="panel divide-y">
                {project.deliverables.map((d, i) => (
                  <li key={i} className="flex gap-3 p-4 text-sm"><span className="t-mono text-ink-muted">{String(i + 1).padStart(2, '0')}</span>{d}</li>
                ))}
              </ul>
            </Section>
          )}

          {project.milestone_plan.length > 0 && (
            <Section title="Suggested milestones" description="The client’s proposed payment plan. Freelancers can propose their own.">
              <ol className="panel divide-y">
                {project.milestone_plan.map((m, i) => (
                  <li key={i} className="flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{i + 1}. {m.title}</p>
                      {m.description && <p className="mt-0.5 text-sm text-ink-secondary">{m.description}</p>}
                    </div>
                    <Money amount={m.amount} size="sm" />
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {files.length > 0 && (
            <Section title="Attachments">
              <ul className="panel divide-y">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 p-4 text-sm">
                    <FileText className="size-4 text-ink-muted" aria-hidden />
                    {f.url ? <a href={f.url} className="link min-w-0 flex-1 truncate" target="_blank" rel="noreferrer">{f.file_name}</a> : <span className="flex-1">{f.file_name}</span>}
                    <span className="t-meta">{formatBytes(f.size_bytes)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {project.status !== 'draft' && <RiskPanel projectId={project.id} initial={riskReport} canGenerate={Boolean(viewer)} />}
        </div>

        <aside className="space-y-6">
          <section className="panel space-y-4 p-5" aria-labelledby="budget-title">
            <h2 id="budget-title" className="t-eyebrow">Budget</h2>
            <Money amount={project.budget_amount} size="xl" />
            <p className="flex items-start gap-2 text-xs text-ink-secondary">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
              Fixed price. The client deposits the agreed amount into escrow before work starts.
            </p>
            <Facts
              className="sm:grid-cols-1"
              items={[
                { label: 'Experience', value: project.experience_level ? experienceLabel[project.experience_level] : 'Any level' },
                { label: 'Timeline', value: project.start_date || project.due_date ? `${formatDate(project.start_date)} → ${formatDate(project.due_date)}` : 'Flexible' },
                { label: 'Visibility', value: project.visibility === 'public' ? 'Listed publicly' : 'Unlisted (link only)' },
              ]}
            />
            {project.skills.length > 0 && (
              <div className="space-y-2">
                <p className="t-eyebrow">Skills</p>
                <ul className="flex flex-wrap gap-1.5">{project.skills.map((s) => <li key={s} className="rounded bg-surface-sunken px-2 py-0.5 text-xs">{s}</li>)}</ul>
              </div>
            )}
          </section>

          {client && (
            <section className="panel space-y-4 p-5" aria-labelledby="client-title">
              <h2 id="client-title" className="t-eyebrow">About the client</h2>
              <Link href={`/u/${client.username}`} className="flex items-center gap-3 hover:text-brand">
                <Avatar name={client.display_name} path={client.avatar_path} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{client.display_name}</span>
                  <span className="t-meta block">Member since {formatDate(client.created_at, 'MMM yyyy')}</span>
                </span>
              </Link>
              {client.stats && <TrustSignals stats={client.stats} role="client" />}
              <p className="text-xs text-ink-muted">Verified by TrustLance from account and contract records.</p>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
