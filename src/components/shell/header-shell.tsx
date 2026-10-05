'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The public header: transparent over the first screen, paper with a hairline once the page scrolls,
 * and ink when it passes over a dark section (marked with data-header="dark").
 */
export function HeaderShell({ children, className }: { children: React.ReactNode; className?: string }) {
  const [state, setState] = React.useState<'top' | 'light' | 'dark'>('top');
  React.useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const y = 36;
      const dark = Array.from(document.querySelectorAll('[data-header="dark"]')).some((el) => {
        const r = el.getBoundingClientRect();
        return r.top <= y && r.bottom >= y;
      });
      setState(dark ? 'dark' : window.scrollY > 12 ? 'light' : 'top');
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <header
      data-tone={state}
      className={cn(
        'group/header sticky top-0 z-40 border-b transition-[background-color,border-color,color] duration-slow ease-ledger',
        state === 'top' && 'border-transparent bg-transparent text-ink',
        state === 'light' && 'border-line bg-canvas/80 text-ink backdrop-blur-md',
        state === 'dark' && 'border-ink-inverse/10 bg-surface-inverse/75 text-ink-inverse backdrop-blur-md',
        className,
      )}
    >
      {children}
    </header>
  );
}
