'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { getBrowserClient } from '@/lib/supabase/client';

const AUTH_MESSAGES: Record<string, string> = {
  same_password: 'That is already your password. Choose a different one.',
  weak_password: 'That password is too weak. Use a longer mix of words, numbers and symbols.',
  reauthentication_needed: 'For your security, sign out and sign in again before changing your password.',
};

export function PasswordForm() {
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [errors, setErrors] = React.useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const next: typeof errors = {};
    if (password.length < 10) next.password = 'Use at least 10 characters.';
    if (password !== confirm) next.confirm = 'The passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const { error } = await getBrowserClient().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setFormError((error.code && AUTH_MESSAGES[error.code]) ?? 'Your password was not changed. Try again in a moment.');
      return;
    }
    setPassword('');
    setConfirm('');
    toast.success('Password updated');
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" hint="At least 10 characters." error={errors.password}>
          <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} required />
        </Field>
        <Field label="Confirm new password" error={errors.confirm}>
          <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={10} required />
        </Field>
      </div>
      {formError && <Callout tone="danger" role="alert">{formError}</Callout>}
      <Button type="submit" variant="secondary" loading={busy}>Update password</Button>
    </form>
  );
}
