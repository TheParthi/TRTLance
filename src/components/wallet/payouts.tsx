'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Field } from '@/components/ui/field';
import { AmountInput, Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { cancelWithdrawal, requestWithdrawal, savePayoutAccount } from '@/lib/actions/coins';
import { CURRENCY } from '@/lib/env';
import { formatAmount, formatRupees, parseAmount, toCoins } from '@/lib/money';
import type { PayoutAccount } from '@/lib/types';

/** Bank account and PAN for withdrawals. Reviewed by TrustLance before the first payout. */
export function BankAccountForm({ account, onDone }: { account: PayoutAccount | null; onDone?: () => void }) {
  const router = useRouter();
  const [form, setForm] = React.useState({ holder: account?.account_holder ?? '', accountNumber: '', ifsc: account?.ifsc ?? '', pan: '' });
  const [busy, setBusy] = React.useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await savePayoutAccount(form);
    setBusy(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success('Saved. We’ll verify your details, usually within one working day.');
    onDone?.();
    router.refresh();
  };

  return (
    <form onSubmit={save} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <Field label="Account holder name" hint="Exactly as your bank has it.">
        <Input value={form.holder} onChange={(e) => set('holder', e.target.value)} autoComplete="name" maxLength={100} required />
      </Field>
      <Field label="Account number">
        <Input value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} inputMode="numeric" autoComplete="off" maxLength={22} required />
      </Field>
      <Field label="IFSC" hint="11 characters, e.g. HDFC0001234.">
        <Input value={form.ifsc} onChange={(e) => set('ifsc', e.target.value.toUpperCase())} autoComplete="off" maxLength={11} required />
      </Field>
      <Field label="PAN" hint="Needed for tax records on your earnings.">
        <Input value={form.pan} onChange={(e) => set('pan', e.target.value.toUpperCase())} autoComplete="off" maxLength={10} required />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" loading={busy}><Landmark /> Save bank account</Button>
      </div>
    </form>
  );
}

/** Withdraw earnings to the verified bank account. */
export function WithdrawForm({ earnings, min, paisePerCoin, account }: {
  earnings: string;
  min: number;
  paisePerCoin: number;
  account: PayoutAccount;
}) {
  const router = useRouter();
  const [amount, setAmount] = React.useState(earnings === '0' ? '' : earnings);
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [key, setKey] = React.useState(() => crypto.randomUUID());
  const coins = parseAmount(amount);
  const available = toCoins(earnings);
  const error = amount && (coins === null || coins < BigInt(min) || coins > available)
    ? available < BigInt(min) ? `You can withdraw once you have at least ${formatAmount(min)}.` : `Enter between ${formatAmount(min)} and ${formatAmount(available)}.`
    : undefined;
  const valid = coins !== null && !error;

  const withdraw = async () => {
    if (coins === null) return;
    setBusy(true);
    const r = await requestWithdrawal(Number(coins), key);
    setBusy(false);
    if (!r.ok) return toast.error(r.error.message);
    toast.success('Withdrawal requested. We’ll tell you when the money is sent.');
    setConfirming(false);
    setAmount('');
    setKey(crypto.randomUUID());
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Amount to withdraw" hint={valid && coins !== null ? `${formatRupees(Number(coins) * paisePerCoin)} to ${account.account_holder} ••${account.account_last4}` : `Minimum ${formatAmount(min)}`} error={error} className="w-60">
        <AmountInput unit={CURRENCY} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
      </Field>
      <Button onClick={() => setConfirming(true)} disabled={!valid}><Banknote /> Withdraw</Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Withdraw to your bank account?"
        description={coins !== null ? `${formatAmount(coins)} (${formatRupees(Number(coins) * paisePerCoin)}) will be sent to ${account.account_holder}, account ••${account.account_last4} (${account.ifsc}). You can cancel until it is sent.` : undefined}
        confirmLabel="Request withdrawal"
        busy={busy}
        onConfirm={withdraw}
      />
    </div>
  );
}

export function CancelWithdrawalButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <Button size="sm" variant="ghost" loading={busy} onClick={async () => {
      setBusy(true);
      const r = await cancelWithdrawal(id);
      setBusy(false);
      if (!r.ok) return toast.error(r.error.message);
      toast.success('Cancelled. The coins are back in your withdrawable balance.');
      router.refresh();
    }}>Cancel</Button>
  );
}

/** Where the member's bank details stand, with a way to change them. */
export function BankAccountStatus({ account }: { account: PayoutAccount }) {
  const [editing, setEditing] = React.useState(false);
  if (editing) return <BankAccountForm account={account} onDone={() => setEditing(false)} />;
  const change = <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Change</Button>;
  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="font-medium">{account.account_holder}</span> · account ••{account.account_last4} · {account.ifsc} · PAN ••{account.pan_last4}
      </p>
      {account.status === 'pending' && <Callout tone="info" title="Being verified" action={change}>We check that the account and PAN belong to you before the first payout, usually within one working day.</Callout>}
      {account.status === 'rejected' && <Callout tone="warning" title="Not verified" action={change}>{account.review_note ?? 'The details could not be verified.'} Update them and we’ll check again.</Callout>}
      {account.status === 'verified' && <div>{change}</div>}
    </div>
  );
}
