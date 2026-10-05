// Starts GoTrue, PostgREST and a tiny gateway that mimics Supabase's URL layout.
import { spawn } from 'node:child_process';
import http from 'node:http';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ANON_KEY, AUTH_DB_URL, DB_URL, JWT_SECRET, PORTS, SERVICE_KEY, SITE_URL, STACK_DIR } from './config.mjs';

const children = [];
const run = (name, cmd, args, opts) => {
  const child = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
  const log = (d) => process.stdout.write(`[${name}] ${d}`);
  child.stdout.on('data', log);
  child.stderr.on('data', log);
  child.on('exit', (code) => process.stdout.write(`[${name}] exited with ${code}\n`));
  children.push(child);
};

run('auth', join(STACK_DIR, 'gotrue'), ['serve'], {
  cwd: join(STACK_DIR, 'auth'),
  env: {
    ...process.env,
    GOTRUE_DB_DRIVER: 'postgres',
    DATABASE_URL: AUTH_DB_URL,
    GOTRUE_API_HOST: '127.0.0.1',
    PORT: String(PORTS.auth),
    API_EXTERNAL_URL: `http://127.0.0.1:${PORTS.gateway}/auth/v1`,
    GOTRUE_SITE_URL: SITE_URL,
    GOTRUE_URI_ALLOW_LIST: `${SITE_URL}/**`,
    GOTRUE_JWT_SECRET: JWT_SECRET,
    GOTRUE_JWT_EXP: '3600',
    GOTRUE_JWT_AUD: 'authenticated',
    GOTRUE_JWT_DEFAULT_GROUP_NAME: 'authenticated',
    GOTRUE_JWT_ADMIN_ROLES: 'service_role',
    GOTRUE_EXTERNAL_EMAIL_ENABLED: 'true',
    GOTRUE_MAILER_AUTOCONFIRM: 'true',
    GOTRUE_DISABLE_SIGNUP: 'false',
    DB_NAMESPACE: 'auth',
    GOTRUE_LOG_LEVEL: 'warn',
  },
});

const rest = join(STACK_DIR, 'postgrest.conf');
writeFileSync(rest, [
  `db-uri = "postgres://authenticator:authenticator@localhost:5432/${DB_URL.split('/').pop()}"`,
  'db-schemas = "public"',
  'db-anon-role = "anon"',
  `jwt-secret = "${JWT_SECRET}"`,
  `server-port = ${PORTS.rest}`,
  'server-host = "127.0.0.1"',
  'log-level = "warn"',
].join('\n'));
run('rest', 'postgrest', [rest], {});

const routes = [['/auth/v1', PORTS.auth], ['/rest/v1', PORTS.rest]];
http.createServer((req, res) => {
  const cors = {
    'access-control-allow-origin': req.headers.origin ?? '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, prefer, range, accept-profile, content-profile, x-supabase-api-version',
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'access-control-expose-headers': 'content-range, x-supabase-api-version',
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }
  const route = routes.find(([prefix]) => req.url.startsWith(prefix));
  if (!route) {
    res.writeHead(501, { ...cors, 'content-type': 'application/json' });
    return res.end(JSON.stringify({ message: 'Not available in the local stack (storage/realtime need Supabase).' }));
  }
  const headers = { ...req.headers };
  // Like Supabase's gateway: fall back to the apikey as the bearer token.
  if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;
  const upstream = http.request({ host: '127.0.0.1', port: route[1], method: req.method, path: req.url.slice(route[0].length) || '/', headers }, (up) => {
    res.writeHead(up.statusCode ?? 502, { ...up.headers, ...cors });
    up.pipe(res);
  });
  upstream.on('error', (e) => {
    res.writeHead(502, cors);
    res.end(String(e));
  });
  req.pipe(upstream);
}).listen(PORTS.gateway, '127.0.0.1', () => {
  process.stdout.write([
    '',
    `Local stack on http://127.0.0.1:${PORTS.gateway}. Put this in .env.local:`,
    `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${PORTS.gateway}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}`,
    `SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}`,
    '',
  ].join('\n'));
});

const stop = () => {
  children.forEach((c) => c.kill());
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
