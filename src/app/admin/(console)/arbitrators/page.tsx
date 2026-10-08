import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ledger } from '@/components/common/ledger';
import { EmptyState } from '@/components/common/states';
import { ConsoleHeader } from '@/components/admin/console-shell';
import { Panel, Stat, StatGrid } from '@/components/admin/stat';
import { ApplicationReview } from '../queues/application-review';
import { getAdminArbitrators, type AdminArbitratorRow } from '@/lib/data/admin';
import { getCategoryList } from '@/lib/data/disputes';
import { formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Arbitrators' };

const TONES = { pending: 'warning', approved: 'success', rejected: 'neutral', suspended: 'danger' } as const;
const LABELS = { pending: 'Applied', approved: 'Approved', rejected: 'Not approved', suspended: 'Suspended' } as const;

/**
 * The roster.
 *
 * Case load is the thing to read here: an arbitrator at capacity cannot take another case, so the
 * assignment list in the queues will not offer them. Applications stay at the top because they are
 * the only part of this page that needs a decision.
 */
export default async function ArbitratorsPage() {
  const [arbitrators, categories] = await Promise.all([getAdminArbitrators(), getCategoryList().catch(() => [])]);
  const label = (slug: string) => categories.find((c) => c.slug === slug)?.label ?? slug;

  const pending = arbitrators.filter((a) => a.status === 'pending');
  const approved = arbitrators.filter((a) => a.status === 'approved');
  const former = arbitrators.filter((a) => a.status === 'rejected' || a.status === 'suspended');

  const atCapacity = approved.filter((a) => a.live_cases >= a.capacity).length;
  const spare = approved.reduce((sum, a) => sum + Math.max(0, a.capacity - a.live_cases), 0);

  const row = (a: AdminArbitratorRow, showReview: boolean) => (
    <li key={a.user_id} className={cn('space-y-2 py-4', showReview && 'pl-4')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="flex min-w-0 flex-wrap items-center gap-2">
            <Link href={`/admin/members/${a.user_id}`} className="font-medium hover:text-brand">{a.display_name}</Link>
            <span className="t-meta">@{a.username}</span>
            <Badge tone={TONES[a.status]}>{LABELS[a.status]}</Badge>
            {a.status === 'approved' && !a.is_available && <Badge>Unavailable</Badge>}
            {a.status === 'approved' && a.live_cases >= a.capacity && <Badge tone="warning">At capacity</Badge>}
          </p>
          <p className="text-sm text-ink-secondary">
            {a.specializations.map(label).join(', ') || 'No specialisations'}
            {' · '}
            <span className="tabular-nums">{a.live_cases}/{a.capacity}</span> live case{a.capacity === 1 ? '' : 's'}
            {a.decided_cases > 0 && <> · {a.decided_cases} decided</>}
          </p>
          <p className="t-meta">
            Applied {formatDate(a.applied_at)}
            {a.reviewed_at ? ` · reviewed ${formatDateTime(a.reviewed_at)}` : ''}
            {` · ${a.completed_contracts} completed contracts · ${a.disputes_lost} disputes lost`}
          </p>
          {a.review_note && <p className="max-w-reading text-sm text-ink-secondary"><span className="text-ink-muted">Review note:</span> {a.review_note}</p>}
        </div>
        {showReview
          ? <ApplicationReview userId={a.user_id} name={a.display_name} />
          : (
            <Button asChild size="sm" variant="ghost">
              <Link href={`/admin/members/${a.user_id}`}>Account <ArrowRight /></Link>
            </Button>
          )}
      </div>
      {(a.status === 'pending' || a.status === 'approved') && (
        <p className="max-w-reading whitespace-pre-line break-words text-sm text-ink-secondary">{a.statement}</p>
      )}
    </li>
  );

  return (
    <>
      <ConsoleHeader
        title="Arbitrators"
        description="The people who decide disputes. An arbitrator at capacity is not offered when assigning a case, and the database refuses anyone with a conflict of interest in it."
      />

      <div className="space-y-12">
        <StatGrid>
          <Stat label="Approved" value={approved.length} unit="people" tone="success"
            hint={`${approved.filter((a) => a.is_available).length} marked available`} />
          <Stat label="Spare capacity" value={spare} unit="cases" tone={spare > 0 ? 'brand' : 'warning'}
            hint={spare > 0 ? 'Cases that could be assigned right now.' : 'Nobody can take another case.'} />
          <Stat label="At capacity" value={atCapacity} unit="people" tone={atCapacity > 0 ? 'warning' : 'neutral'}
            hint={atCapacity > 0 ? 'Not offered when assigning.' : 'Everyone has room.'} />
          <Stat label="Applications" value={pending.length} unit="waiting" tone="brass"
            urgent={pending.length > 0} hint={pending.length > 0 ? 'Read their experience, then decide.' : 'None pending.'} />
        </StatGrid>

        <Panel title={`Applications (${pending.length})`} description="Eligibility was checked when they applied, so this is a judgement about experience.">
          <Ledger empty={<EmptyState compact title="No pending applications" description="New applications appear here for review." />}>
            {pending.map((a) => row(a, true))}
          </Ledger>
        </Panel>

        <Panel title={`Roster (${approved.length})`} description="Approved arbitrators and what each one is carrying.">
          <Ledger empty={<EmptyState compact title="No arbitrators yet" description="Until someone is approved, admins decide escalated disputes themselves." />}>
            {approved.map((a) => row(a, false))}
          </Ledger>
        </Panel>

        {former.length > 0 && (
          <Panel title={`Not active (${former.length})`} description="Applications that were turned down, and arbitrators who were suspended.">
            <Ledger>{former.map((a) => row(a, false))}</Ledger>
          </Panel>
        )}
      </div>
    </>
  );
}
