'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { getBrowserClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const email = String(new FormData(e.currentTarget).get('email')).trim();
    // The response is the same whether or not the account exists.
    await getBrowserClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    setDone(true);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="t-page-title">Reset your password</h1>
        <p className="text-sm text-ink-secondary">We’ll email you a link to choose a new password.</p>
      </div>
      {done ? (
        <Callout tone="success" role="status" title="Check your email">
          If an account exists for that address, a reset link is on its way. The link expires in one hour.
        </Callout>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={busy}>Send reset link</Button>
        </form>
      )}
      <p className="text-sm"><Link className="link" href="/login">Back to sign in</Link></p>
    </div>
  );
}
