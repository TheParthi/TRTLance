'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Gavel, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { RadioCard, RadioGroup } from '@/components/ui/choice';
import { Field, FieldGroup } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { decideDispute, requestMoreEvidence, startDisputeReview } from '@/lib/actions/disputes';
import type { DisputeStatus } from '@/lib/types';
import { EscalateButton } from '../../../disputes/_components/escalate-button';
import { decisionLabel } from '../../../disputes/_components/labels';
import { SplitRows } from '../../../disputes/_components/split';

type Decision = 'freelancer' | 'client' | 'partial';

/** Case actions for the assigned arbitrator (or a platform admin). The database re-checks every rule. */
export function DecisionPanel({ disputeId, status, amount, isAssigned, isAdmin }: {
  disputeId: string;
  status: DisputeStatus;
  amount: string;
  isAssigned: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [starting, setStarting] = React.useState(false);
  const [evidenceOpen, setEvidenceOpen] = React.useState(false);
  const [decideOpen, setDecideOpen] = React.useState(false);

  const active = status === 'awaiting_evidence' || status === 'under_review';
  const canDecide = (isAssigned && active) || (isAdmin && status !== 'resolved');
  const canManage = (isAssigned || isAdmin) && active;

  if (status === 'resolved') {
    return (
      <section className="panel space-y-2 p-5" aria-labelledby="decision-panel-title">
        <h2 id="decision-panel-title" className="flex items-center gap-2 text-sm font-semibold"><Gavel className="size-4 text-brand" aria-hidden /> Decision recorded</h2>
        <p className="text-sm text-ink-secondary">This case is closed. The outcome and settlement status are shown in the Decision section.</p>
      </section>
    );
  }

  const start = async () => {
    setStarting(true);
    const r = await startDisputeReview(disputeId);
    setStarting(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success('Evidence window closed. Review started.');
    router.refresh();
  };

  return (
    <section className="panel space-y-5 p-5" aria-labelledby="decision-panel-title">
      <h2 id="decision-panel-title" className="flex items-center gap-2 text-sm font-semibold"><Gavel className="size-4 text-brand" aria-hidden /> Case actions</h2>
      {isAdmin && !isAssigned && (
        <Callout tone="info">You are acting as a platform admin. {status === 'open' || status === 'escalated' ? 'You can decide this case directly or assign an arbitrator from the admin queue.' : 'An arbitrator is assigned; decide only if the platform must step in.'}</Callout>
      )}
      <div className="flex flex-col gap-2">
        {canManage && status === 'awaiting_evidence' && (
          <Button variant="secondary" onClick={start} loading={starting}><Play /> Close evidence window and start review</Button>
        )}
        {canManage && <Button variant="secondary" onClick={() => setEvidenceOpen(true)}><CalendarPlus /> Request more evidence</Button>}
        {canDecide
          ? <Button onClick={() => setDecideOpen(true)}><Gavel /> Record decision</Button>
          : <p className="t-meta">{status === 'escalated' ? 'This case was escalated. The platform team decides it.' : 'You cannot decide this case in its current state.'}</p>}
      </div>
      {isAssigned && status !== 'escalated' && (
        <div className="border-t pt-4">
          <EscalateButton disputeId={disputeId} allowed explanation="Escalate if you cannot decide fairly, suspect fraud, or the case needs the platform team." size="sm" />
        </div>
      )}
      <RequestEvidenceDialog disputeId={disputeId} open={evidenceOpen} onOpenChange={setEvidenceOpen} />
      <DecideDialog disputeId={disputeId} amount={amount} open={decideOpen} onOpenChange={setDecideOpen} />
    </section>
  );
}

function RequestEvidenceDialog({ disputeId, open, onOpenChange }: { disputeId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [message, setMessage] = React.useState('');
  const [days, setDays] = React.useState(3);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Request more evidence"
      description="Both parties are notified and the case returns to collecting evidence until the new deadline."
      confirmLabel="Send request"
      busy={busy}
      onConfirm={async () => {
        if (message.trim().length < 10) return setError('Explain what is needed (at least 10 characters).');
        if (!Number.isInteger(days) || days < 1 || days > 7) return setError('Give 1–7 days.');
        setBusy(true);
        const r = await requestMoreEvidence(disputeId, { message: message.trim(), days });
        setBusy(false);
        if (!r.ok) return setError(r.error.message);
        toast.success('Evidence requested');
        onOpenChange(false);
        setMessage('');
        router.refresh();
      }}
    >
      <div className="space-y-4">
        <Field label="What do you need from the parties?" error={error}>
          <Textarea rows={4} value={message} maxLength={2000} onChange={(e) => { setMessage(e.target.value); setError(null); }} />
        </Field>
        <Field label="Days to respond" hint="1–7 days.">
          <Input type="number" min={1} max={7} value={days} className="w-24" onChange={(e) => setDays(Math.round(Number(e.target.value)))} />
        </Field>
      </div>
    </ConfirmDialog>
  );
}

function DecideDialog({ disputeId, amount, open, onOpenChange }: { disputeId: string; amount: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [decision, setDecision] = React.useState<Decision | ''>('');
  const [pct, setPct] = React.useState(50);
  const [reason, setReason] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const effectivePct = decision === 'freelancer' ? 100 : decision === 'client' ? 0 : pct;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record your decision"
      description="Decisions are final on TrustLance. Both parties read your reasoning, and the escrow contract pays out exactly this split when settled."
      confirmLabel="Record final decision"
      busy={busy}
      onConfirm={async () => {
        const e: Record<string, string> = {};
        if (!decision) e.decision = 'Choose an outcome.';
        if (decision === 'partial' && (pct < 1 || pct > 99)) e.pct = 'A partial outcome needs a freelancer share of 1–99%.';
        if (reason.trim().length < 50) e.reason = `Explain the decision in at least 50 characters (${reason.trim().length} so far).`;
        setErrors(e);
        if (Object.keys(e).length || !decision) return;
        setBusy(true);
        const r = await decideDispute(disputeId, { decision, freelancerPct: decision === 'partial' ? pct : null, reason: reason.trim() });
        setBusy(false);
        if (!r.ok) return setErrors({ form: r.error.message });
        toast.success('Decision recorded. Funds move when the escrow contract settles it.');
        onOpenChange(false);
        router.refresh();
      }}
    >
      <div className="space-y-5">
        <FieldGroup legend="Outcome" error={errors.decision}>
          <RadioGroup value={decision} onValueChange={(v) => setDecision(v as Decision)} className="grid gap-2" aria-label="Outcome">
            <RadioCard value="freelancer" title="Freelancer receives 100%" description="Full payment of the milestone." />
            <RadioCard value="client" title="Client is refunded 100%" description="The milestone amount returns to the client." />
            <RadioCard value="partial" title="Split" description="Part to the freelancer, the rest refunded." />
          </RadioGroup>
        </FieldGroup>
        {decision === 'partial' && (
          <Field label="Freelancer’s share (%)" error={errors.pct} hint="1–99%.">
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={99} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="flex-1 accent-brand" aria-label="Freelancer share slider" />
              <Input type="number" min={1} max={99} value={pct} className="w-20" aria-label="Freelancer share in percent"
                onChange={(e) => setPct(Math.max(1, Math.min(99, Math.round(Number(e.target.value) || 1))))} />
            </div>
          </Field>
        )}
        {decision && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{decisionLabel(decision, effectivePct)}</p>
            <SplitRows amount={amount} pct={effectivePct} />
          </div>
        )}
        <Field label="Reasoning" error={errors.reason} hint="Refer to the contract terms and evidence. At least 50 characters.">
          <Textarea rows={6} value={reason} maxLength={5000} onChange={(e) => setReason(e.target.value)} />
        </Field>
        {errors.form && <Callout tone="danger" role="alert">{errors.form}</Callout>}
      </div>
    </ConfirmDialog>
  );
}
