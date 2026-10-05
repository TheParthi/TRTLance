import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseConfigured } from '@/lib/env';
import { updateSession } from '@/lib/supabase/middleware';

// Areas that always need a session. Pages re-check on the server as well.
const PROTECTED = ['/dashboard', '/contracts', '/messages', '/notifications', '/disputes', '/arbitration', '/wallet',
  '/settings', '/admin', '/onboarding', '/projects/new'];
const AUTH_PAGES = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.next();
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!user && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (user && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
};
