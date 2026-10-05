import { Quote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { DisputeCase, MemberSummary } from '@/lib/data/disputes';
import { formatDateTime } from '@/lib/format';
import { disputeReasonLabel } from '@/lib/status';
import { requestedOutcomeLabel } from './labels';
import { SplitRows } from './split';

/** Both sides in their own words: the opening statement and the respondent’s written notes. */
export function Statements({ data, members }: { data: Pick<DisputeCase, 'dispute' | 'contract' | 'evidence'>; members: Record<string, MemberSummary> }) {
  const { dispute: d, contract: c } = data;
  const roleOf = (uid: string) => (uid === c.client_id ? 'Client' : 'Freelancer');
  const raiser = members[d.raised_by]?.display_name ?? 'The raising party';
  const respondent = members[d.respondent_id]?.display_name ?? 'The other party';
  const responses = data.evidence.filter((e) => e.submitted_by === d.respondent_id && e.kind === 'note');

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="panel space-y-4 p-5" aria-labelledby="statement-raiser">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="statement-raiser" className="flex items-center gap-2 text-sm font-semibold"><Quote className="size-4 text-ink-muted" aria-hidden /> {raiser}’s statement</h3>
          <Badge tone="neutral">{roleOf(d.raised_by)} · opened the dispute</Badge>
        </header>
        <p className="text-sm"><span className="text-ink-muted">Reason:</span> {disputeReasonLabel[d.reason]}</p>
        <p className="whitespace-pre-line break-words text-sm leading-relaxed text-ink-secondary">{d.description}</p>
        <div className="space-y-2">
          <p className="t-eyebrow">Requested outcome</p>
          <p className="text-sm">{requestedOutcomeLabel(d.requested_outcome, d.requested_freelancer_pct)}</p>
          <SplitRows amount={d.amount} pct={d.requested_freelancer_pct ?? (d.requested_outcome === 'release' ? 100 : 0)} />
        </div>
        <p className="t-meta">Submitted {formatDateTime(d.created_at)}</p>
      </article>

      <article className="panel space-y-4 p-5" aria-labelledby="statement-respondent">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="statement-respondent" className="flex items-center gap-2 text-sm font-semibold"><Quote className="size-4 text-ink-muted" aria-hidden /> {respondent}’s response</h3>
          <Badge tone="neutral">{roleOf(d.respondent_id)} · respondent</Badge>
        </header>
        {responses.length === 0 ? (
          <p className="text-sm text-ink-muted">No written response yet. The respondent can reply by adding a note in Evidence or writing in Messages.</p>
        ) : (
          <ul className="space-y-4">
            {responses.map((n) => (
              <li key={n.id} className="space-y-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-ink-secondary">{n.description}</p>
                <p className="t-meta">{formatDateTime(n.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}
