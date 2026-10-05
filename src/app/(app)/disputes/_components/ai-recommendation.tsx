'use client';

import * as React from 'react';
import { CircleHelp, ListChecks, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { formatDateTime } from '@/lib/format';
import type { DisputeRecommendation } from '@/lib/types';
import { decisionLabel } from './labels';
import { SplitRows } from './split';

const sourceLabels: Record<string, string> = {
  contract_terms: 'contract terms',
  milestone: 'milestone details',
  dispute_statement: 'the opening statement',
  respondent_notes: 'the respondent’s notes',
  submissions: 'work submissions',
  evidence: 'evidence titles, descriptions and links',
  messages: 'case messages',
};

function describeSource(s: string) {
  const [key, count] = s.split(':');
  const label = sourceLabels[key] ?? key.replace(/_/g, ' ');
  return count ? `${label} (${count})` : label;
}

const confidenceTone = { low: 'warning', medium: 'info', high: 'success' } as const;

/**
 * AI recommendation for a case. Always labelled as advisory and kept apart from the facts:
 * a person decides. Arbitrators and admins can generate one; parties can only read it.
 */
export function AiRecommendationPanel({ disputeId, amount, initial, canGenerate, generateDisabledReason }: {
  disputeId: string;
  amount: string;
  initial: DisputeRecommendation | null;
  canGenerate: boolean;
  generateDisabledReason?: string;
}) {
  const [rec, setRec] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/dispute-recommendation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ disputeId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error?.message ?? 'The AI recommendation could not be generated. Nothing was saved.');
      else setRec(body.recommendation as DisputeRecommendation);
    } catch {
      setError('The AI service could not be reached. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const r = rec?.result;
  return (
    <section aria-labelledby="ai-rec-title" className="panel overflow-hidden border-brass/30">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-brass-soft/40 px-5 py-3">
        <h2 id="ai-rec-title" className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-brass" aria-hidden /> AI case analysis
        </h2>
        <Badge tone="brass">AI-generated · advisory</Badge>
      </header>
      <div className="space-y-5 p-5" aria-live="polite">
        {!rec && (
          <p className="text-sm text-ink-secondary">
            {canGenerate
              ? 'Generate an independent summary of the case file: key facts, open questions and a suggested outcome. It is a starting point for your own review — you make the decision.'
              : 'No AI analysis has been generated for this case. The arbitrator may request one; it would be advisory only.'}
          </p>
        )}
        {error && <Callout tone="danger" role="alert">{error}</Callout>}

        {r && rec && (
          <>
            <div className="space-y-2">
              <p className="t-eyebrow">Suggested outcome (not a decision)</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{decisionLabel(r.suggested_outcome, r.suggested_freelancer_pct)}</span>
                <Badge tone={confidenceTone[r.confidence]}>{r.confidence} confidence</Badge>
              </div>
              <SplitRows amount={amount} pct={r.suggested_freelancer_pct} />
            </div>
            <p className="whitespace-pre-line text-sm text-ink-secondary">{r.summary}</p>
            {r.key_facts.length > 0 && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><ListChecks className="size-4 text-ink-muted" aria-hidden /> Facts the analysis relied on</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-ink-secondary">{r.key_facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
              </div>
            )}
            {r.open_questions.length > 0 && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><CircleHelp className="size-4 text-ink-muted" aria-hidden /> Open questions</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-ink-secondary">{r.open_questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
              </div>
            )}
            <details className="rounded-lg border p-3 text-sm">
              <summary className="cursor-pointer font-medium">Reasoning</summary>
              <p className="mt-2 whitespace-pre-line text-ink-secondary">{r.reasoning}</p>
            </details>
            <footer className="space-y-1 border-t pt-4 text-xs text-ink-muted">
              <p>Generated {formatDateTime(rec.generated_at)} by {rec.model.replace(/^googleai\//, '')} from {rec.analyzed_sources.map(describeSource).join(', ')}.</p>
              <p>
                Limitations: the model read only text in the case file — it did not open uploaded files, visit links or verify any
                claim, and it can be wrong. It is not a ruling, legal advice or a statement of fact. The arbitrator’s decision is the only outcome that counts.
              </p>
            </footer>
          </>
        )}

        {canGenerate && (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={generate} loading={busy} disabled={Boolean(generateDisabledReason)}>
              {!busy && <Sparkles />} {rec ? 'Regenerate AI recommendation' : 'Generate AI recommendation'}
            </Button>
            {generateDisabledReason && <p className="t-meta">{generateDisabledReason}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
