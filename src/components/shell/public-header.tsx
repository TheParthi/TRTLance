import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/logo';
import { PublicMobileMenu } from './public-mobile-menu';

const links = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#disputes', label: 'Disputes' },
  { href: '/work', label: 'Browse projects' },
];

export function PublicHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-canvas/90 backdrop-blur">
      <div className="container flex h-topbar items-center gap-6">
        <Link href="/" aria-label="TrustLance home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-6 text-sm font-medium text-ink-secondary">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-ink">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {signedIn ? (
            <Button asChild size="sm"><Link href="/dashboard">Go to dashboard</Link></Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost"><Link href="/login">Sign in</Link></Button>
              <Button asChild size="sm"><Link href="/signup">Create account</Link></Button>
            </>
          )}
        </div>
        <PublicMobileMenu links={links} signedIn={signedIn} />
      </div>
    </header>
  );
}
