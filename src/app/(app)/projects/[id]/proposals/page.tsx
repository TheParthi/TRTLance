import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/states';
import { requireViewer } from '@/lib/auth';
import { getMembers, getProject, getProposalsForProject } from '@/lib/data/projects';
import { ProposalBoard } from './board';

export const metadata: Metadata = { title: 'Proposals' };

export default async function ProposalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer(`/projects/${id}/proposals`);
  const data = await getProject(id);
  if (!data) notFound();
  if (data.project.client_id !== viewer.id) redirect(`/projects/${id}`);
  const proposals = await getProposalsForProject(id);
  const members = await getMembers(proposals.map((p) => p.freelancer_id));

  const items = proposals.map((p) => {
    const m = members.get(p.freelancer_id);
    const freelancerSkills = new Set([...(m?.skills ?? []), ...p.relevant_skills]);
    const matched = data.project.skills.filter((s) => freelancerSkills.has(s));
    return { proposal: p, member: m ?? null, matched };
  });

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: data.project.title, href: `/projects/${id}` }, { label: 'Proposals' }]}
        title="Compare proposals"
        description="Price, timeline and milestones come from each proposal. Trust signals are verified by TrustLance. Skill match compares listed skills — it is not an AI judgement."
      />
      {items.length === 0 ? (
        <EmptyState
          title="No proposals yet"
          description={data.project.status === 'open' ? 'You’ll be notified as soon as a freelancer applies.' : 'This project is not accepting proposals.'}
          action={{ label: 'Back to project', href: `/projects/${id}` }}
        />
      ) : (
        <ProposalBoard
          projectId={id}
          projectOpen={data.project.status === 'open'}
          budget={data.project.budget_amount}
          projectSkillCount={data.project.skills.length}
          items={items}
        />
      )}
    </>
  );
}
