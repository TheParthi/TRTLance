'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, CircleHelp, Gauge, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { formatDateTime } from '@/lib/format';
import type { RiskLevel, RiskReport } from '@/lib/types';
import { cn } from '@/lib/utils';

const levelMeta: Record<RiskLevel, { label: string; tone: 'success' | 'warning' | 'danger'; Icon: typeof Gauge }> = {
  low: { label: 'Low risk', tone: 'success', Icon: CheckCircle2 },
  medium: { label: 'Some risk', tone: 'warning', Icon: AlertTriangle },
  high: { label: 'High risk', tone: 'danger', Icon: AlertTriangle },
};

const dimensions: { key: keyof RiskReport['result']['dimensions']; label: string }[] = [
  { key: 'scope_clarity', label: 'Scope clarity' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'budget', label: 'Budget' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'dispute_likelihood', label: 'Dispute likelihood' },
];

const fieldLabels: Record<string, string> = {
  title: 'title', description: 'description', category: 'category', skills: 'skills', experience_level: 'experience level',
  budget: 'budget', currency: 'currency', start_date: 'start date', due_date: 'due date', deliverables: 'deliverables',
  milestone_plan: 'suggested milestones',
};

/** AI risk review: clearly labelled as AI output, with what it analysed and its limits. */
export function RiskPanel({ projectId, initial, canGenerate }: { projectId: string; initial: RiskReport | null; canGenerate: boolean }) {
  const [report, setReport] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/project-risk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const body = await res.json();
      if (!res.ok) setError(body.error?.message ?? 'The AI review could not be generated.');
      else setReport(body.report);
    } catch {
      setError('The AI review could not be reached. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="ai-risk-title" className="panel overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b bg-surface-subtle px-5 py-3">
        <h2 id="ai-risk-title" className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-brass" aria-hidden /> AI project risk review
        </h2>
        <Badge tone="brass">AI-generated · advisory</Badge>
      </header>
      <div className="space-y-5 p-5">
        {!report && (
          <div className="space-y-3">
            <p className="text-sm text-ink-secondary">
              Get a quick, independent read on scope clarity, timeline, budget, milestones and dispute risk before you apply.
            </p>
            {error && <Callout tone="danger" role="alert">{error}</Callout>}
            {canGenerate ? (
              <Button variant="secondary" onClick={generate} loading={busy}>{!busy && <Sparkles />} Generate AI review</Button>
            ) : (
              <p className="t-meta">Sign in to generate an AI review.</p>
            )}
          </div>
        )}
        {report && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <RiskBadge level={report.result.overall} large />
              <p className="text-sm text-ink-secondary">{report.result.summary}</p>
            </div>
            <ul className="divide-y rounded-lg border">
              {dimensions.map(({ key, label }) => {
                const d = report.result.dimensions[key];
                return (
                  <li key={key} className="grid gap-1 p-3 sm:grid-cols-[10rem_7rem_1fr] sm:items-start sm:gap-3">
                    <span className="text-sm font-medium">{label}</span>
                    <span><RiskBadge level={d.level} /></span>
                    <span className="text-sm text-ink-secondary">{d.explanation}</span>
                  </li>
                );
              })}
            </ul>
            {report.result.missing_information.length > 0 && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold"><CircleHelp className="size-4 text-ink-muted" aria-hidden /> Questions to ask the client</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-ink-secondary">
                  {report.result.missing_information.map((q) => <li key={q}>{q}</li>)}
                </ul>
              </div>
            )}
            <footer className="space-y-1 border-t pt-4 text-xs text-ink-muted">
              <p>Generated {formatDateTime(report.generated_at)} by {report.model.replace(/^googleai\//, '')} from the project’s {report.analyzed_fields.map((f) => fieldLabels[f] ?? f).join(', ')}.</p>
              <p>This is an automated opinion based only on what the client wrote. It is not a verified fact, legal advice or a guarantee. Verified facts about the client are shown separately.</p>
            </footer>
          </>
        )}
      </div>
    </section>
  );
}

export function RiskBadge({ level, large }: { level: RiskLevel; large?: boolean }) {
  const { label, tone, Icon } = levelMeta[level];
  return (
    <Badge tone={tone} className={cn(large && 'px-3 py-1 text-sm')}>
      <Icon /> {label}
    </Badge>
  );
}
