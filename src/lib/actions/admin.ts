'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { attempt, fail, toAppError, type ActionResult } from '@/lib/errors';
import { getViewer } from '@/lib/auth';
import { clearSeal, openSeal, verifyPassword } from '@/lib/admin/gate';
import { safeConsolePath } from '@/lib/admin/nav';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Everything the console can change.
 *
 * Each one calls a database function that re-checks app.is_admin() and writes to the audit log, so
 * the check here is a courtesy that produces a readable message — not the thing that makes it safe.
 */

async function adminSession() {
  const viewer = await getViewer();
  if (!viewer) throw { message: 'TL:not_authenticated', details: 'Sign in to continue.' };
  if (!viewer.isAdmin) throw { message: 'TL:forbidden', details: 'Admins only.' };
  return viewer;
}

/** Paths that can show stale numbers after a change. */
function refreshConsole(...extra: string[]) {
  revalidatePath('/admin', 'layout');
  for (const path of extra) revalidatePath(path);
}

async function adminRpc(name: string, args: Record<string, unknown>, extra: string[] = []) {
  await adminSession();
  const supabase = await createClient();
  const { error } = await supabase.rpc(name, args);
  if (error) throw error;
  refreshConsole(...extra);
  return null;
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

/**
 * Unseals the console after checking the password again.
 *
 * Rate limited per admin in the database, so a stolen session cannot be used to guess a password
 * through this form, and a wrong password says only that it was wrong — never whether the email or
 * the account exists, because by this point we already know who is asking.
 */
export async function unsealConsole(password: string, next?: string): Promise<ActionResult<string>> {
  if (!password) return fail('validation', 'Enter your password.');
  const viewer = await getViewer();
  // Someone who is not an admin learns nothing from this form.
  if (!viewer?.isAdmin) return fail('forbidden', 'That did not work.');
  if (!viewer.email) return fail('invalid_state', 'This account has no email address, so it cannot unseal the console.');

  // Fails closed: if the limiter itself cannot be reached, no password is checked. But only an
  // actual rate_limited error is reported as one — anything else is a fault on our side, and
  // telling an admin to "wait fifteen minutes" for a dropped connection would send them away
  // from a console that is simply broken.
  // Ten attempts a quarter of an hour, counted per admin. Low enough that guessing a password
  // through this form is hopeless, high enough that an admin who mistypes, steps away and comes
  // back, or runs the console's own end-to-end tests is never locked out of their own tool.
  const limiter = await createAdminClient().rpc('check_rate_limit', {
    p_bucket: 'console_unseal', p_limit: 10, p_window_seconds: 900, p_subject: viewer.id,
  });
  if (limiter.error) {
    const appError = toAppError(limiter.error);
    if (appError.code === 'rate_limited') {
      return fail('rate_limited', 'Too many attempts. Wait fifteen minutes and try again.');
    }
    console.error('[console] rate limiter unavailable', limiter.error);
    return fail('unexpected', 'The console could not be unsealed just now. Try again in a moment.');
  }

  const check = await verifyPassword(viewer.email, password);
  if (!check.ok) {
    if (check.reason === 'unavailable') {
      console.error('[console] email sign-in is disabled for this Supabase project, so the step-up check cannot run');
      return fail('auth_unavailable',
        'This deployment has email sign-in switched off, so a password cannot be checked. Turn on the email provider in Supabase (Authentication → Sign In / Providers) and try again.');
    }
    return fail('invalid_credentials', 'That password is not right.');
  }

  await openSeal(viewer.id);

  // Record the entry, with enough about the request to recognise an unexpected one later.
  const headerList = await headers();
  const detail = {
    ip: headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    user_agent: headerList.get('user-agent')?.slice(0, 200) ?? null,
  };
  const supabase = await createClient();
  await supabase.rpc('admin_record_entry', { p_detail: detail });

  return { ok: true, data: safeConsolePath(next) };
}

/** Leaves the console without signing out of TrustLance. */
export async function sealConsole() {
  await clearSeal();
  redirect('/dashboard');
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------
export async function setMemberSuspended(userId: string, suspend: boolean, reason: string): Promise<ActionResult<null>> {
  if (suspend && reason.trim().length < 10) {
    return fail('validation', 'Give a reason of at least 10 characters. The member sees it.');
  }
  return attempt(() => adminRpc('admin_set_member_suspended', {
    p_user: userId, p_suspend: suspend, p_reason: reason.trim() || null,
  }, [`/admin/members/${userId}`, '/admin/members']));
}

export async function setAdminRole(userId: string, grant: boolean, note: string): Promise<ActionResult<null>> {
  return attempt(() => adminRpc('admin_set_admin_role', {
    p_user: userId, p_grant: grant, p_note: note.trim() || null,
  }, [`/admin/members/${userId}`, '/admin/members', '/admin/settings']));
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export async function moderateProject(projectId: string, state: 'ok' | 'flagged' | 'removed', reason: string): Promise<ActionResult<null>> {
  if (state !== 'ok' && reason.trim().length < 10) {
    return fail('validation', 'Give a reason of at least 10 characters. The client sees it.');
  }
  return attempt(() => adminRpc('admin_moderate_project', {
    p_project: projectId, p_state: state, p_reason: reason.trim() || null,
  }, ['/admin/projects', `/projects/${projectId}`]));
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function updateSetting(key: string, value: number): Promise<ActionResult<null>> {
  if (!Number.isFinite(value)) return fail('validation', 'Enter a whole number.');
  if (!Number.isInteger(value)) return fail('validation', 'Enter a whole number.');
  return attempt(() => adminRpc('admin_update_setting', { p_key: key, p_value: value }, ['/admin/settings', '/admin/money']));
}

export async function setHoliday(day: string, label: string): Promise<ActionResult<null>> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return fail('validation', 'Choose a date.');
  if (label.trim().length < 2) return fail('validation', 'Name the holiday.');
  return attempt(() => adminRpc('admin_set_holiday', { p_day: day, p_label: label.trim() }, ['/admin/settings']));
}

export async function removeHoliday(day: string): Promise<ActionResult<null>> {
  return attempt(() => adminRpc('admin_remove_holiday', { p_day: day }, ['/admin/settings']));
}
