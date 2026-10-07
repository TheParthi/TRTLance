import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Logo, LogoMark } from '@/components/common/logo';
import { SmoothScroll } from '@/components/marketing/smooth-scroll';
import { canHire, type Viewer } from '@/lib/auth';
import { sumAmounts } from '@/lib/money';
import { LOCKED_MILESTONE_STATES } from '@/lib/status';
import { createClient } from '@/lib/supabase/server';
import { FloatingHeader } from './floating-header';
import { MobileNav } from './mobile-nav';
import { RevealObserver } from './reveal-observer';
import { NotificationBell } from './notification-bell';
import { SearchOverlay } from './search-overlay';
import { SectionProvider } from './section';
import { TopNav } from './top-nav';
import { UserMenu } from './user-menu';
import { WalletChip } from './wallet-chip';

/** Signed-in layout: a floating header of capsules on desktop; a floating dock on phones and tablets. */
// Kept synchronous on purpose: an async component here shifts React's useId tree and breaks hydration
// of client components that use ids. Data the shell needs is loaded by the layout (see escrowTotal).
export function AppShell({ viewer, inEscrow, children }: { viewer: Viewer; inEscrow: string | null; children: React.ReactNode }) {
  const ctx = { intent: viewer.profile.intent, isAdmin: viewer.isAdmin, isArbitrator: viewer.arbitrator?.status === 'approved' };
  return (
    <SectionProvider>
      <SmoothScroll />
      <RevealObserver />
      <div className="min-h-dvh overflow-x-clip">
        <a href="#main" className="sr-only z-50 rounded bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
          Skip to content
        </a>
        <FloatingHeader>
          <div className="mx-auto flex h-[4.5rem] max-w-content items-center gap-4 px-4 md:px-6">
            <Link href="/dashboard" aria-label="TrustLance home" className="shrink-0 lg:w-48">
              <span className="hidden sm:inline-flex"><Logo /></span>
              <span className="sm:hidden"><LogoMark /></span>
            </Link>
            <div className="flex flex-1 justify-center">
              <TopNav ctx={ctx} />
            </div>
            <div className="flex shrink-0 items-center gap-2 lg:w-auto">
              {canHire(viewer) && (
                <Link href="/projects/new" aria-label="Post a project" className="hidden h-11 items-center gap-1.5 rounded-full bg-signal px-4 text-sm font-semibold text-signal-ink shadow-[0_10px_28px_-14px_hsl(var(--signal))] transition-transform duration-base ease-ledger hover:-translate-y-px xl:inline-flex">
                  <Plus className="size-4" aria-hidden /> Post a project
                </Link>
              )}
              <div className="flex items-center gap-0.5 rounded-full border border-ink/10 bg-canvas/75 p-1 shadow-[0_10px_30px_-18px_rgb(0_0_0/0.35)] backdrop-blur-xl">
                <SearchOverlay />
                {canHire(viewer) && (
                  <Link href="/projects/new" aria-label="Post a project" className="hidden size-9 items-center justify-center rounded-full text-ink-secondary hover:bg-ink/5 hover:text-ink lg:inline-flex xl:hidden">
                    <Plus className="size-[18px]" aria-hidden />
                  </Link>
                )}
                <WalletChip coins={viewer.coins.wallet} inEscrow={inEscrow} />
                <NotificationBell userId={viewer.id} initialCount={viewer.unreadNotifications} />
                <UserMenu name={viewer.profile.display_name} username={viewer.profile.username} avatarPath={viewer.profile.avatar_path} email={viewer.email} ctx={ctx} />
              </div>
            </div>
          </div>
        </FloatingHeader>
        <main id="main" className="mx-auto max-w-content px-4 pb-32 pt-6 md:px-6 md:pt-10 lg:pb-16">
          {children}
        </main>
        <MobileNav ctx={ctx} />
      </div>
    </SectionProvider>
  );
}

/** Money currently locked in escrow on contracts this member is a party to (as client or freelancer). */
export async function escrowTotal(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('milestones')
    .select('amount, contracts!inner(client_id, freelancer_id)')
    .in('status', LOCKED_MILESTONE_STATES)
    .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`, { referencedTable: 'contracts' })
    .returns<{ amount: string }[]>();
  if (error) return null;
  return sumAmounts(data.map((m) => m.amount));
}
