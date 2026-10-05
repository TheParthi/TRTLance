'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/** Pulls its content gently towards the cursor while the cursor is near, then springs back. Mouse only. */
export function Magnetic({ children, className, strength = 0.32 }: { children: React.ReactNode; className?: string; strength?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = 'translate3d(0, 0, 0)';
  };
  return (
    <span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className={cn('inline-flex transition-transform duration-slow ease-ledger motion-reduce:transition-none', className)}
    >
      {children}
    </span>
  );
}
