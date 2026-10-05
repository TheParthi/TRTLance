'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * An endless band of words. It drifts on its own, speeds up with the scroll and turns around when the
 * reader scrolls back up. Decorative: the words repeat headings found elsewhere on the page.
 */
export function Marquee({ items, className, reverse = false }: { items: React.ReactNode[]; className?: string; reverse?: boolean }) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const track = trackRef.current;
    if (!track || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let x = 0;
    let dir = reverse ? 1 : -1;
    let boost = 0;
    let lastY = window.scrollY;
    let last = performance.now();
    let raf = 0;
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (Math.abs(dy) > 0.5) dir = (dy > 0 ? -1 : 1) * (reverse ? -1 : 1);
      boost += (Math.min(Math.abs(dy) * 6, 900) - boost) * 0.08;
      const half = track.scrollWidth / 2;
      x += dir * (60 + boost) * dt;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = `translate3d(${x}px, 0, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reverse]);

  const run = (
    <div className="flex shrink-0 items-center">
      {items.map((it, i) => <span key={i} className="flex shrink-0 items-center">{it}</span>)}
    </div>
  );
  return (
    <div aria-hidden className={cn('overflow-hidden whitespace-nowrap', className)}>
      <div ref={trackRef} className="flex w-max will-change-transform">
        {run}
        {run}
      </div>
    </div>
  );
}
