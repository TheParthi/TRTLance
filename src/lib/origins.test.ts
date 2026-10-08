import { describe, expect, it } from 'vitest';
import { adminOriginHome, crossOriginTarget, isAdminOrigin } from './origins';

const ORIGINS = { site: 'http://localhost:9002', admin: 'http://localhost:9001' };
const SITE = 'localhost:9002';
const ADMIN = 'localhost:9001';

const target = (host: string, pathname: string, origins = ORIGINS) =>
  crossOriginTarget({ host, pathname }, origins);

describe('which origin serves what', () => {
  it('keeps the console on the admin origin', () => {
    for (const path of ['/admin', '/admin/members', '/admin/members/abc', '/admin/gate']) {
      expect(target(ADMIN, path)).toBeNull();
    }
  });

  it('sends the console to the admin origin when asked for on the public one', () => {
    expect(target(SITE, '/admin')).toBe(ORIGINS.admin);
    expect(target(SITE, '/admin/money')).toBe(ORIGINS.admin);
  });

  it('sends everything else off the admin origin', () => {
    for (const path of ['/', '/dashboard', '/work', '/projects/abc', '/wallet', '/u/someone']) {
      expect(target(ADMIN, path)).toBe(ORIGINS.site);
    }
  });

  it('keeps the public site on the public origin', () => {
    for (const path of ['/', '/dashboard', '/work', '/login']) {
      expect(target(SITE, path)).toBeNull();
    }
  });

  it('lets the sign-in flow run on the admin origin, so unsealing can finish there', () => {
    for (const path of ['/login', '/signup', '/auth/callback', '/auth/confirm', '/onboarding',
      '/forgot-password', '/reset-password']) {
      expect(target(ADMIN, path)).toBeNull();
    }
  });

  it('does not mistake a lookalike path for the console', () => {
    expect(target(SITE, '/administration')).toBeNull();
    expect(target(SITE, '/admins')).toBeNull();
    expect(target(ADMIN, '/administration')).toBe(ORIGINS.site);
  });

  it('serves everything from one origin when the console has no origin of its own', () => {
    const single = { site: 'http://localhost:9002', admin: '' };
    expect(target(SITE, '/admin', single)).toBeNull();
    expect(target(SITE, '/dashboard', single)).toBeNull();
  });

  it('does nothing when both names point at the same place', () => {
    const same = { site: 'https://trustlance.com', admin: 'https://trustlance.com' };
    expect(target('trustlance.com', '/admin', same)).toBeNull();
    expect(target('trustlance.com', '/dashboard', same)).toBeNull();
  });

  it('leaves an origin it does not recognise alone', () => {
    // A preview deployment or a health check by IP should not be bounced somewhere it cannot return from.
    expect(target('127.0.0.1:9002', '/admin')).toBeNull();
    expect(target('preview-123.vercel.app', '/dashboard')).toBeNull();
  });

  it('works with real hostnames, not just ports', () => {
    const prod = { site: 'https://trustlance.com', admin: 'https://admin.trustlance.com' };
    expect(target('admin.trustlance.com', '/admin/money', prod)).toBeNull();
    expect(target('admin.trustlance.com', '/dashboard', prod)).toBe(prod.site);
    expect(target('trustlance.com', '/admin', prod)).toBe(prod.admin);
    expect(target('trustlance.com', '/work', prod)).toBeNull();
  });

  it('recognises the console\u2019s own origin', () => {
    expect(isAdminOrigin(ADMIN, ORIGINS)).toBe(true);
    expect(isAdminOrigin(SITE, ORIGINS)).toBe(false);
    // Not split: there is no separate admin origin to be on.
    expect(isAdminOrigin(SITE, { site: 'http://localhost:9002', admin: '' })).toBe(false);
    expect(isAdminOrigin('trustlance.com', { site: 'https://trustlance.com', admin: 'https://trustlance.com' })).toBe(false);
  });

  it('lands the admin origin on the console instead of a marketing page', () => {
    expect(adminOriginHome('/')).toBe('/admin');
    expect(adminOriginHome('/admin/members')).toBe('/admin/members');
  });
});
