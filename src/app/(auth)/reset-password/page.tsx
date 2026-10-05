'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { getBrowserClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = React.useState<boolean | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void getBrowserClient().auth.getUser().then(({ data }) => setHasSession(Boolean(data.user)));
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password'));
    if (password.length < 10 || password !== String(form.get('confirm'))) {
      setError(password.length < 10 ? 'Use at least 10 characters.' : 'The passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e2 } = await getBrowserClient().auth.updateUser({ password });
    setBusy(false);
    if (e2) {
      setError('We could not update your password. Request a new reset link.');
      return;
    }
    router.replace('/dashboard');
    router.refresh();
  };

  if (hasSession === null) return <Skeleton className="h-48 w-full" />;
  if (!hasSession) {
    return (
      <Callout tone="warning" title="This reset link has expired">
        Request a new one from <Link href="/forgot-password">Reset password</Link>.
      </Callout>
    );
  }
  return (
    <div className="space-y-6">
      <h1 className="t-page-title">Choose a new password</h1>
      {error && <Callout tone="danger" role="alert">{error}</Callout>}
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="New password" hint="At least 10 characters.">
          <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        <Field label="Confirm new password">
          <Input name="confirm" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>Update password</Button>
      </form>
    </div>
  );
}
