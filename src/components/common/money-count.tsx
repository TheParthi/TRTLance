'use client';

import * as React from 'react';
import { CURRENCY } from '@/lib/env';
import { formatAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

/**
 * A money figure that counts up from zero the first time it is seen, then settles on the exact
 * amount (formatted from the original string, so no rounding ever reaches the final figure).
 */
export function MoneyCount({ amount, className, unitClassName, duration = 1300, delay = 0 }: {
  amount: string;
  className?: string;
  unitClassName?: string;
  duration?: number;
  delay?: number;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const target = Number(amount) || 0;
  const [shown, setShown] = React.useState<string>(formatAmount(amount, { symbol: false }));
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let timer = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setShown('0');
      timer = window.setTimeout(() => {
        const start = performance.now();
        const tick = (t: number) => {
          const k = Math.min(1, (t - start) / duration);
          const v = target * (1 - Math.pow(1 - k, 3));
          setShown(k < 1 ? formatAmount(v.toFixed(target < 10 ? 2 : 0), { symbol: false }) : formatAmount(amount, { symbol: false }));
          if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }, delay);
    }, { threshold: 0.3 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [amount, target, duration, delay]);
  return (
    <span ref={ref} className={cn('t-money inline-flex items-baseline gap-1 tabular-nums', className)}>
      <span>{shown}</span>
      <span className={cn('font-medium uppercase tracking-[0.08em] text-ink-muted', unitClassName ?? 'text-[0.42em]')}>{CURRENCY}</span>
    </span>
  );
}
