'use client';

import * as React from 'react';

/**
 * A two-part cursor for mouse users: a precise dot and a lagging ring that swells over anything
 * clickable and can carry a word (data-cursor="View"). Touch and reduced-motion visitors keep the system cursor.
 */
export function Cursor() {
  const dotRef = React.useRef<HTMLDivElement>(null);
  const ringRef = React.useRef<HTMLDivElement>(null);
  const labelRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dot = dotRef.current!;
    const ring = ringRef.current!;
    const label = labelRef.current!;
    document.documentElement.classList.add('has-cursor');
    const pos = { x: -100, y: -100, rx: -100, ry: -100, scale: 1, ts: 1 };
    let raf = 0;
    let shown = false;

    const sense = (el: Element | null) => {
      const target = el?.closest?.('a, button, [data-cursor], input, select, textarea, label');
      const word = target?.closest('[data-cursor]')?.getAttribute('data-cursor') ?? '';
      pos.ts = target ? (word ? 2.1 : 1.7) : 1;
      label.textContent = word;
      ring.dataset.active = target ? 'true' : 'false';
      ring.dataset.label = word ? 'true' : 'false';
      dot.style.opacity = shown && !word ? '1' : '0';
    };
    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!shown) {
        shown = true;
        pos.rx = pos.x;
        pos.ry = pos.y;
        ring.style.opacity = '1';
      }
      sense(e.target as Element | null);
    };
    // Content moves under a still mouse while scrolling: look again at what is under it.
    const onScroll = () => shown && sense(document.elementFromPoint(pos.x, pos.y));
    const onLeave = () => {
      shown = false;
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    };
    const onDown = () => (pos.ts *= 0.8);
    const loop = () => {
      pos.rx += (pos.x - pos.rx) * 0.18;
      pos.ry += (pos.y - pos.ry) * 0.18;
      pos.scale += (pos.ts - pos.scale) * 0.2;
      dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${pos.rx}px, ${pos.ry}px, 0) translate(-50%, -50%) scale(${pos.scale})`;
      label.style.transform = `scale(${1 / pos.scale})`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointerdown', onDown);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointerdown', onDown);
      document.documentElement.classList.remove('has-cursor');
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] hidden [@media(pointer:fine)]:block">
      <div ref={ringRef} className="fixed left-0 top-0 flex size-9 items-center justify-center rounded-full border border-ink/40 opacity-0 transition-[background-color,border-color,opacity] duration-base data-[active=true]:border-signal data-[active=true]:bg-signal/15 data-[label=true]:border-transparent data-[label=true]:bg-signal/90">
        <span ref={labelRef} className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-signal-ink" />
      </div>
      <div ref={dotRef} className="fixed left-0 top-0 size-1.5 rounded-full bg-ink opacity-0" />
    </div>
  );
}
