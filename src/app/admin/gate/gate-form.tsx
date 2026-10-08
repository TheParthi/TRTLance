'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { unsealConsole } from '@/lib/actions/admin';
import { IDLE_MINUTES } from '@/lib/admin/limits';
import { Seal } from './seal';

/**
 * The unsealing step.
 *
 * On success the seal plays its opening animation before the console appears, which is both the
 * nicer moment and the honest one: the cookie really has just been written and the next page really
 * is a different place. The wait is short and the router prefetch runs during it, so it costs
 * nothing. If the browser asks for reduced motion the animation renders as an open seal immediately.
 */
export function GateForm({ next, oauthOnly }: { next: string; oauthOnly: boolean }) {
  const router = useRouter();
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [state, setState] = React.useState<'idle' | 'checking' | 'open'>('idle');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setState('checking');
    setError(null);
    try {
      const result = await unsealConsole(password, next);
      if (!result.ok) {
        setState('idle');
        setPassword('');
        setError(result.error.message);
        return;
      }
      setState('open');
      router.prefetch(result.data);
      // Let the seal finish opening, then go.
      window.setTimeout(() => router.replace(result.data), 820);
    } catch (cause) {
      // A server action can fail outright rather than returning a result — the session lapsing
      // mid-request is the usual way. Without this the button would spin for ever, which looks
      // like the console hanging when in fact nothing is happening at all.
      console.error('[console] unsealing failed', cause);
      setState('idle');
      setPassword('');
      setError('The console could not be reached. Reload the page and try again.');
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Seal state={state === 'open' ? 'opening' : 'sealed'} className="mx-auto max-w-[11rem]" />

      <div aria-live="polite" className="min-h-5 text-center text-sm">
        {state === 'open' && <span className="font-medium text-signal-ink dark:text-signal">Unsealed. Opening the console…</span>}
      </div>

      {/*
        Shown for an account that signed up through Google, which may or may not also have a password
        — Supabase does not record one as an identity, so there is no way to tell from here. The
        field is therefore never withheld: an account that has a password can use it, and one that
        has not gets this note and a link.
      */}
      {oauthOnly && (
        <Callout tone="info" title="Signed in with Google">
          Your Google session is not a second check, so the console asks for a TrustLance password.
          If you have not set one yet,{' '}
          <Link href="/settings/account">add a password to your account</Link> and come back.
        </Callout>
      )}

      <Field
        label="Confirm your password"
        hint={`Unsealing lasts ${IDLE_MINUTES} minutes of use. Your TrustLance session is not affected.`}
        error={error}
      >
        <Input
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError(null);
          }}
          disabled={state !== 'idle'}
          required
        />
      </Field>

      <Button type="submit" size="lg" variant="signal" className="w-full" loading={state === 'checking'} disabled={state === 'open'}>
        <KeyRound /> {state === 'open' ? 'Unsealed' : 'Unseal the console'}
      </Button>
    </form>
  );
}
