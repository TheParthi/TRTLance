'use client';

import * as React from 'react';
import { Check, FileSignature, Lock, ShieldCheck, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clamp01, useStickyProgress } from './motion';

const STEPS = [
  { title: 'Agree', body: 'Client and freelancer sign the same terms — scope, milestones, amounts and dates. Signing moves no money.' },
  { title: 'Fund', body: 'The client locks the whole contract in TrustLance escrow, in coins, before any work starts. Neither side can take it back alone.' },
  { title: 'Deliver', body: 'The freelancer submits milestone 01 with files, links and notes. The money waits, locked.' },
  { title: 'Review', body: 'The client approves — or asks for changes, written into the contract’s record.' },
  { title: 'Release', body: 'Approval pays that milestone to the freelancer, less the platform fee — withdrawable to their bank after 7 working days. The rest stays secured.' },
];

const MILESTONES = [
  { title: 'Discovery', amount: 1200 },
  { title: 'Design', amount: 1800 },
  { title: 'Build & launch', amount: 3000 },
];
const TOTAL = 6000;
const ease = (k: number) => 1 - Math.pow(1 - clamp01(k), 3);

/**
 * "How the money moves", told by scrolling: the section pins while an example contract signs, funds,
 * delivers, gets approved and pays out. Each step's text is also plain content for assistive technology.
 */
export function MoneyStory() {
  const [ref, progress] = useStickyProgress<HTMLDivElement>();
  const raw = progress * STEPS.length;
  const step = Math.min(STEPS.length - 1, Math.floor(raw));
  const s = clamp01(raw - step);
  const at = (i: number, k = 0) => step > i || (step === i && s >= k);

  const fund = step < 1 ? 0 : step > 1 ? 1 : ease(s / 0.8);
  const first: 'secured' | 'review' | 'approved' | 'released' = at(4, 0.3) ? 'released' : at(3, 0.35) ? 'approved' : at(2, 0.25) ? 'review' : 'secured';
  const released = first === 'released' ? 1200 : 0;
  const secured = Math.round(TOTAL * fund) - released;

  return (
    <section id="how-it-works" data-header="dark" aria-labelledby="story-title" ref={ref} className="relative h-[560vh] scroll-mt-16 bg-surface-inverse text-ink-inverse">
      <h2 id="story-title" className="sr-only">How the money moves</h2>
      <ol className="sr-only">
        {STEPS.map((st) => <li key={st.title}>{st.title}: {st.body}</li>)}
      </ol>
      <div aria-hidden className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden pt-16 lg:pt-0">
        <div className="container grid items-center gap-5 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div className="space-y-3 lg:space-y-8">
            <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-signal">How the money moves</p>
            <div className="flex items-end gap-5 lg:gap-8">
              <div className="h-[0.9em] overflow-hidden font-display text-[clamp(3.6rem,13vw,12rem)] font-medium leading-none tracking-[-0.06em]">
                <div className="transition-transform duration-slow ease-ledger" style={{ transform: `translateY(${-step * 0.9}em)` }}>
                  {STEPS.map((_, i) => <div key={i} className="h-[0.9em] leading-[0.9]">{String(i + 1).padStart(2, '0')}</div>)}
                </div>
              </div>
              <div className="h-[1.1em] overflow-hidden pb-2 font-display text-[clamp(2rem,4.6vw,4rem)] italic leading-none">
                <div className="transition-transform duration-slow ease-ledger" style={{ transform: `translateY(${-step * 1.1}em)` }}>
                  {STEPS.map((st) => <div key={st.title} className="h-[1.1em] leading-[1.1]">{st.title}</div>)}
                </div>
              </div>
            </div>
            <p key={step} className="max-w-md animate-rise text-sm text-ink-inverse/70 sm:text-base lg:text-lg">{STEPS[step].body}</p>
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-ink-inverse/15">
                  <span className="block h-full origin-left bg-signal" style={{ transform: `scaleX(${i < step ? 1 : i === step ? s : 0})` }} />
                </span>
              ))}
            </div>
          </div>

          <StoryStatement step={step} s={s} fund={fund} first={first} secured={secured} released={released} />
        </div>
      </div>
    </section>
  );
}

function StoryStatement({ step, s, fund, first, secured, released }: {
  step: number; s: number; fund: number; first: 'secured' | 'review' | 'approved' | 'released'; secured: number; released: number;
}) {
  const at = (i: number, k = 0) => step > i || (step === i && s >= k);
  const fill = {
    secured: 'bg-brand',
    review: 'bg-info rail-stripes',
    approved: 'bg-success/60',
    released: 'bg-signal',
  };
  let cursor = 0;
  return (
    <div className="rounded-xl bg-canvas p-4 text-ink shadow-lg ring-1 ring-white/10 sm:p-5 md:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="t-label-caps">Example contract</p>
        <p className="t-meta">Marketing site redesign · 3 milestones</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-y py-3 sm:mt-5 sm:py-4">
        {['Client', 'Freelancer'].map((who, i) => {
          const signed = at(0, 0.3 + i * 0.3);
          return (
            <div key={who} className="flex items-center gap-2.5">
              <span className={cn('flex size-7 items-center justify-center rounded-full border transition-colors duration-base', signed ? 'border-success bg-success text-white' : 'border-dashed border-line-strong text-ink-muted')}>
                {signed ? <Check className="size-3.5" /> : <FileSignature className="size-3.5" />}
              </span>
              <span className="text-sm">
                <span className="block font-medium">{who}</span>
                <span className="block text-xs text-ink-muted">{signed ? 'Signed the terms' : 'Not signed yet'}</span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex h-5 gap-1">
        {MILESTONES.map((m, i) => {
          const start = cursor / TOTAL;
          cursor += m.amount;
          const end = cursor / TOTAL;
          const segFill = clamp01((fund - start) / (end - start));
          const state = i === 0 ? first : 'secured';
          return (
            <div key={m.title} className={cn('relative h-full overflow-hidden rounded-sm border border-dashed transition-colors duration-slow', segFill >= 0.999 ? 'border-transparent' : 'border-line-strong')} style={{ flexGrow: m.amount, flexBasis: 0 }}>
              <span className={cn('absolute inset-y-0 left-0 transition-[background-color] duration-slow', fill[state])} style={{ width: `${segFill * 100}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex gap-1">
        {MILESTONES.map((m, i) => {
          const label = fund === 0 ? 'Not funded' : i === 0 ? { secured: 'Secured', review: 'Under review', approved: 'Approved', released: 'Released' }[first] : 'Secured';
          return (
            <div key={m.title} className="min-w-0" style={{ flexGrow: m.amount, flexBasis: 0 }}>
              <p className="truncate text-2xs font-semibold uppercase tracking-[0.1em] text-ink-muted">0{i + 1} · {label}</p>
              <p className="t-money text-sm">{m.amount.toLocaleString('en-IN')} <span className="text-[0.7em] uppercase tracking-[0.08em] text-ink-muted">coins</span></p>
            </div>
          );
        })}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-4 border-t pt-4 sm:mt-6 sm:pt-5">
        {[
          { label: 'Total', value: TOTAL },
          { label: 'Secured', value: Math.max(0, secured) },
          { label: 'Released', value: released },
        ].map((f) => (
          <div key={f.label}>
            <dt className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{f.label}</dt>
            <dd className={cn('t-money text-xl tabular-nums sm:text-2xl md:text-3xl', f.label === 'Released' && released > 0 && 'text-success-strong')}>
              {f.value.toLocaleString('en-IN')}<span className="ml-1 text-xs uppercase tracking-[0.08em] text-ink-muted">coins</span>
            </dd>
          </div>
        ))}
      </dl>

      <ul className="mt-4 hidden space-y-2 border-t pt-4 text-sm sm:block md:mt-5">
        <Event on={at(1, 0.85)} icon={<Lock className="size-3.5" />}>6,000 coins locked in TrustLance escrow</Event>
        <Event on={at(2, 0.25)} icon={<Upload className="size-3.5" />}>Milestone 01 submitted · version 1</Event>
        <Event on={at(3, 0.35)} icon={<Check className="size-3.5" />}>Approved by the client</Event>
        <Event on={at(4, 0.3)} icon={<ShieldCheck className="size-3.5" />} strong>1,080 coins released to the freelancer (after the 10% fee)</Event>
      </ul>
    </div>
  );
}

function Event({ on, icon, children, strong }: { on: boolean; icon: React.ReactNode; children: React.ReactNode; strong?: boolean }) {
  return (
    <li className={cn('flex items-center gap-2.5 transition-[opacity,transform] duration-slow ease-ledger', on ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0')}>
      <span className={cn('flex size-6 items-center justify-center rounded-full', strong ? 'bg-signal text-signal-ink' : 'bg-surface-subtle text-ink-secondary')}>{icon}</span>
      <span className={strong ? 'font-medium' : 'text-ink-secondary'}>{children}</span>
    </li>
  );
}
