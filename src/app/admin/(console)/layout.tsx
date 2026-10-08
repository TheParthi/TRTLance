import type { Metadata } from 'next';
import { ConsoleNotConfigured } from '@/components/admin/not-configured';
import { ConsoleShell } from '@/components/admin/console-shell';
import { missingSupabaseConfig } from '@/lib/env';
import { requireConsole } from '@/lib/admin/access';
import { sealRemainingMs } from '@/lib/admin/seal';
import { getOverview } from '@/lib/data/admin';

/**
 * Every console page runs through here: admin or 404, sealed or sent to the gate.
 *
 * The queue counts are loaded once for the whole console so the sidebar can badge the sections that
 * have something waiting — the one number a platform team wants without having to go looking. If
 * that read fails the console still renders, just without badges: a hiccup in a decoration should
 * never take a working tool down with it.
 */
export const metadata: Metadata = {
  title: { default: 'Console', template: '%s · Console' },
  robots: { index: false, follow: false, nocache: true },
};

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  // Before anything touches the database: a missing .env.local is a setup step, and saying so is
  // more use than a stack trace from inside the Supabase client.
  const missing = missingSupabaseConfig();
  if (missing.length) return <ConsoleNotConfigured missing={missing} />;

  const { viewer, seal } = await requireConsole('/admin');
  const counts = await getOverview().then((o) => o.queues).catch(() => ({}));

  return (
    <ConsoleShell viewer={viewer} remainingMs={sealRemainingMs(seal)} counts={counts}>
      {children}
    </ConsoleShell>
  );
}
