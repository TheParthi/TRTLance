'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { completeWithdrawal, failWithdrawal, reviewPayoutAccount } from '@/lib/actions/coins';
import { formatAmount, formatRupees } from '@/lib/money';

/** Approve or reject a member's bank account and PAN. */
export function BankAccountReview({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [dialog, setDialog] = React.useState<null | 'approve' | 'reject'>(null);
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const submit = async (approve: boolean) => {
    if (!approve && note.trim().length < 10) return toast.error('Tell the member what is wrong (at least 10 characters).');
    setBusy(true);
    const r = await reviewPayoutAccount(userId, approve, note.trim());
    setBusy(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success(approve ? `${name}’s bank account is verified.` : `${name} was asked to fix their details.`);
    setDialog(null);
    setNote('');
    router.refresh();
  };
  return (
    <div className="flex shrink-0 gap-2">
      <Button size="sm" onClick={() => setDialog('approve')}><Check /> Verify</Button>
      <Button size="sm" variant="secondary" onClick={() => setDialog('reject')}><X /> Reject</Button>
      <ConfirmDialog
        open={dialog === 'approve'}
        onOpenChange={(o) => setDialog(o ? 'approve' : null)}
        title={`Verify ${name}’s bank account?`}
        description="Confirm the account holder name matches the PAN and the bank account (for example with a penny-drop check). They can then withdraw."
        confirmLabel="Verify"
        busy={busy}
        onConfirm={() => submit(true)}
      />
      <ConfirmDialog
        open={dialog === 'reject'}
        onOpenChange={(o) => setDialog(o ? 'reject' : null)}
        title={`Reject ${name}’s bank details?`}
        confirmLabel="Reject"
        tone="danger"
        busy={busy}
        onConfirm={() => submit(false)}
      >
        <Field label="What should they fix" hint="The member sees this message.">
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </Field>
      </ConfirmDialog>
    </div>
  );
}

/** Mark a withdrawal as paid (with the bank reference) or return it to the member's earnings. */
export function WithdrawalActions({ id, label, coins, amountPaise }: { id: string; label: string; coins: number; amountPaise: number }) {
  const router = useRouter();
  const [dialog, setDialog] = React.useState<null | 'paid' | 'reject'>(null);
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const close = () => {
    setDialog(null);
    setText('');
  };
  const submit = async () => {
    setBusy(true);
    const r = dialog === 'paid' ? await completeWithdrawal(id, text.trim()) : await failWithdrawal(id, text.trim());
    setBusy(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success(dialog === 'paid' ? `${label} marked as paid.` : `${label} was returned to the member.`);
    close();
    router.refresh();
  };
  return (
    <div className="flex shrink-0 gap-2">
      <Button size="sm" onClick={() => setDialog('paid')}><Check /> Mark as paid</Button>
      <Button size="sm" variant="secondary" onClick={() => setDialog('reject')}><X /> Reject</Button>
      <ConfirmDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && close()}
        title={dialog === 'paid' ? `Mark ${label} as paid?` : `Reject ${label}?`}
        description={dialog === 'paid'
          ? `Only after you have sent ${formatRupees(amountPaise)} to the account shown. The member is notified with the reference.`
          : `${formatAmount(coins)} go back to the member’s withdrawable balance.`}
        confirmLabel={dialog === 'paid' ? 'Mark as paid' : 'Reject withdrawal'}
        tone={dialog === 'paid' ? 'primary' : 'danger'}
        busy={busy}
        onConfirm={submit}
      >
        {dialog === 'paid' ? (
          <Field label="Bank transfer reference (UTR)">
            <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={100} autoComplete="off" />
          </Field>
        ) : (
          <Field label="Reason" hint="The member sees this message.">
            <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
          </Field>
        )}
      </ConfirmDialog>
    </div>
  );
}
