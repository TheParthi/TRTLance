/**
 * Serving the console on its own origin.
 *
 * One deployment, two front doors. With NEXT_PUBLIC_ADMIN_URL set, requests arriving on the admin
 * origin may only reach the console, and requests for the console on the public origin are sent
 * across — so each address has exactly one job and neither can be used to wander into the other.
 * Locally that is two ports (9002 and 9001); in production it is two hostnames.
 *
 * Leave NEXT_PUBLIC_ADMIN_URL unset and everything stays on one origin, with /admin as a path.
 *
 * In production, separate hostnames also mean separate cookie scopes, so a cross-site scripting bug
 * anywhere on the public site cannot read the console's seal. Note that this is NOT true of two
 * ports on localhost: cookies ignore the port, so the two dev origins share a cookie jar. The split
 * is real in production and a convenience in development.
 */

/** Paths that must work on the admin origin: the console, and the sign-in flow that leads to it. */
const ADMIN_ALLOWED = ['/admin', '/login', '/signup', '/auth', '/forgot-password', '/reset-password', '/onboarding'];

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

export function adminHost() {
  return hostOf(process.env.NEXT_PUBLIC_ADMIN_URL ?? '');
}

export function siteHost() {
  return hostOf(process.env.NEXT_PUBLIC_SITE_URL ?? '');
}

/** True when the console has an origin of its own and it is not the public one. */
export function originsAreSplit() {
  const admin = adminHost();
  return Boolean(admin && admin !== siteHost());
}

const isUnder = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/**
 * Where a request should go, given the origin it arrived on.
 *
 * Returns the origin to send it to, or null to serve it here. Pure, so the rules can be tested
 * without a server; the middleware supplies the hosts and builds the redirect.
 */
export function crossOriginTarget(
  { host, pathname }: { host: string; pathname: string },
  origins: { site: string; admin: string },
): string | null {
  if (!origins.admin || origins.admin === origins.site) return null;

  const onAdmin = host === hostOf(origins.admin);
  const onSite = host === hostOf(origins.site);

  if (onAdmin) {
    // The admin origin serves the console and the sign-in flow that reaches it, nothing else.
    return ADMIN_ALLOWED.some((prefix) => isUnder(pathname, prefix)) ? null : origins.site;
  }
  if (onSite && isUnder(pathname, '/admin')) return origins.admin;

  // An origin we do not recognise (a preview URL, an IP, a proxy): leave it alone rather than
  // bouncing it somewhere it may not be able to come back from.
  return null;
}

/** Whether this request arrived on the console's own origin. */
export function isAdminOrigin(host: string, origins: { site: string; admin: string }) {
  const admin = hostOf(origins.admin);
  return Boolean(admin && admin !== hostOf(origins.site) && host === admin);
}

/** The admin origin's landing page: there is no marketing site there to show. */
export function adminOriginHome(pathname: string) {
  return pathname === '/' ? '/admin' : pathname;
}
