'use client';

import * as React from 'react';

const SELECTOR = 'main [data-reveal], main .ledger > *';

/**
 * One observer for the whole app: rows of every ledger, statements and rails rise (or grow) into place
 * the first time they scroll into view. What is already on screen when a page opens is left alone, and
 * nothing is hidden at all without JavaScript or with reduced motion.
 */
export function RevealObserver() {
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    const io = new IntersectionObserver(
      (entries) => {
        let i = 0;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.style.animationDelay = `${Math.min(i++, 10) * 55}ms`;
          el.dataset.shown = 'anim';
          io.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.05 },
    );
    const scan = (first = false) => {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (el.dataset.shown) return;
        if (first && el.getBoundingClientRect().top < window.innerHeight) {
          el.dataset.shown = 'static';
          return;
        }
        if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', '');
        io.observe(el);
      });
    };
    scan(true);
    root.classList.add('reveal-ready');
    let queued = 0;
    const mo = new MutationObserver(() => {
      if (!queued) queued = requestAnimationFrame(() => ((queued = 0), scan()));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(queued);
      root.classList.remove('reveal-ready');
    };
  }, []);
  return null;
}
