import type { DisputeCase, MemberSummary } from '@/lib/data/disputes';
import { formatDateTime } from '@/lib/format';
import { disputeReasonLabel } from '@/lib/status';
import { requestedOutcomeLabel } from './labels';

/** Both sides in their own words: the opening statement and the respondent’s written notes, side by side. */
export function Statements({ data, members }: { data: Pick<DisputeCase, 'dispute' | 'contract' | 'evidence'>; members: Record<string, MemberSummary> }) {
  const { dispute: d, contract: c } = data;
  const roleOf = (uid: string) => (uid === c.client_id ? 'Client' : 'Freelancer');
  const raiser = members[d.raised_by]?.display_name ?? 'The raising party';
  const respondent = members[d.respondent_id]?.display_name ?? 'The other party';
  const responses = data.evidence.filter((e) => e.submitted_by === d.respondent_id && e.kind === 'note');

  return (
    <div className="grid grid-cols-1 divide-y border-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
      <article className="min-w-0 space-y-4 py-5 lg:pr-6" aria-labelledby="statement-raiser">
        <header className="space-y-0.5">
          <h3 id="statement-raiser" className="font-semibold">{raiser}’s statement</h3>
          <p className="t-meta">{roleOf(d.raised_by)} · opened the dispute · {formatDateTime(d.created_at)}</p>
        </header>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-muted">Reason</dt>
          <dd className="min-w-0">{disputeReasonLabel[d.reason]}</dd>
          <dt className="text-ink-muted">Asks for</dt>
          <dd className="min-w-0">{requestedOutcomeLabel(d.requested_outcome, d.requested_freelancer_pct)}</dd>
        </dl>
        <p className="whitespace-pre-line break-words text-sm leading-relaxed text-ink-secondary">{d.description}</p>
      </article>

      <article className="min-w-0 space-y-4 py-5 lg:pl-6" aria-labelledby="statement-respondent">
        <header className="space-y-0.5">
          <h3 id="statement-respondent" className="font-semibold">{respondent}’s response</h3>
          <p className="t-meta">{roleOf(d.respondent_id)} · respondent</p>
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
