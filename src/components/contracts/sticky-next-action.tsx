'use client';

import * as React from 'react';

/**
 * Phones and tablets: once the next-step headline scrolls out of view, the same step stays reachable
 * in a slim bar above the tab bar. It is never shown while the headline itself is visible.
 */
export function StickyNextAction({ title, children }: { title: string; children: React.ReactNode }) {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const el = document.querySelector('[data-next-step]');
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-[calc(theme(spacing.bottombar)+env(safe-area-inset-bottom))] z-30 animate-rise border-t bg-surface/95 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-content items-center gap-3 px-4 py-2.5 md:px-6">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{title}</p>
        {children}
      </div>
    </div>
  );
}
