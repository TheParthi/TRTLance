import type { Metadata } from 'next';
import { ArrowRight, FileText, Lock, Scale, Sparkles } from 'lucide-react';
import { Ledger, LedgerRow } from '@/components/common/ledger';
import { PageHeader } from '@/components/common/page-header';
import { requireViewer } from '@/lib/auth';
import { formatRelative } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { StartDraftButton } from './start-draft-button';

export const metadata: Metadata = { title: 'Post a project' };

const expectations = [
  { icon: FileText, t: 'About 10 minutes', b: 'Scope, skills, budget, timeline and milestones.' },
  { icon: Lock, t: 'No payment now', b: 'You fund escrow only after you hire someone and both of you sign.' },
  { icon: Sparkles, t: 'Clear briefs get better proposals', b: 'Freelancers see an AI risk review of your brief.' },
  { icon: Scale, t: 'Protected by escrow', b: 'Money moves only when you approve work or an arbitrator decides.' },
];

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
    <div className="mx-auto max-w-3xl space-y-12">
      <div className="space-y-8">
        <PageHeader
          bleed={false}
          className="mb-0 md:mb-0"
          breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Post a project' }]}
          title="Post a project"
          description="Describe the work in nine short steps. Your progress is saved automatically, and nothing is published until you review it."
        />
        <ul className="ledger">
          {expectations.map(({ icon: Icon, t, b }) => (
            <li key={t} className="flex gap-4 py-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
              <p className="text-sm"><span className="font-semibold">{t}.</span> <span className="text-ink-secondary">{b}</span></p>
            </li>
          ))}
        </ul>
        <StartDraftButton />
      </div>

      {drafts && drafts.length > 0 && (
        <Ledger id="drafts" title="Continue a draft">
          {drafts.map((d) => (
            <LedgerRow
              key={d.id}
              className="group"
              href={`/projects/${d.id}/edit`}
              meta={<span>Step {d.draft_step} of 9 · saved {formatRelative(d.updated_at)}</span>}
              trail={<span className="inline-flex items-center gap-1 text-sm font-medium text-brand">Continue <ArrowRight className="row-arrow size-4" aria-hidden /></span>}
            >
              <p className="row-title truncate font-medium">{d.title || 'Untitled draft'}</p>
            </LedgerRow>
          ))}
        </Ledger>
      )}
    </div>
  );
}
