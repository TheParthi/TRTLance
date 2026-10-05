'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { clamp01, useInView, useStickyProgress } from './motion';

/** Content that rises into place the first time it scrolls into view. */
export function Reveal({ children, className, delay = 0, as: Tag = 'div' }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'li' | 'p' | 'section';
}) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.15 });
  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn('transition-[opacity,transform] duration-[900ms] ease-ledger motion-reduce:transition-none', inView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/**
 * A heading whose words slide up from behind a mask, one after another. Words stay real text with
 * real spaces, so screen readers, search and find-in-page see the sentence exactly once.
 */
export function SplitWords({ text, className, wordClassName, delay = 0, stagger = 55, immediate = false, afterIntro = false }: {
  text: string;
  className?: string;
  wordClassName?: (word: string, index: number) => string | undefined;
  delay?: number;
  stagger?: number;
  /** Animate on mount instead of on scroll into view (for the first screen). */
  immediate?: boolean;
  /** Wait for the landing intro to lift first. */
  afterIntro?: boolean;
}) {
  const [ref, inView] = useInView<HTMLSpanElement>({ threshold: 0.2 });
  const words = text.split(' ');
  return (
    <span ref={ref} className={className}>
        {words.map((w, i) => (
          <React.Fragment key={i}>
          <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <span
              className={cn(
                'inline-block',
                // The first screen animates with CSS alone, so the headline never waits for JavaScript.
                immediate
                  ? 'animate-word-up'
                  : cn('transition-transform duration-[1000ms] ease-ledger motion-reduce:transition-none', inView ? 'translate-y-0' : 'translate-y-[110%] motion-reduce:translate-y-0'),
                wordClassName?.(w, i),
              )}
              style={immediate ? { animationDelay: afterIntro ? `calc(var(--intro-delay, 0ms) + ${delay + i * stagger}ms)` : `${delay + i * stagger}ms` } : { transitionDelay: `${delay + i * stagger}ms` }}
            >
              {w}
            </span>
          </span>
          {i < words.length - 1 && ' '}
          </React.Fragment>
        ))}
    </span>
  );
}

/** A paragraph that inks itself in, word by word, as you scroll through its section. */
export function ScrubText({ text, className, highlight = [] }: { text: string; className?: string; highlight?: string[] }) {
  const [ref, progress] = useStickyProgress<HTMLDivElement>();
  const words = text.split(' ');
  return (
    <div ref={ref} className="relative h-[220vh]">
      <div className="sticky top-0 flex h-svh items-center">
        <p className={className}>
            {words.map((w, i) => {
              const local = clamp01(progress * 1.25 * words.length - i);
              const strong = highlight.some((h) => w.toLowerCase().startsWith(h));
              return (
                <span key={i} className={cn('transition-colors duration-fast', strong && local > 0.5 && 'text-brand')} style={{ opacity: 0.14 + local * 0.86 }}>
                  {w}{' '}
                </span>
              );
            })}
        </p>
      </div>
    </div>
  );
}

/** Counts up to a value when it first appears (tabular, so the width never jumps). */
export function CountUp({ value, className, duration = 1400 }: { value: number; className?: string; duration?: number }) {
  const [ref, inView] = useInView<HTMLSpanElement>({ threshold: 0.4 });
  const [shown, setShown] = React.useState(0);
  React.useEffect(() => {
    if (!inView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setShown(value);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = clamp01((t - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);
  return <span ref={ref} className={cn('tabular-nums', className)}>{shown.toLocaleString('en-IN')}</span>;
}
