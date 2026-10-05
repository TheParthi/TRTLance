'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { getBrowserClient } from '@/lib/supabase/client';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.4-.2-2H12v3.9h6c-.1 1-.8 2.4-2.2 3.4v2.8h3.6c2-1.9 3.2-4.7 3.2-8.1z" />
      <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.8c-1 .7-2.2 1.1-3.6 1.1-2.8 0-5.2-1.9-6-4.4H2.3v2.8C4.1 20.7 7.8 23 12 23z" />
      <path fill="#FBBC05" d="M6 14.3c-.2-.7-.3-1.4-.3-2.3s.1-1.6.3-2.3V6.9H2.3C1.5 8.4 1 10.2 1 12s.5 3.6 1.3 5.1L6 14.3z" />
      <path fill="#EA4335" d="M12 5.3c1.6 0 2.7.7 3.3 1.3l2.4-2.4C16.4 2.9 14.4 2 12 2 7.8 2 4.1 4.3 2.3 7.9L6 10.7c.8-2.5 3.2-4.4 6-5.4z" />
    </svg>
  );
}

export function GoogleButton({ next, label = 'Continue with Google' }: { next: string; label?: string }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const start = async () => {
    setBusy(true);
    setError(null);
    const { error: e } = await getBrowserClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (e) {
      setError('Google sign-in is unavailable right now. Use email instead.');
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" size="lg" className="w-full" onClick={start} loading={busy}>
        {!busy && <GoogleIcon />}
        {label}
      </Button>
      {error && <p role="alert" className="text-xs text-danger-strong">{error}</p>}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-ink-muted" role="separator">
      <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
    </div>
  );
}
