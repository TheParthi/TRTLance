// Recreates the local dev database: roles, GoTrue's auth schema, a storage stand-in, then every migration.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { AUTH_DB_URL, DB_NAME, DB_URL, JWT_SECRET, STACK_DIR } from './config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const gotrue = join(STACK_DIR, 'gotrue');
if (!existsSync(gotrue)) throw new Error(`GoTrue binary not found at ${gotrue}. See scripts/local-stack/README.md`);

const admin = new pg.Client({ connectionString: 'postgres://localhost:5432/postgres' });
await admin.connect();
await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`, [DB_NAME]);
await admin.query(`drop database if exists "${DB_NAME}"`);
await admin.query(`create database "${DB_NAME}"`);
await admin.end();

const db = new pg.Client({ connectionString: DB_URL });
await db.connect();
await db.query('set client_min_messages = warning');
await db.query(`
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
    if not exists (select 1 from pg_roles where rolname = 'postgres') then create role postgres nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login noinherit password 'authenticator'; end if;
  end $$;
  grant anon, authenticated, service_role to authenticator;
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
      create role supabase_auth_admin login noinherit createrole password 'auth';
    end if;
  end $$;
  alter role supabase_auth_admin set search_path = auth;
  create schema if not exists auth authorization supabase_auth_admin;
  create schema if not exists extensions;
  create extension if not exists pgcrypto with schema extensions;
  grant usage on schema extensions to anon, authenticated, service_role;
`);

execFileSync(gotrue, ['migrate'], {
  cwd: join(STACK_DIR, 'auth'),
  env: { ...process.env, GOTRUE_DB_DRIVER: 'postgres', DATABASE_URL: AUTH_DB_URL, GOTRUE_JWT_SECRET: JWT_SECRET, API_EXTERNAL_URL: 'http://127.0.0.1:54321/auth/v1', GOTRUE_SITE_URL: 'http://localhost:9002', DB_NAMESPACE: 'auth' },
  stdio: 'inherit',
});

// GoTrue's helpers, made available to the API roles like on Supabase.
await db.query(`
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;
  grant select on auth.users to service_role;
`);

// Storage/realtime stand-ins and Supabase's default privileges, from the test shim (minus its auth part).
const shim = readFileSync(join(root, 'supabase/tests/shim.sql'), 'utf8');
const storagePart = shim.slice(shim.indexOf('create schema if not exists storage;'));
await db.query(storagePart);

for (const file of readdirSync(join(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).sort()) {
  try {
    await db.query(readFileSync(join(root, 'supabase/migrations', file), 'utf8'));
  } catch (error) {
    throw new Error(`${file}: ${error.message}`);
  }
}
await db.query(`notify pgrst, 'reload schema'`);
await db.end();
process.stdout.write(`Created ${DB_NAME} with auth, storage stand-in and all migrations.\n`);
