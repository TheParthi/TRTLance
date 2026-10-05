import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/common/logo';
import { LedgerField } from '@/components/marketing/ledger-field';
import { requireViewer } from '@/lib/auth';
import { OnboardingWizard } from './wizard';

export const metadata: Metadata = { title: 'Set up your account' };

export default async function OnboardingPage() {
  const viewer = await requireViewer('/onboarding', { allowOnboarding: true });
  if (viewer.profile.onboarding_completed_at) redirect('/dashboard');
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <LedgerField density={18} pulses={3} className="fixed opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <header className="relative">
        <div className="container flex h-[4.5rem] items-center justify-between">
          <Link href="/" aria-label="TrustLance home"><Logo /></Link>
          <form action="/auth/signout" method="post">
            <button className="inline-flex h-10 items-center rounded-full border border-ink/15 bg-canvas/70 px-4 text-sm text-ink-secondary backdrop-blur hover:text-ink">Sign out</button>
          </form>
        </div>
      </header>
      <main id="main" className="container relative max-w-2xl animate-rise py-10">
        <OnboardingWizard
          userId={viewer.id}
          email={viewer.email}
          emailVerified={viewer.stats.email_verified || viewer.emailConfirmed}
          walletAddress={viewer.wallet?.address ?? null}
          profile={viewer.profile}
        />
      </main>
    </div>
  );
}
