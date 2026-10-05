'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MessagesSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { cancelProject, startConversation, withdrawProposal } from '@/lib/actions/projects';

export function CloseProjectButton({ projectId, proposalCount, variant = 'danger-outline', className }: {
  projectId: string;
  proposalCount: number;
  variant?: 'danger-outline' | 'ghost';
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const confirm = async () => {
    setBusy(true);
    const r = await cancelProject(projectId, reason);
    setBusy(false);
    if (!r.ok) return toast.error(r.error.message);
    setOpen(false);
    toast.success('Project closed');
    router.refresh();
  };
  return (
    <>
      <Button variant={variant} className={className} onClick={() => setOpen(true)}>Close project</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Close this project?"
        description={proposalCount ? `The ${proposalCount} pending proposal${proposalCount === 1 ? '' : 's'} will be declined and the freelancers notified.` : 'It will stop accepting proposals.'}
        confirmLabel="Close project"
        tone="danger"
        busy={busy}
        onConfirm={confirm}
      >
        <Field label="Message to applicants" optional>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </Field>
      </ConfirmDialog>
    </>
  );
}

export function WithdrawProposalButton({ proposalId, projectId, variant = 'secondary', className }: {
  proposalId: string;
  projectId: string;
  variant?: 'secondary' | 'ghost';
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  return (
    <>
      <Button variant={variant} className={className} onClick={() => setOpen(true)}>Withdraw proposal</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Withdraw your proposal?"
        description="The client will no longer be able to hire you from it. You can send a new proposal while the project is open."
        confirmLabel="Withdraw"
        tone="danger"
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          const r = await withdrawProposal(proposalId, projectId);
          setBusy(false);
          if (!r.ok) return toast.error(r.error.message);
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

export function MessageButton({ proposalId, label = 'Message', variant = 'secondary', className }: {
  proposalId: string;
  label?: string;
  variant?: 'secondary' | 'ghost';
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      variant={variant}
      className={className}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        const r = await startConversation(proposalId);
        setBusy(false);
        if (!r.ok) return toast.error(r.error.message);
        router.push(`/messages/${r.data}`);
      }}
    >
      {!busy && <MessagesSquare />} {label}
    </Button>
  );
}
