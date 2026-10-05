'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { tokenColor } from './motion';

/**
 * TrustLance's moving paper: a field of ledger hairlines that bend away from the cursor like a lens,
 * breathe slowly, and carry pulses of "money" along a few of the lines. Decorative only (aria-hidden).
 * Without a mouse the lens drifts on its own; with reduced motion one still frame is drawn.
 */
export function LedgerField({ className, tone = 'ink', density = 16, pulses = 4 }: {
  className?: string;
  /** `ink` for paper sections, `signal` for dark sections. */
  tone?: 'ink' | 'signal';
  /** Distance between lines in CSS pixels. */
  density?: number;
  /** How many lines carry a moving pulse of money. */
  pulses?: number;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let visible = true;
    let raf = 0;
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
    let lineColor = '';
    let pulseColor = '';
    let pulseLines: { line: number; speed: number; offset: number; length: number }[] = [];

    const readColors = () => {
      lineColor = tone === 'signal' ? tokenColor('signal', 0.16) : tokenColor('ink', window.innerWidth < 768 ? 0.055 : 0.075);
      pulseColor = tokenColor('signal', tone === 'signal' ? 0.95 : 0.9);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.ceil(h / density);
      pulseLines = Array.from({ length: Math.min(pulses, count) }, (_, i) => ({
        line: Math.floor(((i + 0.5) / pulses) * count + (i % 2 ? 2 : -1)),
        speed: 0.09 + (i % 3) * 0.035,
        offset: (i * 0.37) % 1,
        length: 140 + (i % 3) * 60,
      }));
      if (reduced) draw(0);
    };

    const displace = (x: number, y0: number, t: number) => {
      // Slow breathing wave plus a lens that pushes lines away from the cursor.
      let dy = Math.sin(x * 0.0042 + t * 0.00045 + y0 * 0.013) * 2.2 + Math.sin(x * 0.011 - t * 0.0007) * 0.8;
      const dx = x - mouse.x;
      const ddy = y0 - mouse.y;
      const r = 190;
      const d2 = dx * dx + ddy * ddy;
      if (d2 < r * r) {
        const d = Math.sqrt(d2);
        const f = 1 - d / r;
        dy += Math.sign(ddy || 1) * f * f * 34;
      }
      return y0 + dy;
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const step = 10;
      const count = Math.ceil(h / density) + 1;
      ctx.lineWidth = 1;
      ctx.strokeStyle = lineColor;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const y0 = i * density + density / 2;
        for (let x = -step; x <= w + step; x += step) {
          const y = displace(x, y0, t);
          if (x === -step) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Money moving along a few lines.
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (const p of pulseLines) {
        const y0 = p.line * density + density / 2;
        const head = (((t * p.speed) / 1000 + p.offset) % 1) * (w + p.length * 2) - p.length;
        const grad = ctx.createLinearGradient(head - p.length, 0, head, 0);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, pulseColor);
        ctx.strokeStyle = grad;
        ctx.beginPath();
        for (let x = Math.max(-step, head - p.length); x <= Math.min(w + step, head); x += step / 2) {
          const y = displace(x, y0, t);
          if (x <= Math.max(-step, head - p.length)) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        if (head > 0 && head < w) {
          ctx.fillStyle = pulseColor;
          ctx.beginPath();
          ctx.arc(head, displace(head, y0, t), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const tick = (t: number) => {
      raf = 0;
      if (!visible) return;
      if (!mouse.active || !finePointer) {
        // Drift the lens on its own when nobody is steering it.
        mouse.tx = w * (0.62 + Math.sin(t * 0.00023) * 0.22);
        mouse.ty = h * (0.45 + Math.sin(t * 0.00031 + 1.3) * 0.25);
      }
      if (mouse.x < -9000) {
        mouse.x = mouse.tx;
        mouse.y = mouse.ty;
      }
      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;
      draw(t);
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      mouse.active = inside;
      if (inside) {
        mouse.tx = x;
        mouse.ty = y;
      }
    };

    readColors();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !reduced && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(canvas);
    const mo = new MutationObserver(() => {
      readColors();
      if (reduced) draw(0);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    if (!reduced) {
      window.addEventListener('pointermove', onMove, { passive: true });
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  }, [tone, density, pulses]);

  return <canvas ref={canvasRef} aria-hidden className={cn('pointer-events-none absolute inset-0 h-full w-full', className)} />;
}
