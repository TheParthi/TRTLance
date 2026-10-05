import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/common/logo';
import { canHire, type Viewer } from '@/lib/auth';
import { MobileNav } from './mobile-nav';
import { NotificationBell } from './notification-bell';
import { SideNav } from './side-nav';
import { UserMenu } from './user-menu';

/** Signed-in layout: sidebar on desktop, top bar everywhere, tab bar on phones. */
export function AppShell({ viewer, children }: { viewer: Viewer; children: React.ReactNode }) {
  const ctx = { intent: viewer.profile.intent, isAdmin: viewer.isAdmin, isArbitrator: viewer.arbitrator?.status === 'approved' };
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only z-50 rounded bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <SideNav ctx={ctx} />
      <div className="lg:pl-sidebar">
        <header className="sticky top-0 z-30 border-b bg-surface/90 backdrop-blur">
          <div className="flex h-topbar items-center gap-3 px-4 md:px-6">
            <Link href="/dashboard" className="lg:hidden" aria-label="TrustLance home">
              <LogoMark />
            </Link>
            <form action="/search" role="search" className="relative hidden max-w-md flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
              <label htmlFor="global-search" className="sr-only">Search projects and people</label>
              <input
                id="global-search"
                name="q"
                type="search"
                placeholder="Search projects, skills or people"
                className="h-9 w-full rounded border bg-surface-subtle pl-9 pr-3 text-sm placeholder:text-ink-muted focus-visible:bg-surface"
              />
            </form>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <Link href="/search" className="inline-flex size-10 items-center justify-center rounded text-ink-secondary hover:bg-surface-subtle md:hidden" aria-label="Search">
                <Search className="size-5" aria-hidden />
              </Link>
              {canHire(viewer) && (
                <Button asChild size="sm" className="hidden sm:inline-flex">
                  <Link href="/projects/new"><Plus /> Post a project</Link>
                </Button>
              )}
              <NotificationBell userId={viewer.id} initialCount={viewer.unreadNotifications} />
              <UserMenu name={viewer.profile.display_name} username={viewer.profile.username} avatarPath={viewer.profile.avatar_path} email={viewer.email} />
            </div>
          </div>
        </header>
        <main id="main" className="px-4 pb-28 pt-6 md:px-6 md:pt-8 lg:pb-12">
          <div className="mx-auto max-w-content">{children}</div>
        </main>
      </div>
      <MobileNav ctx={ctx} />
    </div>
  );
}
