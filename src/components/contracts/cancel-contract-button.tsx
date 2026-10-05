'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { cancelContract } from '@/lib/actions/contracts';

export function CancelContractButton({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [reason, setReason] = React.useState('');
  return (
    <>
      <Button variant="ghost" className="text-danger-strong" onClick={() => setOpen(true)}>Cancel contract</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Cancel this contract?"
        description="Possible only before escrow is funded. The project reopens for proposals and the other party is notified."
        confirmLabel="Cancel contract"
        tone="danger"
        busy={busy}
        onConfirm={async () => {
          if (reason.trim().length < 10) return toast.error('Explain why (at least 10 characters).');
          setBusy(true);
          const r = await cancelContract(contractId, reason);
          setBusy(false);
          if (!r.ok) return toast.error(r.error.message);
          setOpen(false);
          router.refresh();
        }}
      >
        <Field label="Reason">
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </Field>
      </ConfirmDialog>
    </>
  );
}
