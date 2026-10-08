import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LogoMark } from '@/components/common/logo';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Viewer } from '@/lib/auth';
import { ConsoleSidebar, ConsoleRail, type QueueCounts } from './console-nav';
import { ConsolePalette } from './console-palette';
import { ConsoleSeal } from './console-seal';
import { ConsoleTheme } from './console-theme';

/**
 * The console's chrome.
 *
 * Deliberately not the member shell. The member app is a wide, airy reading surface with a floating
 * header; this is a working tool, so it has a fixed sidebar, a slim top bar, and content that starts
 * near the top of the window instead of after a title block. The two share every colour, type and
 * motion token, so it is recognisably the same product in a different mode — and the switch in look
 * is itself useful, because you can tell at a glance whether you are acting as yourself or as the
 * platform.
 */
export function ConsoleShell({ viewer, remainingMs, counts, children }: {
  viewer: Viewer;
  remainingMs: number;
  counts: QueueCounts;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[theme(spacing.sidebar)_minmax(0,1fr)]">
      {/* Sidebar */}
      <div className="hidden border-r bg-surface-subtle/40 lg:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-6 overflow-y-auto px-3 py-4">
          <Link href="/admin" className="flex items-center gap-2 px-3" aria-label="Console overview">
            <LogoMark />
            <span className="text-sm font-semibold tracking-tight">Console</span>
          </Link>

          <div className="flex-1">
            <ConsoleSidebar counts={counts} />
          </div>

          <div className="space-y-2 border-t px-3 pt-3">
            <p className="truncate text-xs font-medium text-ink">{viewer.profile.display_name}</p>
            <p className="truncate t-meta">{viewer.email}</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
            >
              <ArrowLeft className="size-3.5" aria-hidden /> Back to TrustLance
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b bg-canvas/90 backdrop-blur">
          <div className="flex h-topbar items-center gap-3 px-4 md:px-6">
            <Link href="/admin" className="flex shrink-0 items-center gap-2 lg:hidden" aria-label="Console overview">
              <LogoMark />
              <span className="text-sm font-semibold">Console</span>
            </Link>
            <div className="ml-auto flex items-center gap-1.5">
              <ConsolePalette />
              <ConsoleTheme />
              <ConsoleSeal remainingMs={remainingMs} />
            </div>
          </div>
          <div className="px-4 md:px-6">
            <ConsoleRail counts={counts} />
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 px-4 pb-20 pt-6 md:px-6 md:pb-16">
          <div className="mx-auto max-w-content">{children}</div>
        </main>
      </div>
    </div>
  );
}

/**
 * A console page's heading. Flat and quiet on purpose — the member app opens each page with a large
 * serif title and a band of moving ledger lines, which is lovely once and tiring forty times a day.
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
    <header className={cn('mb-6 space-y-3', className)}>
      {breadcrumb && (
        <Link
          href={breadcrumb.href}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> {breadcrumb.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="max-w-reading text-sm text-ink-secondary">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {meta && <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-secondary">{meta}</div>}
    </header>
  );
}

/** When the platform has nothing of a kind yet, or a filter matched nothing. */
export function ConsoleEmpty({ title, description, hint }: { title: string; description?: string; hint?: React.ReactNode }) {
  return (
    <div className="border-y py-10">
      <div className="max-w-reading space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="text-sm text-ink-secondary">{description}</p>}
        {hint && <div className="pt-1 t-meta">{hint}</div>}
      </div>
    </div>
  );
}

/** Marks a figure the console is confident about but whose source is worth stating. */
export function AsOf({ at }: { at: string }) {
  return (
    <Tooltip content="Read from the database when this page was rendered. Reload for current figures.">
      <span className="t-meta">as of {new Date(at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
    </Tooltip>
  );
}
