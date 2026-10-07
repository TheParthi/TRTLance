'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { GoogleButton, OrDivider } from '@/components/auth/google-button';
import { getBrowserClient } from '@/lib/supabase/client';
import { safeNext } from '@/lib/utils';

function passwordProblem(pw: string) {
  if (pw.length < 10) return 'Use at least 10 characters.';
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) return 'Mix letters and numbers.';
  return null;
}

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'), '/onboarding');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pwError, setPwError] = React.useState<string | null>(null);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password'));
    const problem = passwordProblem(password);
    setPwError(problem);
    if (problem) return;
    const email = String(form.get('email')).trim();
    setBusy(true);
    setError(null);
    const { data, error: authError } = await getBrowserClient().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: String(form.get('name')).trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    setBusy(false);
    if (authError) {
      setError(authError.message.toLowerCase().includes('registered')
        ? 'An account with this email already exists. Sign in instead.'
        : 'We could not create your account. Check your details and try again.');
      return;
    }
    if (data.session) {
      router.replace(next);
      router.refresh();
    } else {
      setSentTo(email);
    }
  };

  if (sentTo) {
    return (
      <div className="space-y-5 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand"><MailCheck className="size-6" aria-hidden /></span>
        <h1 className="t-page-title">Confirm your email</h1>
        <p className="text-sm text-ink-secondary">
          We sent a confirmation link to <strong className="text-ink">{sentTo}</strong>. Open it on this device to finish creating your account.
        </p>
        <p className="text-xs text-ink-muted">Didn’t get it? Check spam, or <Link className="link" href="/signup">try again</Link>.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="t-page-title">Create your account</h1>
        <p className="text-sm text-ink-secondary">
          Already a member? <Link className="link" href="/login">Sign in</Link>
        </p>
      </div>
      {error && <Callout tone="danger" role="alert">{error}</Callout>}
      <GoogleButton next={next} label="Sign up with Google" />
      <OrDivider />
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name">
          <Input name="name" autoComplete="name" required maxLength={80} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password" hint="At least 10 characters, with letters and numbers." error={pwError}>
          <Input name="password" type="password" autoComplete="new-password" required minLength={10} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>Create account</Button>
        <p className="text-xs text-ink-muted">
          You’ll verify your email, then set up your profile. Clients buy coins only when they post work; freelancers add a bank account to withdraw.
        </p>
      </form>
    </div>
  );
}
