import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { requireViewer } from '@/lib/auth';
import { getPlatformSettings } from '@/lib/data/contracts';
import { getMyProposal, getProject } from '@/lib/data/projects';
import { normalizeAmount } from '@/lib/money';
import { ProposalComposer } from './composer';

export const metadata: Metadata = { title: 'Submit a proposal' };

export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer(`/projects/${id}/apply`);
  const data = await getProject(id);
  if (!data || data.project.status === 'draft') notFound();
  const { project, riskReport } = data;
  if (project.client_id === viewer.id || project.status !== 'open') redirect(`/projects/${id}`);
  const [existing, settings] = await Promise.all([getMyProposal(id, viewer.id), getPlatformSettings()]);
  if (existing && existing.status !== 'withdrawn') redirect(`/projects/${id}`);

  const plan = project.milestone_plan.length
    ? project.milestone_plan.map((m, i) => ({ title: m.title, description: m.description ?? '', amount: normalizeAmount(m.amount), due_in_days: String(7 * (i + 1)) }))
    : [{ title: '', description: '', amount: normalizeAmount(project.budget_amount), due_in_days: '14' }];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
          bleed={false}
        breadcrumbs={[{ label: 'Find work', href: '/work' }, { label: project.title, href: `/projects/${id}` }, { label: 'Proposal' }]}
        title="Submit a proposal"
        description={`For “${project.title}”. The client sees your price, timeline, milestones and verified track record.`}
      />
      <ProposalComposer
        projectId={id}
        budget={normalizeAmount(project.budget_amount)}
        projectSkills={project.skills}
        mySkills={viewer.profile.skills}
        initialMilestones={plan}
        riskLevel={riskReport?.result.overall ?? null}
        identityVerified={viewer.stats.identity_verified}
        feeBps={settings.fee_bps}
        minMilestone={settings.min_milestone_coins}
      />
    </div>
  );
}
