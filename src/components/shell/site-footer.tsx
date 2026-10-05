import Link from 'next/link';
import { Logo } from '@/components/common/logo';

export function SiteFooter() {
  return (
    <footer className="border-t bg-surface">
      <div className="container grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-ink-secondary">
            A freelance marketplace where every contract is funded in escrow before work begins, and every payment is released on approval.
          </p>
        </div>
        <nav aria-label="Product" className="space-y-3 text-sm">
          <p className="t-eyebrow">Product</p>
          <ul className="space-y-2 text-ink-secondary">
            <li><Link className="hover:text-ink" href="/#how-it-works">How it works</Link></li>
            <li><Link className="hover:text-ink" href="/#disputes">Dispute resolution</Link></li>
            <li><Link className="hover:text-ink" href="/work">Browse projects</Link></li>
          </ul>
        </nav>
        <nav aria-label="Account" className="space-y-3 text-sm">
          <p className="t-eyebrow">Account</p>
          <ul className="space-y-2 text-ink-secondary">
            <li><Link className="hover:text-ink" href="/signup">Create account</Link></li>
            <li><Link className="hover:text-ink" href="/login">Sign in</Link></li>
            <li><Link className="hover:text-ink" href="/forgot-password">Reset password</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <div className="container flex flex-col gap-2 py-5 text-xs text-ink-muted sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} TrustLance</p>
          <p>Payments are held by a non-custodial escrow contract. TrustLance cannot withdraw them.</p>
        </div>
      </div>
    </footer>
  );
}
