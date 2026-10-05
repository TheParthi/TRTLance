import type { NextConfig } from 'next';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseWs = supabase.replace(/^http/, 'ws');
const rpc = process.env.NEXT_PUBLIC_RPC_URL ?? '';
const dev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabaseWs} ${rpc}${dev ? ' ws://localhost:* http://127.0.0.1:*' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
]
  .join('; ')
  .replace(/\s+/g, ' ');

// Routes from the v1 prototype that moved. Everything else that was removed returns 404.
const legacyRedirects: [string, string][] = [
  ['/find-jobs', '/work'],
  ['/dashboard/jobs', '/work'],
  ['/job/:id', '/projects/:id'],
  ['/project/:id/bids', '/projects/:id/proposals'],
  ['/post-project', '/projects/new'],
  ['/my-projects', '/projects'],
  ['/my-applications', '/projects?view=proposals'],
  ['/inbox', '/messages'],
  ['/resolution-gigs', '/arbitration'],
  ['/resolution-gigs/room/:id', '/arbitration/cases/:id'],
  ['/profile/wallet', '/wallet'],
  ['/profile/edit', '/settings'],
  ['/edit-profile', '/settings'],
  ['/profile', '/settings'],
  ['/profile/:username', '/u/:username'],
  ['/admin/disputes', '/admin'],
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(dev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
        ],
      },
    ];
  },
  async redirects() {
    return legacyRedirects.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
};

export default nextConfig;
