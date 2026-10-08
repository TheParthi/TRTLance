'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Ban, ShieldCheck, ShieldMinus, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { setAdminRole, setMemberSuspended } from '@/lib/actions/admin';

/**
 * The two decisions an admin can make about an account, each behind a confirmation that spells out
 * what will actually happen. Both are refused by the database in the cases that would be a mistake —
 * suspending yourself or another admin, removing the last admin — so the messages here explain the
 * rule rather than trying to enforce it.
 */
export function MemberActions({ userId, name, suspended, isAdmin, isSelf }: {
  userId: string;
  name: string;
  suspended: boolean;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState<null | 'suspend' | 'reinstate' | 'grant' | 'revoke'>(null);
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const close = () => {
    setOpen(null);
    setText('');
  };

  const run = async () => {
    setBusy(true);
    const result = open === 'suspend' ? await setMemberSuspended(userId, true, text)
      : open === 'reinstate' ? await setMemberSuspended(userId, false, '')
      : open === 'grant' ? await setAdminRole(userId, true, text)
      : await setAdminRole(userId, false, '');
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success({
      suspend: `${name} is suspended and has been told why.`,
      reinstate: `${name} can use TrustLance again.`,
      grant: `${name} is now a platform admin.`,
      revoke: `${name} is no longer an admin.`,
    }[open!]);
    close();
    router.refresh();
  };

  if (isSelf) {
    return (
      <p className="max-w-reading t-meta">
        This is your own account. Another admin has to suspend it or change its admin role — nobody
        can do either to themselves.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {suspended ? (
        <Button variant="secondary" onClick={() => setOpen('reinstate')}><Undo2 /> Reinstate</Button>
      ) : (
        <Button variant="danger-outline" onClick={() => setOpen('suspend')}><Ban /> Suspend</Button>
      )}

      {isAdmin ? (
        <Button variant="secondary" onClick={() => setOpen('revoke')}><ShieldMinus /> Remove admin role</Button>
      ) : (
        <Button variant="secondary" onClick={() => setOpen('grant')}><ShieldCheck /> Make an admin</Button>
      )}

      <ConfirmDialog
        open={open === 'suspend'}
        onOpenChange={(next) => !next && close()}
        title={`Suspend ${name}?`}
        description="They will still be able to sign in and read their account, but every change is refused: no posting, proposing, signing, funding, releasing or withdrawing. Contracts already funded are unaffected — the coins stay in escrow."
        confirmLabel="Suspend account"
        tone="danger"
        busy={busy}
        onConfirm={run}
      >
        <Field label="Reason" hint="The member sees this, so write it for them. At least 10 characters.">
          <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === 'reinstate'}
        onOpenChange={(next) => !next && close()}
        title={`Reinstate ${name}?`}
        description="They get full use of TrustLance back straight away, and are notified."
        confirmLabel="Reinstate"
        busy={busy}
        onConfirm={run}
      />

      <ConfirmDialog
        open={open === 'grant'}
        onOpenChange={(next) => !next && close()}
        title={`Make ${name} a platform admin?`}
        description="They will be able to open the console: suspend members, pay withdrawals, change the platform fee and decide escalated disputes. They will need their password to unseal it."
        confirmLabel="Make an admin"
        busy={busy}
        onConfirm={run}
      >
        <Field label="Note" optional hint="Why this person has the role. Other admins see it in settings.">
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={200} />
        </Field>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === 'revoke'}
        onOpenChange={(next) => !next && close()}
        title={`Remove ${name}’s admin role?`}
        description="They lose access to the console immediately and keep their ordinary account. The platform cannot be left without an admin, so this is refused if they are the last one."
        confirmLabel="Remove the role"
        tone="danger"
        busy={busy}
        onConfirm={run}
      />
    </div>
  );
}
