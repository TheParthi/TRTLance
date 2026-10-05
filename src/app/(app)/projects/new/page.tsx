import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Lock, Scale, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { requireViewer } from '@/lib/auth';
import { formatRelative } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { StartDraftButton } from './start-draft-button';

export const metadata: Metadata = { title: 'Post a project' };

export default async function NewProjectPage() {
  const viewer = await requireViewer('/projects/new');
  const supabase = await createClient();
  const { data: drafts } = await supabase
    .from('projects')
    .select('id, title, updated_at, draft_step')
    .eq('client_id', viewer.id)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(5);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Post a project' }]}
        title="Post a project"
        description="Describe the work in nine short steps. Your progress is saved automatically, and nothing is published until you review it."
      />
      <div className="panel space-y-6 p-6">
        <ul className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: FileText, t: 'About 10 minutes', b: 'Scope, skills, budget, timeline and milestones.' },
            { icon: Lock, t: 'No payment now', b: 'You fund escrow only after you hire someone and both of you sign.' },
            { icon: Sparkles, t: 'Clear briefs get better proposals', b: 'Freelancers see an AI risk review of your brief.' },
            { icon: Scale, t: 'Protected by escrow', b: 'Money moves only when you approve work or an arbitrator decides.' },
          ].map(({ icon: Icon, t, b }) => (
            <li key={t} className="flex gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
              <span className="text-sm"><span className="block font-semibold">{t}</span><span className="text-ink-secondary">{b}</span></span>
            </li>
          ))}
        </ul>
        <StartDraftButton />
      </div>
      {drafts && drafts.length > 0 && (
        <section className="mt-8 space-y-3" aria-labelledby="drafts-title">
          <h2 id="drafts-title" className="t-section-title">Continue a draft</h2>
          <ul className="panel divide-y">
            {drafts.map((d) => (
              <li key={d.id}>
                <Link href={`/projects/${d.id}/edit`} className="flex items-center justify-between gap-4 p-4 hover:bg-surface-subtle">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{d.title || 'Untitled draft'}</span>
                    <span className="t-meta">Step {d.draft_step} of 9 · saved {formatRelative(d.updated_at)}</span>
                  </span>
                  <span className="text-sm text-brand">Continue →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
