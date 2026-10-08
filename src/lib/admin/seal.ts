import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { IDLE_MINUTES, MAX_HOURS, RENEW_AFTER_MINUTES, type Seal } from './limits';

/**
 * The signed token behind the console's second check (see gate.ts for how it is used).
 *
 * Being signed in as an admin is not enough to open the console: an admin can suspend members, move
 * the platform fee and mark payouts as paid, so a borrowed laptop or a stolen session cookie should
 * not be able to do any of that. Unsealing asks for the password again and issues one of these.
 *
 * It is signed, never encrypted — it carries no secret, only a user id and two timestamps, and the
 * signature is what makes it unforgeable. It is bound to one user id, so it is useless to anyone
 * else, and it has two lifetimes: it lapses after IDLE_MINUTES of no use, and it cannot be renewed
 * past MAX_HOURS from the first unlock however busy the session is.
 *
 * Kept free of server-only imports so the rules below can be tested on their own. The timings and
 * the cookie name live in ./limits, which the gate's browser form can import without pulling
 * node:crypto into the bundle.
 */

export { COOKIE_NAME, IDLE_MINUTES, MAX_HOURS, RENEW_AFTER_MINUTES, type Seal } from './limits';

/**
 * Signing key. A dedicated ADMIN_SESSION_SECRET is best, because rotating it signs every admin out
 * of the console without touching anything else. Falling back to the service-role key means the
 * console still works on a deployment that has not set one, and that key is already required for
 * payouts and scheduled jobs.
 */
export function signingKey() {
  const secret = process.env.ADMIN_SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY) is not configured');
  return secret;
}

const encode = (value: string) => Buffer.from(value, 'utf8').toString('base64url');
const decode = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

const sign = (body: string) => createHmac('sha256', signingKey()).update(body).digest('base64url');

/** Compares signatures in constant time, so a wrong one reveals nothing by how long it takes. */
function signatureMatches(body: string, given: string) {
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(given);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function serializeSeal(seal: Seal) {
  const body = encode(JSON.stringify(seal));
  return `${body}.${sign(body)}`;
}

/** Reads a cookie value back, or null if it is malformed, unsigned, lapsed or for someone else. */
export function parseSeal(value: string | undefined, userId: string, now = Date.now()): Seal | null {
  if (!value) return null;
  const dot = value.lastIndexOf('.');
  if (dot <= 0 || dot === value.length - 1) return null;
  const body = value.slice(0, dot);
  if (!signatureMatches(body, value.slice(dot + 1))) return null;

  let seal: Seal;
  try {
    seal = JSON.parse(decode(body)) as Seal;
  } catch {
    return null;
  }
  if (typeof seal?.sub !== 'string' || typeof seal?.iat !== 'number' || typeof seal?.exp !== 'number') return null;
  if (seal.sub !== userId) return null;
  if (seal.exp <= now) return null;
  if (seal.iat + MAX_HOURS * 3_600_000 <= now) return null;
  // A seal dated in the future means a clock problem or a forgery attempt; refuse it either way.
  if (seal.iat > now + 60_000) return null;
  return seal;
}

export function newSeal(userId: string, now = Date.now()): Seal {
  return { sub: userId, iat: now, exp: now + IDLE_MINUTES * 60_000, jti: randomUUID() };
}

/** Extends a seal's idle window without moving its absolute limit. */
export function renewSeal(seal: Seal, now = Date.now()): Seal {
  return { ...seal, exp: Math.min(now + IDLE_MINUTES * 60_000, seal.iat + MAX_HOURS * 3_600_000) };
}

export function shouldRenew(seal: Seal, now = Date.now()) {
  const remaining = seal.exp - now;
  return remaining < (IDLE_MINUTES - RENEW_AFTER_MINUTES) * 60_000
    && seal.iat + MAX_HOURS * 3_600_000 > now;
}

/** How long this seal has left, for the countdown the console shows. */
export function sealRemainingMs(seal: Seal, now = Date.now()) {
  return Math.max(0, Math.min(seal.exp, seal.iat + MAX_HOURS * 3_600_000) - now);
}
