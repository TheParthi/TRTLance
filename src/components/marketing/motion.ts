'use client';

import * as React from 'react';

/** True when the visitor asked the OS for less motion. Starts false on the server, settles after mount. */
export function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** Fires once when the element first comes into view. */
export function useInView<T extends Element>(options: IntersectionObserverInit = { threshold: 0.2 }) {
  const ref = React.useRef<T>(null);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        io.disconnect();
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, inView] as const;
}

/**
 * Progress (0–1) of a tall section scrolling past a sticky viewport: 0 when its top reaches the top of
 * the screen, 1 when its bottom reaches the bottom. Updated once per frame while scrolling.
 */
export function useStickyProgress<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      setProgress((old) => (Math.abs(old - p) > 0.0005 ? p : old));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return [ref, progress] as const;
}

/** Reads a colour token (an "h s% l%" triple) from :root, for canvas and WebGL drawing. */
export function tokenColor(name: string, alpha = 1) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return `hsl(${v} / ${alpha})`;
}

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
