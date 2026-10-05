import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo, LogoMark } from '@/components/common/logo';
import { canHire, type Viewer } from '@/lib/auth';
import { MobileNav } from './mobile-nav';
import { NotificationBell } from './notification-bell';
import { SectionProvider } from './section';
import { TopNav } from './top-nav';
import { UserMenu } from './user-menu';
import { WalletChip } from './wallet-chip';

/** Signed-in layout: one top bar with the primary sections; a tab bar on phones and tablets. */
export function AppShell({ viewer, children }: { viewer: Viewer; children: React.ReactNode }) {
  const ctx = { intent: viewer.profile.intent, isAdmin: viewer.isAdmin, isArbitrator: viewer.arbitrator?.status === 'approved' };
  return (
    <SectionProvider>
      <div className="min-h-dvh">
        <a href="#main" className="sr-only z-50 rounded bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
          Skip to content
        </a>
        <header className="sticky top-0 z-30 border-b bg-canvas/90 backdrop-blur">
          <div className="mx-auto flex h-topbar max-w-content items-center gap-6 px-4 md:px-6">
            <Link href="/dashboard" aria-label="TrustLance home" className="shrink-0">
              <span className="hidden sm:inline-flex"><Logo /></span>
              <span className="sm:hidden"><LogoMark /></span>
            </Link>
            <TopNav ctx={ctx} />
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <form action="/search" role="search" className="relative hidden xl:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
                <label htmlFor="global-search" className="sr-only">Search projects and people</label>
                <input
                  id="global-search"
                  name="q"
                  type="search"
                  placeholder="Search"
                  className="h-9 w-52 rounded-full border bg-surface pl-9 pr-3 text-sm placeholder:text-ink-muted focus-visible:w-64 focus-visible:transition-[width]"
                />
              </form>
              <Link href="/search" className="inline-flex size-10 items-center justify-center rounded-full text-ink-secondary hover:bg-surface-subtle xl:hidden" aria-label="Search">
                <Search className="size-5" aria-hidden />
              </Link>
              {canHire(viewer) && (
                <Button asChild size="sm" className="hidden lg:inline-flex">
                  <Link href="/projects/new"><Plus /> Post a project</Link>
                </Button>
              )}
              <WalletChip address={viewer.wallet?.address ?? null} />
              <NotificationBell userId={viewer.id} initialCount={viewer.unreadNotifications} />
              <UserMenu name={viewer.profile.display_name} username={viewer.profile.username} avatarPath={viewer.profile.avatar_path} email={viewer.email} ctx={ctx} />
            </div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-content px-4 pb-28 pt-6 md:px-6 md:pt-10 lg:pb-16">
          {children}
        </main>
        <MobileNav ctx={ctx} />
      </div>
    </SectionProvider>
  );
}
