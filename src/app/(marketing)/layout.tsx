import { getViewer } from '@/lib/auth';
import { PublicHeader } from '@/components/shell/public-header';
import { SiteFooter } from '@/components/shell/site-footer';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer().catch(() => null);
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader signedIn={Boolean(viewer)} />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
