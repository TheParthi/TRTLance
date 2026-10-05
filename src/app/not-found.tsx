import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/logo';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Link href="/" aria-label="TrustLance home"><Logo /></Link>
      <div className="space-y-2">
        <p className="t-eyebrow">404</p>
        <h1 className="t-page-title">This page does not exist</h1>
        <p className="max-w-md text-ink-secondary">The link may be outdated, or you may not have access to what it points to.</p>
      </div>
      <Button asChild><Link href="/dashboard">Go to your dashboard</Link></Button>
    </main>
  );
}
