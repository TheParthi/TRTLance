import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Logo } from '@/components/common/logo';
import { LedgerField } from '@/components/marketing/ledger-field';

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <LedgerField density={18} pulses={4} className="opacity-80" />
      <div className="container relative flex h-[4.5rem] items-center">
        <Link href="/" aria-label="TrustLance home"><Logo /></Link>
      </div>
      <div className="container relative flex flex-1 flex-col justify-center pb-24">
        <p aria-hidden className="select-none font-display text-[clamp(7rem,26vw,22rem)] font-medium leading-[0.8] tracking-[-0.06em] text-ink/10">404</p>
        <div className="-mt-[0.6em] max-w-2xl space-y-5 md:-mt-[1.2em]">
          <h1 className="font-display text-[clamp(2.4rem,5vw,4.5rem)] font-medium leading-[0.95] tracking-[-0.04em]">This page does not exist</h1>
          <p className="max-w-md text-ink-secondary md:text-lg">The link may be outdated, or you may not have access to what it points to. No money moved.</p>
          <Link href="/dashboard" className="inline-flex h-12 items-center gap-2 rounded-full bg-signal pl-6 pr-5 font-semibold text-signal-ink shadow-[0_10px_28px_-14px_hsl(var(--signal))]">
            Go to your dashboard <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </main>
  );
}
