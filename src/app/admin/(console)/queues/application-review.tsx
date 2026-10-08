'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { adminReviewArbitrator } from '@/lib/actions/disputes';

export function ApplicationReview({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const approve = mode === 'approve';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => setMode('reject')}><X /> Reject</Button>
        <Button size="sm" onClick={() => setMode('approve')}><Check /> Approve</Button>
      </div>
      <ConfirmDialog
        open={mode !== null}
        onOpenChange={(o) => !o && setMode(null)}
        title={approve ? `Approve ${name} as an arbitrator?` : `Reject ${name}’s application?`}
        description={approve
          ? 'They can then switch on availability and be assigned cases where they have no conflict of interest.'
          : 'They are notified and can apply again later.'}
        confirmLabel={approve ? 'Approve' : 'Reject application'}
        tone={approve ? 'primary' : 'danger'}
        busy={busy}
        onConfirm={async () => {
          setBusy(true);
          setError(null);
          const r = await adminReviewArbitrator(userId, approve, note);
          setBusy(false);
          if (!r.ok) return setError(r.error.message);
          toast.success(approve ? `${name} is now an arbitrator` : 'Application rejected');
          setMode(null);
          setNote('');
          router.refresh();
        }}
      >
        <Field label="Note to the applicant" optional hint="Sent with the notification." error={error}>
          <Textarea rows={3} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </ConfirmDialog>
    </>
  );
}
