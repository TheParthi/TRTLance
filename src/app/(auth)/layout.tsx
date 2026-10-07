import Link from 'next/link';
import { Logo } from '@/components/common/logo';
import { EscrowRingStage } from '@/components/marketing/escrow-ring-stage';
import { LedgerField } from '@/components/marketing/ledger-field';

const points = [
  { title: 'Funded before work starts', body: 'Every contract is locked in escrow before the first milestone begins.' },
  { title: 'Paid on approval', body: 'Approving a milestone releases it to the freelancer, withdrawable to their bank.' },
  { title: 'Fair disputes', body: 'An independent arbitrator decides. AI assists; people decide.' },
];

/** Sign-in and sign-up: the form on paper, and the escrow ring playing an example contract on ink beside it. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(0,34rem)]">
      <aside data-header="dark" className="relative hidden overflow-hidden bg-surface-inverse text-ink-inverse lg:flex lg:flex-col lg:justify-between lg:p-12">
        <LedgerField tone="signal" density={20} pulses={5} className="opacity-70" />
        <Link href="/" aria-label="TrustLance home" className="relative"><Logo /></Link>
        <EscrowRingStage className="pointer-events-none absolute -right-[8%] left-[30%] top-[7%] h-[50%]" />
        <div className="relative max-w-lg space-y-8">
          <p className="font-display text-[clamp(2.6rem,4vw,4rem)] font-medium leading-[0.95] tracking-[-0.035em] text-ink-inverse">
            Funded before it starts.
          </p>
          <ol className="border-t border-ink-inverse/15">
            {points.map((p, i) => (
              <li key={p.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 border-b border-ink-inverse/15 py-3.5">
                <span className="t-mono pt-0.5 text-ink-inverse/50">0{i + 1}</span>
                <span>
                  <span className="block font-semibold">{p.title}</span>
                  <span className="block text-sm text-ink-inverse/65">{p.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-ink-inverse/50">Payments are locked in TrustLance escrow before work starts and released milestone by milestone.</p>
        </div>
      </aside>
      <main id="main" className="relative flex flex-col overflow-hidden px-4 py-8 sm:px-10">
        <LedgerField density={18} pulses={0} className="opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_60%)] lg:hidden" />
        <Link href="/" aria-label="TrustLance home" className="relative mb-10 lg:hidden"><Logo /></Link>
        <div className="relative mx-auto flex w-full max-w-sm flex-1 animate-rise flex-col justify-center">{children}</div>
      </main>
    </div>
  );
}
