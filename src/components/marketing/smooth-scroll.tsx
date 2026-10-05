'use client';

import * as React from 'react';

/**
 * Weighted, inertial scrolling for the landing page (Lenis). Native scrolling stays in charge for
 * keyboard, screen readers and reduced-motion visitors; anchor links glide to their section.
 */
export function SmoothScroll() {
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let destroy = () => {};
    (async () => {
      const { default: Lenis } = await import('lenis');
      const lenis = new Lenis({
        lerp: 0.1,
        anchors: { offset: -88 },
        smoothWheel: true,
        allowNestedScroll: true,
        // Dialogs, menus and anything that scrolls on its own keep native scrolling.
        prevent: (node: HTMLElement) => Boolean(node.closest?.('[role="dialog"], [role="menu"], [role="listbox"], [data-lenis-prevent], [data-radix-popper-content-wrapper]')),
      });
      const loop = (t: number) => {
        lenis.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      destroy = () => lenis.destroy();
    })();
    return () => {
      cancelAnimationFrame(raf);
      destroy();
    };
  }, []);
  return null;
}
