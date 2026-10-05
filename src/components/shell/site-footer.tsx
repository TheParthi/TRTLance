import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

const groups = [
  { label: 'Product', links: [['How it works', '/#how-it-works'], ['Protection', '/#protection'], ['Browse projects', '/work']] },
  { label: 'Account', links: [['Create account', '/signup'], ['Sign in', '/login'], ['Reset password', '/forgot-password']] },
] as const;

/** The closing plate: links on a dark ground, then the wordmark set as large as the page allows. */
export function SiteFooter() {
  return (
    <footer data-header="dark" className="overflow-hidden bg-surface-inverse text-ink-inverse">
      <div className="container grid gap-12 border-t border-ink-inverse/10 py-16 md:grid-cols-12">
        <p className="max-w-sm text-ink-inverse/70 md:col-span-5">
          A freelance marketplace where every contract is funded in escrow before work begins, and every payment is released on approval.
        </p>
        {groups.map((g) => (
          <nav key={g.label} aria-label={g.label} className="space-y-4 md:col-span-3">
            <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-ink-inverse/50">{g.label}</p>
            <ul className="space-y-2.5">
              {g.links.map(([label, href]) => (
                <li key={href}>
                  <Link className="group inline-flex items-center gap-1 text-ink-inverse/85 transition-colors hover:text-signal" href={href}>
                    {label} <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container">
        <p aria-hidden className="select-none font-display text-[clamp(4.5rem,19vw,19rem)] font-medium leading-[0.78] tracking-[-0.06em] text-ink-inverse">
          TrustLance<span className="text-signal">.</span>
        </p>
      </div>
      <div className="container flex flex-col gap-2 border-t border-ink-inverse/10 py-6 text-xs text-ink-inverse/55 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} TrustLance</p>
        <p>Payments are held by a non-custodial escrow contract. TrustLance cannot withdraw them.</p>
      </div>
    </footer>
  );
}
