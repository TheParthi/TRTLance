import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Logo } from '@/components/common/logo';
import { HeaderShell } from './header-shell';
import { PublicMobileMenu } from './public-mobile-menu';

const links = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#protection', label: 'Disputes' },
  { href: '/work', label: 'Browse projects' },
];

export function PublicHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <HeaderShell>
      <div className="container flex h-[4.5rem] items-center gap-6">
        <Link href="/" aria-label="TrustLance home" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden flex-1 justify-center md:flex">
          <ul className="flex items-center gap-0.5 rounded-full border border-ink/10 bg-canvas/60 p-1 text-sm font-medium backdrop-blur-xl group-data-[tone=dark]/header:border-ink-inverse/15 group-data-[tone=dark]/header:bg-ink-inverse/5">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex h-9 items-center rounded-full px-4 opacity-75 transition-[opacity,background-color] duration-base ease-ledger hover:bg-ink/5 hover:opacity-100 group-data-[tone=dark]/header:hover:bg-ink-inverse/10">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto hidden items-center gap-1 md:flex">
          {signedIn ? (
            <Link href="/dashboard" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-signal px-5 text-sm font-semibold text-signal-ink transition-transform duration-base ease-ledger hover:-translate-y-px">
              Go to dashboard <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <>
              <Link href="/login" className="inline-flex h-10 items-center px-4 text-sm font-medium opacity-70 transition-opacity hover:opacity-100">Sign in</Link>
              <Link href="/signup" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-signal px-5 text-sm font-semibold text-signal-ink transition-transform duration-base ease-ledger hover:-translate-y-px">
                Create account <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </>
          )}
        </div>
        <PublicMobileMenu links={links} signedIn={signedIn} />
      </div>
    </HeaderShell>
  );
}
