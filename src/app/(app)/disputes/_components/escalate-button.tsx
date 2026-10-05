'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { escalateDispute } from '@/lib/actions/disputes';

/** Escalation to the platform team. When not allowed, stays visible but disabled with the reason. */
export function EscalateButton({ disputeId, allowed, explanation, size = 'md' }: {
  disputeId: string;
  allowed: boolean;
  explanation: string;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const hintId = React.useId();

  return (
    <div className="space-y-1.5">
      <Button variant="danger-outline" size={size} disabled={!allowed} aria-describedby={hintId} onClick={() => setOpen(true)}>
        <Flag /> Escalate to TrustLance
      </Button>
      <p id={hintId} className="t-meta">{explanation}</p>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Escalate this case?"
        description="The TrustLance platform team takes over and decides. The milestone stays frozen until then."
        confirmLabel="Escalate case"
        tone="danger"
        busy={busy}
        onConfirm={async () => {
          if (reason.trim().length < 10) return setError('Explain why this needs escalation (at least 10 characters).');
          setBusy(true);
          const r = await escalateDispute(disputeId, reason);
          setBusy(false);
          if (!r.ok) return setError(r.error.message);
          toast.success('Case escalated to the platform team');
          setOpen(false);
          router.refresh();
        }}
      >
        <Field label="Why does this need escalation?" error={error}>
          <Textarea rows={4} value={reason} maxLength={2000} onChange={(e) => { setReason(e.target.value); setError(null); }} />
        </Field>
      </ConfirmDialog>
    </div>
  );
}
