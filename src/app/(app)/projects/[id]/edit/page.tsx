import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireViewer } from '@/lib/auth';
import { getCategories, getProject } from '@/lib/data/projects';
import { isEscrowConfigured, publicEnv } from '@/lib/env';
import { ProjectWizard } from './wizard';

export const metadata: Metadata = { title: 'Edit draft' };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer(`/projects/${id}/edit`);
  const [data, categories] = await Promise.all([getProject(id), getCategories()]);
  if (!data || data.project.client_id !== viewer.id) notFound();
  if (data.project.status !== 'draft') redirect(`/projects/${id}`);
  return (
    <ProjectWizard
      project={data.project}
      attachments={data.attachments}
      categories={categories}
      escrow={{ configured: isEscrowConfigured(), network: publicEnv.chain.name || (publicEnv.chain.id ? `Chain ${publicEnv.chain.id}` : null) }}
      walletAddress={viewer.wallet?.address ?? null}
    />
  );
}
