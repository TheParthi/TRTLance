import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { adminOriginHome, crossOriginTarget, isAdminOrigin } from '@/lib/origins';
import { updateSession } from '@/lib/supabase/middleware';

// Areas that always need a session. Pages re-check on the server as well.
const PROTECTED = ['/dashboard', '/contracts', '/messages', '/notifications', '/disputes', '/arbitration', '/wallet',
  '/settings', '/admin', '/onboarding', '/projects/new'];
const AUTH_PAGES = ['/login', '/signup'];

/**
 * Sends the browser to another origin.
 *
 * Built by hand rather than with NextResponse.redirect, which resolves the target against the origin
 * the server believes it is serving and collapses it to a relative path when they match. Behind a
 * proxy or a platform router that origin is not always the one the browser used, and a relative
 * Location would then send the browser back where it came from — a redirect loop. Naming the origin
 * outright costs nothing and cannot be misread.
 */
function toOrigin(origin: string, pathWithQuery: string) {
  return new NextResponse(null, { status: 307, headers: { location: new URL(pathWithQuery, origin).toString() } });
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get('host') ?? request.nextUrl.host;
  const origins = {
    site: process.env.NEXT_PUBLIC_SITE_URL ?? '',
    admin: process.env.NEXT_PUBLIC_ADMIN_URL ?? '',
  };
  const onAdminOrigin = isAdminOrigin(host, origins);

  // The console can be given an origin of its own (a port locally, a hostname in production). Each
  // address then serves only what belongs to it, so neither can be used to wander into the other.
  // See src/lib/origins.ts.

  // Opening the console's address with no path lands on the console, not on a marketing page.
  const landing = adminOriginHome(pathname);
  if (onAdminOrigin && landing !== pathname) {
    return NextResponse.redirect(new URL(`${landing}${search}`, request.url));
  }

  const elsewhere = crossOriginTarget({ host, pathname }, origins);
  if (elsewhere) return toOrigin(elsewhere, `${pathname}${search}`);

  if (!isSupabaseConfigured()) return NextResponse.next();
  const { response, user } = await updateSession(request);

  if (!user && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    // Signing in on the console's origin lands in the console: the dashboard lives on the other
    // origin and would only bounce straight back.
    url.pathname = onAdminOrigin ? '/admin' : '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
};
