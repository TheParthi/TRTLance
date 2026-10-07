import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireViewer } from '@/lib/auth';
import { getCategories, getProject } from '@/lib/data/projects';
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
      coinBalance={viewer.coins.wallet}
    />
  );
}
