import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';

/**
 * One measure over time, as bars.
 *
 * Deliberately one series per chart. Signups are a count and fees are coins, so putting them on one
 * pair of axes would need two y-scales — the fastest way to make a chart lie. Several of these side
 * by side compare honestly, because each keeps its own scale and says so in its own heading.
 *
 * With a single series the title names it, so there is no legend and no colour to decode. Only the
 * largest bar is labelled; a number on every bar is noise. Every bar carries a <title>, which gives
 * both a hover tooltip and the text a screen reader reads, and the same numbers are available as a
 * table underneath for anyone who would rather read them.
 */

export type TrendTone = 'brand' | 'brass' | 'success' | 'info' | 'danger' | 'refund';

const fills: Record<TrendTone, string> = {
  brand: 'fill-brand',
  brass: 'fill-brass',
  success: 'fill-success',
  info: 'fill-info',
  danger: 'fill-danger',
  refund: 'fill-refund',
};

export interface TrendPoint {
  day: string;
  value: number;
}

export function Trend({ title, unit, points, tone = 'brand', className, format = (v: number) => v.toLocaleString('en-IN') }: {
  title: string;
  /** What one unit is, for the labels and the total ("contracts", "coins"). */
  unit: string;
  points: TrendPoint[];
  tone?: TrendTone;
  className?: string;
  format?: (value: number) => string;
}) {
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const peak = Math.max(...points.map((p) => p.value), 0);
  // A flat run of zeroes should read as a flat floor, not as full-height bars.
  const scale = peak > 0 ? peak : 1;
  const count = Math.max(points.length, 1);

  // One unit of width per bar, with a 2px gap carved out of each so neighbours never touch.
  const W = 100;
  const H = 34;
  const slot = W / count;
  const gap = Math.min(slot * 0.3, 1.6);
  const barWidth = Math.max(slot - gap, 0.6);
  const radius = Math.min(barWidth / 2, 1.2);

  const peakIndex = points.findIndex((p) => p.value === peak && peak > 0);

  return (
    <figure className={cn('min-w-0 space-y-2', className)}>
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="t-label-caps">{title}</span>
        <span className="t-money text-sm">
          {format(total)} <span className="text-2xs font-medium uppercase tracking-[0.08em] text-ink-muted">{unit}</span>
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${title}: ${format(total)} ${unit} over ${count} days, highest ${format(peak)}`}
        className="h-14 w-full overflow-visible"
      >
        {/* A recessive baseline, so a day with nothing still reads as a day. */}
        <line x1="0" y1={H} x2={W} y2={H} className="stroke-line" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        {points.map((point, i) => {
          const height = point.value > 0 ? Math.max((point.value / scale) * (H - 2), 1.2) : 0;
          return (
            <g key={point.day}>
              {height > 0 && (
                <rect
                  x={i * slot + gap / 2}
                  y={H - height}
                  width={barWidth}
                  height={height}
                  rx={radius}
                  className={cn(fills[tone], 'transition-opacity duration-base ease-ledger hover:opacity-70')}
                >
                  <title>{`${formatDate(point.day)}: ${format(point.value)} ${unit}`}</title>
                </rect>
              )}
              {/* An invisible full-height target, so hovering a short bar is still easy. */}
              <rect x={i * slot} y="0" width={slot} height={H} fill="transparent">
                <title>{`${formatDate(point.day)}: ${format(point.value)} ${unit}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>

      <p className="flex items-baseline justify-between gap-2 t-meta">
        <span>{formatDate(points[0]?.day)}</span>
        {peak > 0 && <span className="font-medium text-ink-secondary">peak {format(peak)} on {formatDate(points[peakIndex]?.day)}</span>}
        <span>{formatDate(points[points.length - 1]?.day)}</span>
      </p>

      <details className="group">
        <summary className="cursor-pointer list-none text-2xs font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          Read as a table
        </summary>
        <div className="mt-2 max-h-48 overflow-auto rounded border">
          <table className="w-full text-xs">
            <caption className="sr-only">{title} by day</caption>
            <thead className="sticky top-0 bg-surface-subtle">
              <tr>
                <th scope="col" className="px-2 py-1 text-left font-medium">Day</th>
                <th scope="col" className="px-2 py-1 text-right font-medium">{unit}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.day} className="border-t">
                  <td className="px-2 py-1">{formatDate(point.day)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{format(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/**
 * Magnitude across a handful of named buckets, as horizontal bars.
 *
 * One hue, because the bars are the same kind of thing at different sizes — colour would only
 * repeat what length already says. Every bar is labelled, so nothing has to be decoded.
 */
export function BarList({ items, total, format = (v: number) => v.toLocaleString('en-IN'), className }: {
  items: { label: string; value: number; hint?: string; tone?: TrendTone }[];
  /** The denominator for the bar widths. Defaults to the largest value. */
  total?: number;
  format?: (value: number) => string;
  className?: string;
}) {
  const max = total ?? Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => {
        const pct = max > 0 ? Math.min(100, (Math.abs(item.value) / max) * 100) : 0;
        return (
          <li key={item.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{item.label}</span>
              <span className="t-money shrink-0 text-sm">{format(item.value)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className={cn('h-full rounded-full', {
                  brand: 'bg-brand', brass: 'bg-brass', success: 'bg-success',
                  info: 'bg-info', danger: 'bg-danger', refund: 'bg-refund',
                }[item.tone ?? 'brand'])}
                style={{ width: `${pct}%` }}
              />
            </div>
            {item.hint && <p className="t-meta">{item.hint}</p>}
          </li>
        );
      })}
    </ul>
  );
}
