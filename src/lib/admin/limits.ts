/**
 * How long a console session lasts.
 *
 * These live apart from seal.ts because the gate's form shows them to the person unsealing, and that
 * form runs in the browser. seal.ts needs node:crypto to sign a seal, and importing it from a client
 * component would drag Node's crypto into the browser bundle — which fails the build, rightly.
 * Constants that both sides need therefore have a module of their own, with no imports at all.
 */

/** The cookie that says the console has been unsealed. Signed, never encrypted; see seal.ts. */
export const COOKIE_NAME = 'tl_console';

/** A seal lapses after this long without use. */
export const IDLE_MINUTES = 30;

/** However busy the session, it cannot be renewed past this long after the first unseal. */
export const MAX_HOURS = 8;

/** Renew once this much of the idle window has been used, so one click never expires a session. */
export const RENEW_AFTER_MINUTES = 5;

export interface Seal {
  /** The admin this seal belongs to. */
  sub: string;
  /** When they first unsealed the console (the absolute limit counts from here). */
  iat: number;
  /** When the seal lapses if it is not used (milliseconds since the epoch). */
  exp: number;
  /** Distinguishes two seals issued in the same millisecond, so each cookie value is unique. */
  jti: string;
}
