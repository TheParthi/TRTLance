import { describe, expect, it } from 'vitest';

process.env.ADMIN_SESSION_SECRET ??= 'test-secret-for-the-console-seal';

const {
  IDLE_MINUTES, MAX_HOURS, newSeal, parseSeal, renewSeal, sealRemainingMs, serializeSeal, shouldRenew,
} = await import('./seal');

const ADMIN = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
const minutes = (n: number) => n * 60_000;
const hours = (n: number) => n * 3_600_000;

describe('the console seal', () => {
  it('round-trips a seal for the admin it was issued to', () => {
    const seal = newSeal(ADMIN, NOW);
    const read = parseSeal(serializeSeal(seal), ADMIN, NOW + minutes(1));
    expect(read).toEqual(seal);
  });

  it('is useless to a different admin', () => {
    const cookie = serializeSeal(newSeal(ADMIN, NOW));
    expect(parseSeal(cookie, OTHER, NOW)).toBeNull();
  });

  it('lapses after the idle window', () => {
    const cookie = serializeSeal(newSeal(ADMIN, NOW));
    expect(parseSeal(cookie, ADMIN, NOW + minutes(IDLE_MINUTES - 1))).not.toBeNull();
    expect(parseSeal(cookie, ADMIN, NOW + minutes(IDLE_MINUTES))).toBeNull();
    expect(parseSeal(cookie, ADMIN, NOW + minutes(IDLE_MINUTES + 1))).toBeNull();
  });

  it('cannot be renewed past the absolute limit, however busy the session is', () => {
    let seal = newSeal(ADMIN, NOW);
    // Renew every ten minutes for half a day.
    for (let t = minutes(10); t < hours(MAX_HOURS + 2); t += minutes(10)) {
      const at = NOW + t;
      const read = parseSeal(serializeSeal(seal), ADMIN, at);
      if (!read) {
        expect(t).toBeGreaterThanOrEqual(hours(MAX_HOURS));
        return;
      }
      seal = renewSeal(read, at);
      expect(seal.exp).toBeLessThanOrEqual(seal.iat + hours(MAX_HOURS));
    }
    throw new Error('the seal never lapsed');
  });

  it('refuses a tampered payload, a tampered signature and junk', () => {
    const cookie = serializeSeal(newSeal(ADMIN, NOW));
    const [body, signature] = cookie.split('.');

    // Someone else's id, signed with the original signature.
    const forged = Buffer.from(JSON.stringify({ sub: OTHER, iat: NOW, exp: NOW + minutes(30), jti: 'x' }))
      .toString('base64url');
    expect(parseSeal(`${forged}.${signature}`, OTHER, NOW)).toBeNull();

    // A longer window, signed with the original signature.
    const extended = Buffer.from(JSON.stringify({ sub: ADMIN, iat: NOW, exp: NOW + hours(48), jti: 'x' }))
      .toString('base64url');
    expect(parseSeal(`${extended}.${signature}`, ADMIN, NOW)).toBeNull();

    expect(parseSeal(`${body}.${'a'.repeat(signature.length)}`, ADMIN, NOW)).toBeNull();
    expect(parseSeal(`${body}.`, ADMIN, NOW)).toBeNull();
    expect(parseSeal(body, ADMIN, NOW)).toBeNull();
    expect(parseSeal('not-a-cookie', ADMIN, NOW)).toBeNull();
    expect(parseSeal('', ADMIN, NOW)).toBeNull();
    expect(parseSeal(undefined, ADMIN, NOW)).toBeNull();
    expect(parseSeal('.', ADMIN, NOW)).toBeNull();
  });

  it('refuses a seal that claims to have been issued in the future', () => {
    const cookie = serializeSeal(newSeal(ADMIN, NOW + hours(2)));
    expect(parseSeal(cookie, ADMIN, NOW)).toBeNull();
  });

  it('refuses a payload that is signed but not a seal', async () => {
    const { createHmac } = await import('node:crypto');
    const body = Buffer.from(JSON.stringify({ hello: 'world' })).toString('base64url');
    const signature = createHmac('sha256', process.env.ADMIN_SESSION_SECRET!).update(body).digest('base64url');
    expect(parseSeal(`${body}.${signature}`, ADMIN, NOW)).toBeNull();
  });

  it('reports how much of the window is left, never past the absolute limit', () => {
    const seal = newSeal(ADMIN, NOW);
    expect(sealRemainingMs(seal, NOW)).toBe(minutes(IDLE_MINUTES));
    expect(sealRemainingMs(seal, NOW + minutes(10))).toBe(minutes(IDLE_MINUTES - 10));
    expect(sealRemainingMs(seal, NOW + minutes(IDLE_MINUTES + 5))).toBe(0);
    const old = { ...newSeal(ADMIN, NOW - hours(MAX_HOURS)), exp: NOW + minutes(30) };
    expect(sealRemainingMs(old, NOW)).toBe(0);
  });

  it('renews only once some of the window has been used', () => {
    const seal = newSeal(ADMIN, NOW);
    expect(shouldRenew(seal, NOW)).toBe(false);
    expect(shouldRenew(seal, NOW + minutes(4))).toBe(false);
    expect(shouldRenew(seal, NOW + minutes(6))).toBe(true);
  });

  it('stops renewing once the absolute limit has passed', () => {
    const seal = newSeal(ADMIN, NOW);
    expect(shouldRenew(seal, NOW + hours(MAX_HOURS) + minutes(1))).toBe(false);
  });

  it('gives every unseal a different cookie, even in the same millisecond', () => {
    expect(serializeSeal(newSeal(ADMIN, NOW))).not.toBe(serializeSeal(newSeal(ADMIN, NOW)));
  });
});
