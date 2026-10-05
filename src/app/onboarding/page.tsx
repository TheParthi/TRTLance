import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/common/logo';
import { requireViewer } from '@/lib/auth';
import { OnboardingWizard } from './wizard';

export const metadata: Metadata = { title: 'Set up your account' };

export default async function OnboardingPage() {
  const viewer = await requireViewer('/onboarding', { allowOnboarding: true });
  if (viewer.profile.onboarding_completed_at) redirect('/dashboard');
  return (
    <div className="min-h-dvh">
      <header className="border-b bg-surface">
        <div className="container flex h-topbar items-center justify-between">
          <Link href="/" aria-label="TrustLance home"><Logo /></Link>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-ink-muted hover:text-ink">Sign out</button>
          </form>
        </div>
      </header>
      <main id="main" className="container max-w-2xl py-10">
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
