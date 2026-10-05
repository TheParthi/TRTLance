'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup } from '@/components/ui/field';
import { AmountInput, Input, Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { EscrowRail } from '@/components/common/escrow-rail';
import { Money } from '@/components/common/money';
import { TagInput } from '@/components/forms/tag-input';
import { RiskBadge } from '@/components/projects/risk-panel';
import { submitProposal } from '@/lib/actions/projects';
import { CURRENCY } from '@/lib/env';
import { proposalSegments } from '@/lib/escrow-summary';
import { formatAmount, microToAmount, parseAmount } from '@/lib/money';
import type { RiskLevel } from '@/lib/types';

interface Row { title: string; description: string; amount: string; due_in_days: string }

export function ProposalComposer({ projectId, budget, projectSkills, mySkills, initialMilestones, riskLevel, hasWallet }: {
  projectId: string;
  budget: string;
  projectSkills: string[];
  mySkills: string[];
  initialMilestones: Row[];
  riskLevel: RiskLevel | null;
  hasWallet: boolean;
}) {
  const router = useRouter();
  const [cover, setCover] = React.useState('');
  const [duration, setDuration] = React.useState(String(Math.max(...initialMilestones.map((m) => Number(m.due_in_days) || 0), 7)));
  const [skills, setSkills] = React.useState(mySkills.filter((s) => projectSkills.includes(s)));
  const [rows, setRows] = React.useState<Row[]>(initialMilestones);
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const submitted = React.useRef(false);

  const totalMicro = rows.reduce((s, r) => s + (parseAmount(r.amount) ?? 0n), 0n);
  const total = microToAmount(totalMicro);
  const budgetMicro = parseAmount(budget) ?? 0n;
  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const validate = () => {
    const e: Record<string, string> = {};
    if (cover.trim().length < 50) e.cover = `Write at least 50 characters (${cover.trim().length}/50).`;
    const d = Number(duration);
    if (!Number.isInteger(d) || d < 1 || d > 730) e.duration = 'Enter a whole number of days between 1 and 730.';
    rows.forEach((r, i) => {
      if (r.title.trim().length < 3) e[`t${i}`] = 'Add a title.';
      if (!parseAmount(r.amount)) e[`a${i}`] = 'Enter an amount.';
      const due = Number(r.due_in_days);
      if (!Number.isInteger(due) || due < 1 || (Number.isInteger(d) && due > d)) e[`d${i}`] = `Day 1–${d || 730}.`;
    });
    if (totalMicro <= 0n) e.total = 'The total must be more than zero.';
    return e;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (submitted.current) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return toast.error('Check the highlighted fields.');
    submitted.current = true;
    setBusy(true);
    const r = await submitProposal({
      project_id: projectId,
      cover_letter: cover,
      amount: total,
      duration_days: Number(duration),
      relevant_skills: skills,
      milestones: rows.map((m) => ({ ...m, due_in_days: Number(m.due_in_days) })),
    });
    if (!r.ok) {
      submitted.current = false;
      setBusy(false);
      return toast.error(r.error.message);
    }
    toast.success('Proposal sent. The client has been notified.');
    router.replace(`/projects/${projectId}`);
    router.refresh();
  };

  const railRows = rows.map((r, i) => ({ position: i + 1, title: r.title.trim() || `Milestone ${i + 1}`, amount: microToAmount(parseAmount(r.amount) ?? 0n) }));

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12" noValidate>
      <div className="min-w-0 space-y-5">
        {riskLevel && riskLevel !== 'low' && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-secondary">
            <RiskBadge level={riskLevel} />
            <span>The AI review flagged this project. Read the <Link className="link" href={`/projects/${projectId}#ai-risk-title`}>AI risk review</Link> and cover open questions in your proposal or milestones.</span>
          </p>
        )}
        <div className="statement space-y-8">
          <Field label="Cover letter" hint="Why you, how you’d approach it, and anything you need from the client." error={errors.cover}>
            <Textarea rows={9} value={cover} onChange={(e) => setCover(e.target.value)} maxLength={5000} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Total duration (days)" error={errors.duration}>
              <Input type="number" inputMode="numeric" min={1} max={730} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </Field>
            <Field label="Relevant skills" optional hint="Shown to the client next to your proposal.">
              <TagInput value={skills} onChange={setSkills} max={15} suggestions={projectSkills} placeholder="Add a skill" />
            </Field>
          </div>

          <section className="space-y-4 border-t pt-6" aria-labelledby="ms-title">
            <div className="space-y-0.5">
              <h2 id="ms-title" className="t-section-title">Milestones</h2>
              <p className="text-sm text-ink-secondary">Each milestone is paid separately when the client approves it. Your total is the sum of the milestones.</p>
            </div>
            <FieldGroup legend={<span className="sr-only">Milestone list</span>} error={errors.total}>
              <ol className="ledger">
                {rows.map((m, i) => (
                  <li key={i} className="space-y-3 py-5">
                    <div className="flex items-center justify-between">
                      <span className="t-label-caps">Milestone {i + 1}</span>
                      {rows.length > 1 && (
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove milestone ${i + 1}`} onClick={() => setRows((r) => r.filter((_, j) => j !== i))}><Trash2 /></Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_9rem_7rem]">
                      <Field label="Title" error={errors[`t${i}`]} className="col-span-2 sm:col-span-1"><Input value={m.title} maxLength={120} onChange={(e) => update(i, { title: e.target.value })} /></Field>
                      <Field label="Amount" error={errors[`a${i}`]}><AmountInput unit={CURRENCY} value={m.amount} onChange={(e) => update(i, { amount: e.target.value })} /></Field>
                      <Field label="Due by day" error={errors[`d${i}`]}><Input type="number" inputMode="numeric" min={1} value={m.due_in_days} onChange={(e) => update(i, { due_in_days: e.target.value })} /></Field>
                    </div>
                    <Field label="What you’ll deliver" optional>
                      <Textarea rows={2} value={m.description} maxLength={2000} onChange={(e) => update(i, { description: e.target.value })} />
                    </Field>
                  </li>
                ))}
              </ol>
            </FieldGroup>
            {rows.length < 20 && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setRows((r) => [...r, { title: '', description: '', amount: '', due_in_days: duration }])}><Plus /> Add milestone</Button>
            )}
          </section>
        </div>
      </div>

      <aside aria-labelledby="price-title" className="min-w-0">
        <div className="space-y-5 lg:sticky lg:top-20">
          <div className="space-y-1">
            <h2 id="price-title" className="t-label-caps">Your price</h2>
            <Money amount={total} size="xl" />
            <p className="text-xs text-ink-secondary">
              Client budget: {budget} {CURRENCY}
              {budgetMicro > 0n && totalMicro !== budgetMicro && <> · you are {totalMicro > budgetMicro ? 'above' : 'below'} it</>}
            </p>
          </div>
          <div className="space-y-2">
            <EscrowRail segments={proposalSegments(railRows)} label="Milestones you are proposing" />
            <ol className="space-y-1 text-xs text-ink-secondary">
              {railRows.map((r) => (
                <li key={r.position} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">{r.position}. {r.title}</span>
                  <span className="t-money shrink-0 text-ink">{formatAmount(r.amount)}</span>
                </li>
              ))}
            </ol>
          </div>
          <dl className="ledger text-sm">
            <div className="flex justify-between py-2"><dt className="text-ink-muted">Milestones</dt><dd>{rows.length}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-ink-muted">Duration</dt><dd>{duration || '—'} days</dd></div>
            <div className="flex justify-between py-2"><dt className="text-ink-muted">Platform fee</dt><dd>0 {CURRENCY}</dd></div>
          </dl>
          <p className="flex gap-2 text-xs text-ink-secondary"><Lock className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden /> If you’re hired, the client deposits this total into escrow before you start.</p>
          {!hasWallet && <p className="text-xs text-warning-strong">You’ll need a <Link className="underline" href="/wallet">verified wallet</Link> to sign the contract and receive payment.</p>}
          <Button type="submit" size="lg" className="w-full" loading={busy}>Send proposal</Button>
        </div>
      </aside>
    </form>
  );
}
