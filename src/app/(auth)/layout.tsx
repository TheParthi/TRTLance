import Link from 'next/link';
import { Lock, Scale, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/common/logo';

const points = [
  { icon: Lock, title: 'Funded before work starts', body: 'Every contract is deposited into escrow before the first milestone begins.' },
  { icon: ShieldCheck, title: 'Paid on approval', body: 'Approving a milestone releases it straight to the freelancer’s verified wallet.' },
  { icon: Scale, title: 'Fair disputes', body: 'An independent arbitrator decides. AI assists; people decide.' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,34rem)]">
      <aside className="relative hidden overflow-hidden bg-surface-inverse text-ink-inverse lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/" aria-label="TrustLance home" className="[&_span]:text-ink-inverse"><Logo /></Link>
        <div className="max-w-md space-y-8">
          <p className="font-display text-4xl leading-tight" style={{ fontVariationSettings: "'opsz' 144" }}>
            Trust without blind trust.
          </p>
          <ul className="space-y-5">
            {points.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15"><Icon className="size-4" aria-hidden /></span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-sm opacity-75">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs opacity-60">Funds are held by a non-custodial smart contract. TrustLance cannot withdraw them.</p>
      </aside>
      <main id="main" className="flex flex-col px-4 py-8 sm:px-10">
        <Link href="/" aria-label="TrustLance home" className="mb-10 lg:hidden"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">{children}</div>
      </main>
    </div>
  );
}
