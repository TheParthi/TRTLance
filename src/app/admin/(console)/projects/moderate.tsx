'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, EyeOff, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { moderateProject } from '@/lib/actions/admin';
import type { ModerationState } from '@/lib/data/admin';

/**
 * Flag, remove or clear one project.
 *
 * Flagging leaves it in the marketplace but tells the client it needs changes; removing takes it out
 * of search, lists and its own page for everyone except the client, the hired freelancer and admins.
 * Neither touches a contract that already came from the brief — money in escrow is governed by the
 * contract, not the listing — and the dialogs say so, because that is the question an admin will
 * have at the moment of clicking.
 */
export function ModerateProject({ projectId, title, state }: {
  projectId: string;
  title: string;
  state: ModerationState;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState<null | ModerationState>(null);
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const close = () => {
    setOpen(null);
    setReason('');
  };

  const run = async () => {
    if (!open) return;
    setBusy(true);
    const result = await moderateProject(projectId, open, reason);
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success({
      ok: 'The project is live again and the client has been told.',
      flagged: 'The project is flagged and the client has been told what to fix.',
      removed: 'The project has been removed from the marketplace.',
    }[open]);
    close();
    router.refresh();
  };

  const short = title.length > 50 ? `${title.slice(0, 50)}…` : title;

  return (
    <div className="flex shrink-0 flex-wrap justify-end gap-2">
      {state !== 'ok' && <Button size="sm" variant="secondary" onClick={() => setOpen('ok')}><Check /> Clear</Button>}
      {state !== 'flagged' && <Button size="sm" variant="secondary" onClick={() => setOpen('flagged')}><Flag /> Flag</Button>}
      {state !== 'removed' && <Button size="sm" variant="danger-outline" onClick={() => setOpen('removed')}><EyeOff /> Remove</Button>}

      <ConfirmDialog
        open={open === 'flagged'}
        onOpenChange={(next) => !next && close()}
        title={`Flag “${short}”?`}
        description="It stays in the marketplace and keeps taking proposals. The client is told what to fix and is sent to the edit page."
        confirmLabel="Flag the project"
        busy={busy}
        onConfirm={run}
      >
        <Field label="What should they fix" hint="The client sees this. At least 10 characters.">
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === 'removed'}
        onOpenChange={(next) => !next && close()}
        title={`Remove “${short}” from the marketplace?`}
        description="It disappears from search, from every list and from its own page — for everyone except the client, the hired freelancer and admins. A contract that already came from this brief is unaffected: coins in escrow are governed by the contract, not the listing."
        confirmLabel="Remove the project"
        tone="danger"
        busy={busy}
        onConfirm={run}
      >
        <Field label="Reason" hint="The client sees this. At least 10 characters.">
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === 'ok'}
        onOpenChange={(next) => !next && close()}
        title={`Clear the note on “${short}”?`}
        description="The project goes back exactly as it was — the same visibility and status it had before — and the client is told it is live again."
        confirmLabel="Clear"
        busy={busy}
        onConfirm={run}
      />
    </div>
  );
}
