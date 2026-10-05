import Link from 'next/link';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { Cursor } from '@/components/marketing/cursor';
import { HeroRing } from '@/components/marketing/hero-ring';
import { Intro } from '@/components/marketing/intro';
import { LedgerField } from '@/components/marketing/ledger-field';
import { LiveProjects, type LiveProject } from '@/components/marketing/live-projects';
import { Magnetic } from '@/components/marketing/magnetic';
import { Marquee } from '@/components/marketing/marquee';
import { MoneyStory } from '@/components/marketing/money-story';
import { Reveal, ScrubText, SplitWords } from '@/components/marketing/reveal';
import { SmoothScroll } from '@/components/marketing/smooth-scroll';
import { getCategories, getMilestonePlans, searchProjects } from '@/lib/data/projects';

const doors = [
  {
    href: '/signup',
    eyebrow: 'For clients',
    title: 'Hire with your money protected.',
    steps: ['Describe the work, budget and milestones.', 'Compare proposals side by side.', 'Sign, then fund escrow — not a person.', 'Approve each milestone to release it.'],
    cta: 'Post a project',
  },
  {
    href: '/work',
    eyebrow: 'For freelancers',
    title: 'Work knowing the money is there.',
    steps: ['See every client’s funding history first.', 'Propose your own milestones and price.', 'Start only once escrow is funded.', 'Get paid on each approval, to your wallet.'],
    cta: 'Find work',
  },
];

const principles = [
  { title: 'Non-custodial escrow', body: 'Funds sit in a smart contract with no withdraw function for TrustLance. Only the parties — or an arbitrator’s decision — can move them.' },
  { title: 'One verified wallet', body: 'You prove a wallet is yours once, by signing a free message. Payments go only to that wallet, and every transaction shows its hash.' },
  { title: 'Disputes decided, not argued', body: 'Either side can freeze a milestone. A conflict-checked arbitrator reads the evidence and the escrow contract pays out the decision.' },
  { title: 'AI that advises, never decides', body: 'AI reviews point out vague scope and risky budgets. They are labelled, dated and kept apart from verified facts — never a verdict.' },
  { title: 'Reviews from paid work only', body: 'A review can only follow a completed, escrow-funded contract, once per side. Ratings are counted by the platform, not typed in.' },
];

async function loadLive(): Promise<{ projects: LiveProject[]; total: number }> {
  try {
    const [result, categories] = await Promise.all([searchProjects({ sort: 'newest' }), getCategories().catch(() => [])]);
    const rows = result.rows.slice(0, 5);
    const plans = await getMilestonePlans(rows.map((r) => r.id)).catch(() => new Map());
    const names = new Map(categories.map((c) => [c.slug, c.label]));
    return {
      total: result.total,
      projects: rows.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category ? names.get(r.category) ?? null : null,
        budget: r.budget_amount,
        proposals: r.proposal_count,
        plan: (plans.get(r.id) ?? []).map((m: { title: string; amount: string }) => ({ title: m.title, amount: m.amount })),
      })),
    };
  } catch {
    return { projects: [], total: 0 };
  }
}

export default async function LandingPage() {
  const live = await loadLive();
  const words = ['Signed', 'Funded', 'Delivered', 'Approved', 'Released'];

  return (
    <>
      <Intro />
      <SmoothScroll />
      <Cursor />

      {/* 1. Hero — the escrow ring plays an example contract while the headline sets the promise. */}
      <section className="relative -mt-[4.5rem] flex min-h-svh flex-col overflow-hidden pt-[4.5rem]">
        <LedgerField className="opacity-90 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]" />
        <HeroRing className="pointer-events-none absolute inset-x-0 top-[4.5rem] h-[44svh] lg:bottom-0 lg:left-auto lg:right-[-3vw] lg:top-[4.5rem] lg:h-auto lg:w-[56vw]" />

        <div className="container relative mt-auto pb-8 pt-[47svh] lg:pb-10 lg:pt-28">
          <h1 className="font-display font-medium leading-[0.9] tracking-[-0.045em]">
            <span className="block pb-2 text-[clamp(1.6rem,3.2vw,2.9rem)] italic tracking-[-0.02em] text-ink-secondary">
              <SplitWords text="Freelance work," immediate afterIntro delay={0} />
            </span>{' '}
            <span className="block text-[clamp(3.3rem,8.6vw,9rem)]">
              <SplitWords text="funded before" immediate afterIntro delay={120} />
            </span>{' '}
            <span className="block text-[clamp(3.3rem,8.6vw,9rem)]">
              <SplitWords text="it starts." immediate afterIntro delay={260} />
            </span>
          </h1>
          <div className="mt-8 flex max-w-xl animate-rise flex-col gap-6 [animation-delay:calc(var(--intro-delay)+500ms)] lg:mt-10">
            <p className="max-w-md text-base leading-relaxed text-ink-secondary">
              The client’s money is locked in escrow before the first hour of work, and each milestone is paid the moment it’s approved. No chasing invoices. No paying for work you never get.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <Magnetic>
                <Link href="/signup" className="group inline-flex h-14 items-center gap-2 rounded-full bg-signal pl-7 pr-6 text-base font-semibold text-signal-ink shadow-[0_12px_32px_-14px_hsl(var(--signal))]">
                  Create a free account
                  <ArrowUpRight className="size-5 transition-transform duration-base ease-ledger group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </Magnetic>
              <Link href="/work" className="group inline-flex items-center gap-1.5 text-sm font-semibold">
                <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-slow ease-ledger group-hover:bg-[length:100%_1px]">Browse open projects</span>
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        <div className="container relative flex items-end justify-between gap-6 pb-6">
          <Link href="/work" className="group block w-56" data-cursor="Browse">
            <span className="relative inline-flex h-6 items-center rounded-t-md border border-b-0 border-ink/20 bg-canvas px-2.5 text-2xs font-semibold uppercase tracking-[0.14em]">Open now</span>
            <span className="-mt-px block rounded-b-md rounded-tr-md border border-ink/20 bg-canvas/80 p-3 backdrop-blur transition-colors duration-base group-hover:border-ink/50">
              <span className="t-money block text-3xl">{live.total}</span>
              <span className="block text-xs text-ink-secondary">open project{live.total === 1 ? '' : 's'} on TrustLance, each paid through escrow</span>
            </span>
          </Link>
          <a href="#manifesto" className="hidden flex-col items-center gap-2 text-2xs font-semibold uppercase tracking-[0.18em] text-ink-muted md:flex">
            Scroll
            <span className="block h-10 w-px animate-scroll-cue bg-ink/50" />
          </a>
          <span className="hidden w-56 md:block" />
        </div>
      </section>

      {/* 2. Manifesto — the paragraph inks itself in as you scroll. */}
      <section id="manifesto" aria-label="Our promise" className="container">
        <ScrubText
          className="font-display text-[clamp(2rem,5vw,4.6rem)] font-medium leading-[1.05] tracking-[-0.03em]"
          highlight={['money', 'locked', 'released']}
          text="Money that waits for the work. Work that knows the money is there. Every milestone is locked, reviewed and released in the open — by a contract nobody can quietly change."
        />
      </section>

      {/* 3. The story, pinned: an example contract signs, funds, delivers, gets approved and pays out. */}
      <MoneyStory />

      {/* 4. Band */}
      <section aria-hidden className="border-y border-ink bg-signal py-5 text-signal-ink md:py-7">
        <Marquee
          items={words.map((w, i) => (
            <span key={w} className="flex items-center">
              <span className={i % 2 ? 'font-display text-[clamp(2.5rem,6vw,5.5rem)] italic leading-none tracking-[-0.03em]' : 'text-[clamp(2.2rem,5.4vw,5rem)] font-black uppercase leading-none tracking-[-0.04em]'}>{w}</span>
              <span className="mx-6 inline-block size-3 rounded-full bg-signal-ink md:mx-10 md:size-4" />
            </span>
          ))}
        />
      </section>

      {/* 5. Two ways in. */}
      <section aria-labelledby="doors-title" className="container py-24 md:py-36">
        <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-6 md:mb-16">
          <h2 id="doors-title" className="font-display text-[clamp(2.5rem,6vw,5.5rem)] font-medium leading-[0.95] tracking-[-0.04em]">Two ways in.</h2>
          <p className="max-w-sm text-ink-secondary">The same contract protects both sides. Pick the side you’re on.</p>
        </Reveal>
        <div className="flex flex-col gap-4 lg:h-[34rem] lg:flex-row">
          {doors.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              data-cursor="Enter"
              className="group relative flex min-h-[26rem] flex-col justify-between overflow-hidden rounded-2xl border border-ink/15 p-7 transition-[flex-grow,background-color,color,border-color] duration-[900ms] ease-ledger hover:border-transparent hover:bg-surface-inverse hover:text-ink-inverse lg:flex-1 lg:p-10 lg:hover:flex-[1.45]"
            >
              <div className="flex items-start justify-between gap-6">
                <span className="text-2xs font-semibold uppercase tracking-[0.18em] opacity-70">{d.eyebrow}</span>
                <span className="flex size-12 items-center justify-center rounded-full border border-ink/20 transition-[background-color,color,transform,border-color] group-hover:border-ink-inverse/20 duration-slow ease-ledger group-hover:rotate-45 group-hover:border-transparent group-hover:bg-signal group-hover:text-signal-ink">
                  <ArrowUpRight className="size-5" aria-hidden />
                </span>
              </div>
              <div className="space-y-8">
                <p className="max-w-md font-display text-[clamp(2.2rem,3.6vw,3.4rem)] font-medium leading-[1] tracking-[-0.03em]">{d.title}</p>
                <ol className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                  {d.steps.map((s, i) => (
                    <li key={s} className="flex gap-3 border-t border-ink/15 pt-2.5 opacity-80 transition-colors duration-slow group-hover:border-ink-inverse/20">
                      <span className="t-mono opacity-60">0{i + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                <span className="inline-flex items-center gap-2 text-sm font-semibold">{d.cta}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 6. Real open projects. */}
      <section aria-labelledby="live-title" className="container pb-24 md:pb-36">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-3">
            <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Live on TrustLance</p>
            <h2 id="live-title" className="font-display text-[clamp(2.5rem,6vw,5.5rem)] font-medium leading-[0.95] tracking-[-0.04em]">Open right now.</h2>
          </div>
          <Link href="/work" className="group inline-flex items-center gap-1.5 text-sm font-semibold">
            All {live.total} open project{live.total === 1 ? '' : 's'} <ArrowUpRight className="size-4 transition-transform duration-base group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </Reveal>
        {live.projects.length ? (
          <LiveProjects projects={live.projects} />
        ) : (
          <p className="border-y border-ink/15 py-10 font-display text-2xl text-ink-secondary">New projects appear here the moment they’re posted.</p>
        )}
      </section>

      {/* 7. Protection principles. */}
      <section id="protection" aria-labelledby="protection-title" className="scroll-mt-20 border-t border-ink/15">
        <div className="container grid gap-12 py-24 md:py-36 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Protection</p>
              <h2 id="protection-title" className="mt-4 font-display text-[clamp(2.5rem,5vw,4.75rem)] font-medium leading-[0.95] tracking-[-0.04em]">
                Built so nobody has to trust blindly.
              </h2>
            </div>
          </div>
          <ol className="lg:col-span-7">
            {principles.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 40} className="group grid grid-cols-[3rem_minmax(0,1fr)] gap-4 border-t border-ink/15 py-8 last:border-b md:grid-cols-[5rem_minmax(0,1fr)] md:py-10">
                <span className="t-mono pt-2 text-sm text-ink-muted">0{i + 1}</span>
                <div className="space-y-3">
                  <h3 className="font-display text-[clamp(1.6rem,2.6vw,2.4rem)] font-medium leading-tight tracking-[-0.02em] transition-transform duration-slow ease-ledger group-hover:translate-x-2">{p.title}</h3>
                  <p className="max-w-lg text-ink-secondary">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 8. Close. */}
      <section data-header="dark" aria-labelledby="close-title" className="relative overflow-hidden bg-surface-inverse text-ink-inverse">
        <LedgerField tone="signal" density={18} pulses={6} />
        <div className="container relative flex min-h-[85svh] flex-col justify-center py-24">
          <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-signal">Free to join · no wallet until you sign</p>
          <h2 id="close-title" className="mt-6 max-w-5xl font-display text-[clamp(3rem,9vw,9rem)] font-medium leading-[0.9] tracking-[-0.045em]">
            <SplitWords text="Start on solid ground." />
          </h2>
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-5">
            <Magnetic>
              <Link href="/signup" className="group inline-flex h-16 items-center gap-2 rounded-full bg-signal pl-8 pr-7 text-lg font-semibold text-signal-ink">
                Create a free account <ArrowUpRight className="size-5 transition-transform duration-base group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </Magnetic>
            <Link href="/work" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-inverse/80 hover:text-ink-inverse">
              Browse projects <ArrowDown className="size-4 -rotate-90" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
