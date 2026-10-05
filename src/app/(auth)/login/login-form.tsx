'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { GoogleButton, OrDivider } from '@/components/auth/google-button';
import { getBrowserClient } from '@/lib/supabase/client';
import { safeNext } from '@/lib/utils';

const linkErrors: Record<string, string> = {
  callback: 'We could not complete sign-in. Please try again.',
  link: 'That link has expired or was already used. Request a new one.',
};

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(linkErrors[params.get('error') ?? ''] ?? null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const { error: authError } = await getBrowserClient().auth.signInWithPassword({
      email: String(form.get('email')).trim(),
      password: String(form.get('password')),
    });
    if (authError) {
      setBusy(false);
      setError(
        authError.message.includes('Email not confirmed')
          ? 'Confirm your email first — check your inbox for the link we sent.'
          : 'That email and password do not match an account.',
      );
      return;
    }
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="t-page-title">Sign in</h1>
        <p className="text-sm text-ink-secondary">
          New to TrustLance? <Link className="link" href={`/signup${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link>
        </p>
      </div>
      {error && <Callout tone="danger" role="alert">{error}</Callout>}
      <GoogleButton next={next} />
      <OrDivider />
      <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label={<span className="flex w-full justify-between">Password</span>}>
          <Input name="password" type="password" autoComplete="current-password" required minLength={8} />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm link">Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy}>Sign in</Button>
      </form>
    </div>
  );
}
