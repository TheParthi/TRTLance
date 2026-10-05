'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Checkbox, RadioCard, RadioGroup } from '@/components/ui/choice';
import { Field, FieldGroup } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { Money } from '@/components/common/money';
import { StatusBadge } from '@/components/common/status-badge';
import { StepList, StepProgress } from '@/components/forms/step-progress';
import { openDispute } from '@/lib/actions/disputes';
import type { DisputableContract } from '@/lib/data/disputes';
import { formatDate } from '@/lib/format';
import { disputeReasonLabel, milestoneStatus } from '@/lib/status';
import type { Dispute } from '@/lib/types';
import { EvidenceComposer, submitEvidence, validateDrafts, type EvidenceDraft } from '../_components/evidence-composer';
import { requestedOutcomeLabel } from '../_components/labels';
import { SplitRows } from '../_components/split';

const STEPS = ['Contract & milestone', 'Reason', 'Requested outcome', 'Evidence', 'Review & confirm'];
const HEADINGS = ['Which milestone is in dispute?', 'What went wrong?', 'What outcome are you asking for?', 'Add your evidence', 'Review and open the dispute'];

type Reason = Dispute['reason'];
type Outcome = Dispute['requested_outcome'];

export function DisputeWizard({ contracts, initialContractId, initialMilestoneId }: {
  contracts: DisputableContract[];
  initialContractId: string;
  initialMilestoneId: string;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(initialContractId && initialMilestoneId ? 1 : 0);
  const [contractId, setContractId] = React.useState(initialContractId);
  const [milestoneId, setMilestoneId] = React.useState(initialMilestoneId);
  const [reason, setReason] = React.useState<Reason | ''>('');
  const [description, setDescription] = React.useState('');
  const [outcome, setOutcome] = React.useState<Outcome | ''>('');
  const [pct, setPct] = React.useState(50);
  const [drafts, setDrafts] = React.useState<EvidenceDraft[]>([]);
  const [confirmed, setConfirmed] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [phase, setPhase] = React.useState<'idle' | 'opening' | 'uploading'>('idle');
  const idempotencyKey = React.useRef<string | null>(null);
  const heading = React.useRef<HTMLHeadingElement>(null);
  const mounted = React.useRef(false);

  const contract = contracts.find((c) => c.id === contractId);
  const milestone = contract?.milestones.find((m) => m.id === milestoneId);
  const requestedPct = outcome === 'release' ? 100 : outcome === 'refund' ? 0 : pct;

  React.useEffect(() => {
    if (mounted.current) heading.current?.focus();
    mounted.current = true;
  }, [step]);

  const validate = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!contract) e.contract = 'Choose a contract.';
      else if (!milestone) e.milestone = 'Choose the milestone in dispute.';
    }
    if (s === 1) {
      if (!reason) e.reason = 'Choose a reason.';
      if (description.trim().length < 50) e.description = `Describe the problem in at least 50 characters (${description.trim().length} so far).`;
    }
    if (s === 2) {
      if (!outcome) e.outcome = 'Choose the outcome you are asking for.';
      if (outcome === 'partial' && (pct < 1 || pct > 99)) e.pct = 'Choose a share between 1% and 99%.';
    }
    if (s === 3) Object.assign(e, validateDrafts(drafts));
    if (s === 4 && !confirmed) e.confirm = 'Confirm that you understand what happens next.';
    return e;
  };

  const go = (target: number) => {
    if (target > step) {
      for (let s = step; s < target; s++) {
        const e = validate(s);
        if (Object.keys(e).length) {
          setErrors(e);
          setStep(s);
          return;
        }
      }
    }
    setErrors({});
    setStep(target);
  };

  const submit = async () => {
    for (let s = 0; s < STEPS.length; s++) {
      const e = validate(s);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(s);
        return;
      }
    }
    if (!contract || !milestone || !reason || !outcome) return;
    setPhase('opening');
    idempotencyKey.current ??= crypto.randomUUID();
    const r = await openDispute({
      contractId: contract.id,
      milestoneId: milestone.id,
      reason,
      description: description.trim(),
      requestedOutcome: outcome,
      requestedFreelancerPct: outcome === 'partial' ? pct : null,
      idempotencyKey: idempotencyKey.current,
    });
    if (!r.ok) {
      setPhase('idle');
      return toast.error(r.error.message);
    }
    if (drafts.length) {
      setPhase('uploading');
      const up = await submitEvidence(r.data, drafts);
      if (up.error || up.failed.length) {
        toast.warning('The dispute is open, but some evidence was not saved. Add it again from the case page.', { duration: 10000 });
      }
    }
    toast.success('Dispute opened');
    router.push(`/disputes/${r.data}`);
  };

  const busy = phase !== 'idle';

  return (
    <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
      <aside className="hidden lg:block">
        <div className="sticky top-20"><StepList steps={STEPS} current={step} onSelect={busy ? undefined : go} /></div>
      </aside>
      <div className="min-w-0 space-y-6">
        <div className="lg:hidden"><StepProgress steps={STEPS} current={step} /></div>
        <section className="panel space-y-6 p-5 md:p-8" aria-labelledby="dispute-step-title">
          <div className="space-y-1">
            <p className="t-eyebrow">Step {step + 1} of {STEPS.length}</p>
            <h2 id="dispute-step-title" ref={heading} tabIndex={-1} className="t-page-title outline-none">{HEADINGS[step]}</h2>
          </div>

          {step === 0 && (
            <div className="space-y-6">
              <Field label="Contract" error={errors.contract}>
                <Select value={contractId} onChange={(e) => { setContractId(e.target.value); setMilestoneId(''); }}>
                  <option value="">Choose a contract…</option>
                  {contracts.map((c) => <option key={c.id} value={c.id}>{c.title} (you are the {c.role})</option>)}
                </Select>
              </Field>
              {contract && (
                <FieldGroup legend="Milestone" hint="Only milestones whose funds are still in escrow can be disputed." error={errors.milestone}>
                  <RadioGroup value={milestoneId} onValueChange={setMilestoneId} className="grid gap-2" aria-label="Milestone">
                    {contract.milestones.map((m) => (
                      <RadioCard key={m.id} value={m.id}
                        title={`${m.position}. ${m.title}`}
                        description={<span className="mt-1 flex flex-wrap items-center gap-2"><Money amount={m.amount} size="sm" /><StatusBadge meta={milestoneStatus[m.status]} describe={false} />{m.due_date && <span className="t-meta">Due {formatDate(m.due_date)}</span>}</span>} />
                    ))}
                  </RadioGroup>
                </FieldGroup>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <FieldGroup legend="Reason" error={errors.reason}>
                <RadioGroup value={reason} onValueChange={(v) => setReason(v as Reason)} className="grid gap-2 sm:grid-cols-2" aria-label="Reason">
                  {(Object.keys(disputeReasonLabel) as Reason[]).map((k) => <RadioCard key={k} value={k} title={disputeReasonLabel[k]} />)}
                </RadioGroup>
              </FieldGroup>
              <Field label="Describe the problem" error={errors.description}
                hint="Be factual: what was agreed, what happened, what you have already tried. The other party and the arbitrator will read this. At least 50 characters.">
                <Textarea rows={8} value={description} maxLength={5000} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              <p className="t-meta" aria-live="polite">{description.trim().length} / 5,000 characters</p>
            </div>
          )}

          {step === 2 && milestone && (
            <div className="space-y-6">
              <FieldGroup legend="Requested outcome" error={errors.outcome}>
                <RadioGroup value={outcome} onValueChange={(v) => setOutcome(v as Outcome)} className="grid gap-2" aria-label="Requested outcome">
                  <RadioCard value="release" title="Release to the freelancer" description="The full milestone amount is paid to the freelancer." />
                  <RadioCard value="refund" title="Refund the client" description="The full milestone amount is returned to the client." />
                  <RadioCard value="partial" title="Split it" description="Part goes to the freelancer, the rest back to the client." />
                </RadioGroup>
              </FieldGroup>
              {outcome === 'partial' && (
                <Field label="Freelancer’s share (%)" error={errors.pct} hint="Between 1% and 99%. The rest returns to the client.">
                  <div className="flex items-center gap-3">
                    <input type="range" min={1} max={99} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="flex-1 accent-brand" aria-label="Freelancer share slider" />
                    <Input type="number" min={1} max={99} value={pct} className="w-20" aria-label="Freelancer share in percent"
                      onChange={(e) => setPct(Math.max(1, Math.min(99, Math.round(Number(e.target.value) || 1))))} />
                  </div>
                </Field>
              )}
              {outcome && <SplitRows amount={milestone.amount} pct={requestedPct} />}
              <p className="t-meta">This is your request. The arbitrator decides the final split after reviewing both sides.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-ink-secondary">Add files, links and notes that support your case. They are uploaded right after the dispute is opened. You can add more later, until the case is decided.</p>
              <EvidenceComposer drafts={drafts} onChange={setDrafts} errors={errors} disabled={busy} />
            </div>
          )}

          {step === 4 && contract && milestone && reason && outcome && (
            <div className="space-y-6">
              <dl className="divide-y rounded-lg border text-sm">
                {([
                  ['Contract', contract.title, 0],
                  ['Milestone', <span key="m">{milestone.position}. {milestone.title} · <Money amount={milestone.amount} size="sm" /></span>, 0],
                  ['Reason', disputeReasonLabel[reason], 1],
                  ['Description', <span key="d" className="line-clamp-4 whitespace-pre-line">{description.trim()}</span>, 1],
                  ['Requested outcome', requestedOutcomeLabel(outcome, requestedPct), 2],
                  ['Evidence', drafts.length ? `${drafts.length} item${drafts.length === 1 ? '' : 's'}` : 'None yet', 3],
                ] as [string, React.ReactNode, number][]).map(([label, value, target]) => (
                  <div key={label} className="grid grid-cols-[7rem_1fr_auto] items-start gap-3 p-3 sm:grid-cols-[10rem_1fr_auto]">
                    <dt className="text-ink-muted">{label}</dt>
                    <dd className="min-w-0 break-words">{value}</dd>
                    <button type="button" className="link text-xs" disabled={busy} onClick={() => go(target)}>Edit<span className="sr-only"> {label}</span></button>
                  </div>
                ))}
              </dl>
              <Callout tone="warning" title="What opening a dispute does">
                <ul className="list-disc space-y-1 pl-5">
                  <li>The milestone is frozen. Release is blocked until the dispute is decided.</li>
                  <li>An independent arbitrator with no history with either of you is assigned. Both sides get 3 days to add evidence.</li>
                  <li>You will need to flag the milestone on-chain from your verified wallet so the arbiter can settle the decision.</li>
                  <li>The decision is final on TrustLance and the losing party’s record shows a lost dispute.</li>
                </ul>
              </Callout>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox checked={confirmed} onCheckedChange={(v) => { setConfirmed(v === true); setErrors({}); }} aria-describedby={errors.confirm ? 'confirm-error' : undefined} />
                <span>I understand that the milestone is frozen, release is blocked until the dispute is decided, and that I need to flag it on-chain.</span>
              </label>
              {errors.confirm && <p id="confirm-error" role="alert" className="text-xs font-medium text-danger-strong">{errors.confirm}</p>}
              <p className="flex items-center gap-2 text-xs text-ink-muted"><Lock className="size-3.5" aria-hidden /> No money moves when you open a dispute.</p>
              <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-between">
                <Button variant="ghost" disabled={busy} onClick={() => go(3)}><ArrowLeft /> Back</Button>
                <Button size="lg" variant="danger" onClick={submit} loading={busy}>
                  {phase === 'uploading' ? 'Uploading evidence…' : phase === 'opening' ? 'Opening dispute…' : <><AlertTriangle /> Open dispute</>}
                </Button>
              </div>
            </div>
          )}

          {step < 4 && (
            <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-between">
              {step > 0 ? <Button variant="ghost" onClick={() => go(step - 1)}><ArrowLeft /> Back</Button> : <span />}
              <Button onClick={() => go(step + 1)}>Continue <ArrowRight /></Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
