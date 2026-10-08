import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { getViewer, type Viewer } from '@/lib/auth';
import { readSeal, type Seal } from './gate';

/**
 * Who may open a console page.
 *
 * Two deliberate choices:
 *
 * Anyone who is not an admin gets a 404, not a redirect and not "forbidden". A visitor, a member and
 * a signed-out browser all see exactly the same not-found page, so nothing on the public internet
 * can tell that /admin is a real place or who the admins are.
 *
 * An admin without a current seal is sent to the gate with the page they wanted, so unsealing takes
 * them where they were going. The seal is a second factor, not the only one: every function the
 * console calls re-checks app.is_admin() in the database, so a forged seal still cannot read or
 * change anything.
 */
export interface ConsoleSession {
  viewer: Viewer;
  seal: Seal;
}

export async function requireConsole(path: string): Promise<ConsoleSession> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound();
  const seal = await readSeal(viewer.id);
  if (!seal) redirect(`/admin/gate?next=${encodeURIComponent(path)}`);
  return { viewer, seal };
}

/** For the gate itself, which must render for an admin who has no seal yet. */
export async function requireAdminForGate(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound();
  return viewer;
}

export { safeConsolePath } from './nav';
