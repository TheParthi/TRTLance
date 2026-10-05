import type { Metadata } from 'next';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/states';
import { requireViewer } from '@/lib/auth';
import { getDisputableContracts } from '@/lib/data/disputes';
import { DisputeWizard } from './wizard';

export const metadata: Metadata = { title: 'Open a dispute' };

type Props = { searchParams: Promise<{ contract?: string | string[]; milestone?: string | string[] }> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function NewDisputePage({ searchParams }: Props) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (first(sp.contract)) qs.set('contract', first(sp.contract));
  if (first(sp.milestone)) qs.set('milestone', first(sp.milestone));
  const viewer = await requireViewer(`/disputes/new${qs.size ? `?${qs}` : ''}`);
  const contracts = await getDisputableContracts(viewer.id);

  const contract = contracts.find((c) => c.id === first(sp.contract));
  const milestone = contract?.milestones.find((m) => m.id === first(sp.milestone));

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Contracts', href: '/contracts' }, { label: 'Disputes', href: '/disputes' }, { label: 'Open a dispute' }]}
        title="Open a dispute"
        description="An independent arbitrator reviews both sides and decides how the milestone’s escrowed funds are split. Try resolving it in messages first — a dispute freezes the milestone."
      />
      {contracts.length === 0 ? (
        <EmptyState
          title="Nothing can be disputed right now"
          description="Disputes can be opened on funded contracts, for milestones that are secured, submitted, in revision or approved but not yet released."
          action={{ label: 'View contracts', href: '/contracts' }}
        />
      ) : (
        <DisputeWizard contracts={contracts} initialContractId={contract?.id ?? (contracts.length === 1 ? contracts[0].id : '')} initialMilestoneId={milestone?.id ?? ''} />
      )}
    </>
  );
}
