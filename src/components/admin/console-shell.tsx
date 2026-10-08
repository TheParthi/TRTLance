import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { LogoMark } from '@/components/common/logo';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Viewer } from '@/lib/auth';
import { ConsoleSidebar, ConsoleRail, type QueueCounts } from './console-nav';
import { ConsolePalette } from './console-palette';
import { ConsoleSeal } from './console-seal';
import { ConsoleTheme, consoleThemeScript } from './console-theme';

/**
 * The console's chrome.
 *
 * Deliberately not the member shell, and deliberately dark. The marketplace is a page you browse;
 * this is a room you work in for hours, reading figures. Dark petrol surfaces let the numbers and
 * the status colours carry the page, and the change of register is itself information — you can
 * tell at a glance whether you are acting as yourself or as the platform.
 *
 * The palette comes from a token layer scoped to [data-console] (see globals.css), so every
 * primitive in the product adapts here without knowing the console exists.
 */
export function ConsoleShell({ viewer, remainingMs, counts, children }: {
  viewer: Viewer;
  remainingMs: number;
  counts: QueueCounts;
  children: React.ReactNode;
}) {
  const initials = viewer.profile.display_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div data-console className="min-h-dvh bg-canvas text-ink lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* Applied before paint, so an operator who chose light never sees a dark flash. */}
      <script dangerouslySetInnerHTML={{ __html: consoleThemeScript }} />

      <aside className="hidden border-r border-line bg-surface-sunken lg:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-5 px-3 py-4">
          <Link
            href="/admin"
            aria-label="Console overview"
            className="group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors duration-base ease-ledger hover:bg-surface-subtle"
          >
            <LogoMark />
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight tracking-tight">Console</span>
              <span className="block text-2xs leading-tight text-ink-muted">TrustLance platform</span>
            </span>
          </Link>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <ConsoleSidebar counts={counts} />
          </div>

          <div className="space-y-2.5 border-t border-line pt-3">
            <div className="flex items-center gap-2.5 px-1">
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong ring-1 ring-inset ring-brand/25"
              >
                {initials}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-ink">{viewer.profile.display_name}</span>
                <span className="block truncate text-2xs text-ink-muted">{viewer.email}</span>
              </span>
            </div>
            <Link
              href="/dashboard"
              className="console-nav-item justify-start px-1.5 text-xs"
            >
              <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
              Back to TrustLance
              <ArrowUpRight className="ml-auto size-3 opacity-50" aria-hidden />
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-3 px-4 md:px-7">
            <Link href="/admin" className="flex shrink-0 items-center gap-2 lg:hidden" aria-label="Console overview">
              <LogoMark />
              <span className="text-sm font-semibold">Console</span>
            </Link>
            <div className="ml-auto flex items-center gap-1.5">
              <ConsolePalette />
              <span aria-hidden className="mx-0.5 hidden h-5 w-px bg-line sm:block" />
              <ConsoleTheme />
              <ConsoleSeal remainingMs={remainingMs} />
            </div>
          </div>
          <div className="px-4 md:px-7">
            <ConsoleRail counts={counts} />
          </div>
        </header>

        <main id="main" className="relative min-w-0 flex-1 px-4 pb-24 pt-7 md:px-7 md:pb-16">
          <div aria-hidden className="console-grid-bg pointer-events-none absolute inset-x-0 top-0 h-80" />
          <div className="relative mx-auto max-w-[80rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}

/**
 * A console page's heading.
 *
 * Larger and quieter than the member app's: no serif display face, no animated band. A console page
 * is opened forty times a day, so the title's job is to confirm where you are in one glance and
 * then get out of the way of the data.
 */
export function ConsoleHeader({ title, description, actions, breadcrumb, meta, className }: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumb?: { label: string; href: string };
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-7 space-y-3', className)}>
      {breadcrumb && (
        <Link
          href={breadcrumb.href}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> {breadcrumb.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 space-y-2">
          <h1 className="font-sans text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
          {description && <p className="max-w-[58ch] text-sm leading-relaxed text-ink-secondary">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {meta && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted">{meta}</div>
      )}
    </header>
  );
}

/** When the platform has nothing of a kind yet, or a filter matched nothing. */
export function ConsoleEmpty({ title, description, hint }: { title: string; description?: string; hint?: React.ReactNode }) {
  return (
    <div className="console-card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-[46ch] text-sm text-ink-secondary">{description}</p>}
      {hint && <div className="pt-1 text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}

/** Marks a figure the console is confident about but whose source is worth stating. */
export function AsOf({ at }: { at: string }) {
  return (
    <Tooltip content="Read from the database when this page was rendered. Reload for current figures.">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-1.5 rounded-full bg-success shadow-[0_0_0_3px_hsl(var(--success)/0.18)]" />
        as of {new Date(at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </Tooltip>
  );
}
