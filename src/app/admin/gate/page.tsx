import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/common/logo';
import { LedgerField } from '@/components/marketing/ledger-field';
import { ConsoleNotConfigured } from '@/components/admin/not-configured';
import { missingSupabaseConfig } from '@/lib/env';
import { requireAdminForGate } from '@/lib/admin/access';
import { readSeal } from '@/lib/admin/gate';
import { safeConsolePath } from '@/lib/admin/nav';
import { MAX_HOURS } from '@/lib/admin/limits';
import { createClient } from '@/lib/supabase/server';
import { GateForm } from './gate-form';

/**
 * The way in.
 *
 * Nothing here is listed or linked from the product, and anyone who is not an admin gets a 404 —
 * a visitor, a member and a signed-out browser all see the same not-found page, so the page cannot
 * be used to find out whether /admin exists or who the admins are.
 *
 * The page is sealed off from the console layout on purpose: an admin arriving without a seal has to
 * be able to render something, and if the gate lived inside the console it would redirect to itself.
 */
export const metadata: Metadata = {
  title: 'Console',
  // Never indexed, never followed, never kept in a browser's back-forward cache.
  robots: { index: false, follow: false, nocache: true },
};

export default async function GatePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const missing = missingSupabaseConfig();
  if (missing.length) return <ConsoleNotConfigured missing={missing} />;

  const viewer = await requireAdminForGate();
  const { next } = await searchParams;
  const destination = safeConsolePath(next);

  // Already unsealed: no reason to ask again.
  if (await readSeal(viewer.id)) redirect(destination);

  // Whether this account arrived through a provider rather than an email and password. Supabase does
  // not record a password as an identity, so an account listed as Google-only may still have one —
  // this only decides whether to show a note, never whether to show the field.
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const providers = (data.user?.identities ?? []).map((identity) => identity.provider);
  const oauthOnly = providers.length > 0 && !providers.includes('email');

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-surface-inverse text-ink-inverse">
      {/* The same moving ledger lines the product opens with, turned down low. */}
      <LedgerField tone="signal" density={26} pulses={3} className="opacity-[0.22] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />

      <header className="relative flex items-center justify-between gap-4 px-5 py-5 md:px-8">
        <Link href="/dashboard" aria-label="TrustLance" className="opacity-90 transition-opacity hover:opacity-100">
          <Logo />
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-inverse/60 underline-offset-4 transition-colors hover:text-ink-inverse hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Back to TrustLance
        </Link>
      </header>

      <main id="main" className="relative flex flex-1 items-center justify-center px-5 py-8 md:px-8">
        <div className="w-full max-w-md">
          <div className="space-y-2 text-center">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-ink-inverse/15 px-3 py-1 text-2xs font-semibold uppercase tracking-[0.18em] text-ink-inverse/70">
              <ShieldCheck className="size-3.5" aria-hidden /> Platform console
            </p>
            <h1 className="font-display text-[clamp(2.1rem,7vw,2.9rem)] font-medium leading-[1.02] tracking-[-0.035em] text-ink-inverse">
              Sealed
            </h1>
            <p className="mx-auto max-w-sm text-sm text-ink-inverse/70">
              Signed in as <span className="font-medium text-ink-inverse">{viewer.profile.display_name}</span>.
              The console can suspend members, change the platform fee and release payouts, so it asks
              for your password again before it opens.
            </p>
          </div>

          {/* The form sits on its own paper, so the fields keep the product's normal contrast. */}
          <div className="mt-7 rounded-lg border border-ink-inverse/10 bg-canvas p-5 text-ink shadow-lg md:p-6">
            <GateForm next={destination} oauthOnly={oauthOnly} />
          </div>

          <p className="mt-5 text-center text-2xs leading-relaxed text-ink-inverse/50">
            Unsealing is recorded in the audit trail with the time and the browser that did it.
            A console session cannot be extended past {MAX_HOURS} hours without unsealing again.
          </p>
        </div>
      </main>
    </div>
  );
}
