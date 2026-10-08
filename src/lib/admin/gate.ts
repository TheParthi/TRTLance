import 'server-only';
import { cookies } from 'next/headers';
import { createClient as createPlainClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';
import { COOKIE_NAME, newSeal, parseSeal, renewSeal, serializeSeal, shouldRenew, type Seal } from './seal';

/** Reading, writing and clearing the console seal, and the password check that issues one. */

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;

async function write(seal: Seal) {
  const store = await cookies();
  store.set(COOKIE_NAME, serializeSeal(seal), {
    ...cookieOptions,
    maxAge: Math.max(1, Math.ceil((seal.exp - Date.now()) / 1000)),
  });
}

/** Called once the password check has succeeded. */
export async function openSeal(userId: string) {
  const seal = newSeal(userId);
  await write(seal);
  return seal;
}

export async function clearSeal() {
  const store = await cookies();
  store.set(COOKIE_NAME, '', { ...cookieOptions, maxAge: 0 });
}

/**
 * The current seal, or null. Renews it in passing when it is getting old, which is why this is
 * called from the console layout. A Server Component cannot always set cookies, so that write is
 * best-effort: if it fails the seal is still valid, it just ages normally.
 */
export async function readSeal(userId: string): Promise<Seal | null> {
  const store = await cookies();
  const seal = parseSeal(store.get(COOKIE_NAME)?.value, userId);
  if (seal && shouldRenew(seal)) {
    try {
      await write(renewSeal(seal));
    } catch {
      // Rendering a page that cannot set cookies.
    }
  }
  return seal;
}

/** Why a password check did not succeed, when it did not. */
export type PasswordCheck = { ok: true } | { ok: false; reason: 'invalid' | 'unavailable' };

/**
 * Checks a password without touching the signed-in session.
 *
 * Deliberately a throwaway client with no cookie handling: a successful check does not rotate the
 * admin's real session, and a failed one does not disturb it either.
 *
 * The two failures are told apart on purpose. A wrong password is the admin's problem and says so;
 * email sign-in being switched off for the whole project is the deployment's problem, and reporting
 * that as "wrong password" would send someone hunting for a password that was never going to work.
 */
export async function verifyPassword(email: string, password: string): Promise<PasswordCheck> {
  const supabase = createPlainClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const unavailable = /disabled|not enabled|unsupported/i.test(error.message)
      || error.code === 'email_provider_disabled';
    return { ok: false, reason: unavailable ? 'unavailable' : 'invalid' };
  }
  if (!data.user) return { ok: false, reason: 'invalid' };
  // Throw the one-off session away rather than leaving it refreshable.
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  return { ok: true };
}

export { COOKIE_NAME, IDLE_MINUTES, MAX_HOURS, sealRemainingMs, type Seal } from './seal';
