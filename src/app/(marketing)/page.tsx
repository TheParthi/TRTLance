import Link from 'next/link';
import {
  ArrowRight, BadgeCheck, Briefcase, CheckCheck, Compass, Eye, FileSignature, Gavel, Lock, MessagesSquare, Scale,
  ShieldCheck, Sparkles, Star, Undo2, Upload, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const lifecycle = [
  { icon: FileSignature, title: 'Agree', body: 'Client and freelancer sign the same terms: scope, milestones, amounts and dates.' },
  { icon: Lock, title: 'Fund', body: 'The client deposits the full amount into the escrow contract. Work starts only when it is secured.' },
  { icon: Upload, title: 'Deliver', body: 'The freelancer submits each milestone with files, links and notes.' },
  { icon: Eye, title: 'Review', body: 'The client approves or asks for changes, with the request recorded on the contract.' },
  { icon: CheckCheck, title: 'Release', body: 'Approval releases that milestone straight to the freelancer’s verified wallet.' },
];

export default function LandingPage() {
  return (
    <>
      {/* 1. Hero */}
      <section className="border-b">
        <div className="container grid gap-12 py-16 md:py-24 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div className="space-y-7">
            <Badge tone="brand"><ShieldCheck /> Escrow-backed freelance contracts</Badge>
            <h1 className="t-display max-w-2xl">Freelance work, funded before it starts.</h1>
            <p className="max-w-xl text-lg text-ink-secondary">
              On TrustLance the client’s money is locked in escrow before the first hour of work, and each milestone is paid the moment it is approved.
              No chasing invoices. No paying for work you never receive.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg"><Link href="/signup">Create a free account <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="secondary"><Link href="/work">Browse open projects</Link></Button>
            </div>
            <p className="text-sm text-ink-muted">Joining is free. You only connect a wallet when you sign or fund a contract.</p>
          </div>
          <ContractPreview />
        </div>
      </section>

      {/* 2. Trust-first explanation */}
      <section className="container py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="space-y-3 md:col-span-1">
            <p className="t-eyebrow">Why TrustLance</p>
            <h2 className="font-display text-3xl">Trust without blind trust.</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 md:col-span-2">
            <Point icon={Lock} title="Clients know the money is safe">
              Funds sit in a smart contract that TrustLance cannot withdraw from. They move only when you approve a milestone, or when an independent arbitrator decides a dispute.
            </Point>
            <Point icon={Wallet} title="Freelancers know they will be paid">
              Before you start, you can see that the whole contract is funded. Approved work is paid to your verified wallet in one transaction.
            </Point>
            <Point icon={BadgeCheck} title="Profiles show verified facts">
              Verified email, verified wallet, funded contracts and completed work — counted by the platform, never self-reported.
            </Point>
            <Point icon={FileSignature} title="Agreements are explicit">
              Every contract lists its scope, deliverables, milestones and amounts, and both parties sign the exact same version.
            </Point>
          </div>
        </div>
      </section>

      {/* 3. How protected projects work + 6. milestone payments */}
      <section id="how-it-works" className="scroll-mt-20 border-y bg-surface">
        <div className="container py-16 md:py-24">
          <div className="max-w-2xl space-y-3">
            <p className="t-eyebrow">How a protected project works</p>
            <h2 className="font-display text-3xl md:text-4xl">Five steps, each one visible to both sides.</h2>
            <p className="text-ink-secondary">Payments are split into milestones, so money moves in step with the work — never all at once, never before it is earned.</p>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-5">
            {lifecycle.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="relative space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full border bg-canvas text-brand"><Icon className="size-5" aria-hidden /></span>
                  <span className="t-eyebrow">Step {i + 1}</span>
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-ink-secondary">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4 & 5. Client and freelancer workflows */}
      <section className="container grid gap-6 py-16 md:grid-cols-2 md:py-24">
        <Workflow
          icon={Briefcase}
          eyebrow="For clients"
          title="Hire with your money protected"
          steps={[
            'Describe the project, budget and suggested milestones.',
            'Compare proposals side by side — price, timeline, milestones and verified track record.',
            'Hire, sign, and deposit the full amount into escrow.',
            'Approve each milestone when you are satisfied, or request changes.',
          ]}
          cta={{ href: '/signup', label: 'Post a project' }}
        />
        <Workflow
          icon={Compass}
          eyebrow="For freelancers"
          title="Work knowing the money is there"
          steps={[
            'Find projects that match your skills, with the client’s funding history shown up front.',
            'Read an AI summary of the project’s risks before you apply.',
            'Propose your own milestones and price.',
            'Start once escrow is funded. Get paid on each approval.',
          ]}
          cta={{ href: '/work', label: 'Find work' }}
        />
      </section>

      {/* 7. Verified identity / wallet */}
      <section className="border-y bg-surface">
        <div className="container grid gap-10 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div className="space-y-4">
            <p className="t-eyebrow">Verified wallets</p>
            <h2 className="font-display text-3xl">You don’t need to understand blockchain to use it.</h2>
            <p className="text-ink-secondary">
              Escrow runs on the Shardeum network, but you only touch it at three moments: verifying your wallet once, funding a contract, and approving a payment.
              Each step shows the amount, the network, the wallet and what happens next — and we never report success until the network confirms it.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              ['Verify once', 'Sign a free message to prove a wallet is yours. It is linked to your account permanently.'],
              ['See every transaction', 'Each deposit, release and refund shows its network, amount and transaction hash.'],
              ['Nothing hidden', 'TrustLance has no withdraw function on the escrow contract. Only the parties and the arbitrator can move funds.'],
            ].map(([t, b]) => (
              <li key={t} className="panel p-5">
                <p className="font-semibold">{t}</p>
                <p className="mt-1 text-sm text-ink-secondary">{b}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 8. Disputes + 9. AI */}
      <section id="disputes" className="container scroll-mt-20 grid gap-6 py-16 md:grid-cols-2 md:py-24">
        <div className="panel space-y-4 p-8">
          <Scale className="size-7 text-brand" aria-hidden />
          <h2 className="font-display text-2xl">Transparent dispute resolution</h2>
          <p className="text-ink-secondary">
            If something goes wrong, either side can freeze a milestone and open a dispute. Both parties add evidence, an independent arbitrator with no history with either of you reviews it,
            and the decision — full payment, full refund or a fair split — is settled by the escrow contract. Every step is recorded in an audit trail you can read.
          </p>
          <ul className="space-y-2 text-sm text-ink-secondary">
            <li className="flex gap-2"><Gavel className="size-4 text-ink-muted" aria-hidden /> Conflict checks before an arbitrator is assigned</li>
            <li className="flex gap-2"><MessagesSquare className="size-4 text-ink-muted" aria-hidden /> A private case room for each dispute</li>
            <li className="flex gap-2"><Undo2 className="size-4 text-ink-muted" aria-hidden /> Refunds and splits paid out by the contract, not by us</li>
          </ul>
        </div>
        <div className="panel space-y-4 p-8">
          <Sparkles className="size-7 text-brass" aria-hidden />
          <h2 className="font-display text-2xl">AI that advises, never decides</h2>
          <p className="text-ink-secondary">
            Before you apply, an AI review points out vague scope, tight timelines, unusual budgets and missing milestones. Arbitrators can ask for an AI summary of a case’s evidence.
          </p>
          <p className="text-sm text-ink-secondary">
            AI output is always labelled, dated and kept separate from verified facts. It is never a verdict, legal advice or a guarantee — and if the model fails, we tell you rather than invent an answer.
          </p>
        </div>
      </section>

      {/* 10. Reputation */}
      <section className="border-y bg-surface">
        <div className="container grid gap-10 py-16 md:grid-cols-[1fr_1.2fr] md:items-center md:py-24">
          <div className="space-y-4">
            <p className="t-eyebrow">Reputation</p>
            <h2 className="font-display text-3xl">Reviews that come from real, paid work.</h2>
            <p className="text-ink-secondary">
              A review can only be left by the other party of a completed, escrow-funded contract — once. Ratings, completed contracts and dispute outcomes are counted by the platform, so they can’t be inflated.
            </p>
          </div>
          <div className="panel space-y-3 p-6">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1" aria-hidden>{[1, 2, 3, 4, 5].map((n) => <Star key={n} className="size-4 fill-brass text-brass" />)}</span>
              <Badge tone="success"><BadgeCheck /> Verified contract</Badge>
            </div>
            <p className="text-sm text-ink-secondary">“Each milestone was delivered with clear notes, and the revision we asked for came back the next day.”</p>
            <p className="t-meta">Example of how a review appears on a profile</p>
          </div>
        </div>
      </section>

      {/* 12. CTA */}
      <section className="container py-16 md:py-24">
        <div className="rounded-lg bg-surface-inverse px-6 py-14 text-center text-ink-inverse md:px-16">
          <h2 className="font-display text-3xl text-ink-inverse md:text-4xl">Start your next project on solid ground.</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-80">Create an account in a minute. Post a project or send a proposal today — no wallet needed until you sign.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-canvas text-ink hover:bg-surface-subtle"><Link href="/signup">Create a free account</Link></Button>
            <Button asChild size="lg" variant="ghost" className="text-ink-inverse hover:bg-white/10 hover:text-ink-inverse"><Link href="/work">Browse projects</Link></Button>
          </div>
        </div>
      </section>
    </>
  );
}

function Point({ icon: Icon, title, children }: { icon: typeof Lock; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Icon className="size-5 text-brand" aria-hidden />
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-ink-secondary">{children}</p>
    </div>
  );
}

function Workflow({ icon: Icon, eyebrow, title, steps, cta }: {
  icon: typeof Lock; eyebrow: string; title: string; steps: string[]; cta: { href: string; label: string };
}) {
  return (
    <div className="panel flex flex-col p-8">
      <Icon className="size-6 text-brand" aria-hidden />
      <p className="t-eyebrow mt-4">{eyebrow}</p>
      <h2 className="mt-1 font-display text-2xl">{title}</h2>
      <ol className="mt-6 flex-1 space-y-4">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-3 text-sm">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong">{i + 1}</span>
            <span className="text-ink-secondary">{s}</span>
          </li>
        ))}
      </ol>
      <Button asChild variant="secondary" className="mt-8 self-start"><Link href={cta.href}>{cta.label} <ArrowRight /></Link></Button>
    </div>
  );
}

/** 11. Illustrative contract — clearly labelled as an example, not live data. */
function ContractPreview() {
  const rows = [
    { title: 'Discovery & wireframes', amount: '120', state: 'Released', tone: 'success' as const, icon: CheckCheck },
    { title: 'Visual design', amount: '180', state: 'Under review', tone: 'info' as const, icon: Eye },
    { title: 'Build & launch', amount: '300', state: 'Secured', tone: 'brand' as const, icon: Lock },
  ];
  return (
    <figure className="panel overflow-hidden shadow-md" aria-label="Example contract">
      <div className="flex items-center justify-between border-b bg-surface-subtle px-5 py-3">
        <span className="t-eyebrow">Example contract</span>
        <Badge tone="brand"><Lock /> 600 SHM in escrow</Badge>
      </div>
      <div className="space-y-1 px-5 pt-5">
        <p className="font-semibold">Marketing site redesign</p>
        <p className="t-meta">3 milestones · signed by both parties</p>
      </div>
      <ul className="divide-y px-5 py-3">
        {rows.map(({ title, amount, state, tone, icon: Icon }, i) => (
          <li key={title} className="flex items-center gap-3 py-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-surface-subtle text-xs font-semibold">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
            <span className="t-money text-sm">{amount} <span className="text-ink-muted">SHM</span></span>
            <Badge tone={tone}><Icon />{state}</Badge>
          </li>
        ))}
      </ul>
      <figcaption className="border-t bg-surface-subtle px-5 py-3 text-xs text-ink-muted">Illustration of the contract workspace. Amounts are examples.</figcaption>
    </figure>
  );
}
