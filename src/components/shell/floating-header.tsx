'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The floating header: no bar, just capsules over the page. It slips away while reading down and comes
 * back the moment the reader scrolls up (or reaches the top), so the page always has the full screen.
 */
export function FloatingHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  const [hidden, setHidden] = React.useState(false);
  const [raised, setRaised] = React.useState(false);
  React.useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const y = window.scrollY;
      const dy = y - last;
      if (Math.abs(dy) > 6) {
        setHidden(dy > 0 && y > 140);
        last = y;
      }
      setRaised(y > 8);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      window.removeEventListener('scroll', on);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <header
      data-raised={raised}
      onFocusCapture={() => setHidden(false)}
      className={cn(
        'group/header sticky top-0 z-40 transition-transform duration-slow ease-ledger motion-reduce:transition-none',
        hidden && '-translate-y-[120%]',
        className,
      )}
    >
      {children}
    </header>
  );
}
