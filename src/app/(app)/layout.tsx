import { getViewer } from '@/lib/auth';
import { AppShell, escrowTotal } from '@/components/shell/app-shell';
import { PublicHeader } from '@/components/shell/public-header';
import { SiteFooter } from '@/components/shell/site-footer';

/**
 * Product area. Signed-in members get the application shell; visitors can still open the
 * public pages in this group (project discovery, project detail, profiles, search).
 * Private pages call requireViewer() and redirect.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (viewer) return <AppShell viewer={viewer} inEscrow={await escrowTotal(viewer.id)}>{children}</AppShell>;
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader signedIn={false} />
      <main id="main" className="container flex-1 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
