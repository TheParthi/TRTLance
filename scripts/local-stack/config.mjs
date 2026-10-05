import { homedir } from 'node:os';
import { join } from 'node:path';

// Well-known Supabase local-development secrets (public; local use only).
export const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
export const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
export const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export const DB_NAME = process.env.LOCAL_DB_NAME ?? 'trustlance_dev';
export const DB_URL = `postgres://localhost:5432/${DB_NAME}`;
export const AUTH_DB_URL = `postgres://supabase_auth_admin:auth@localhost:5432/${DB_NAME}?sslmode=disable`;
export const STACK_DIR = process.env.TRUSTLANCE_LOCALSTACK ?? join(homedir(), '.trustlance-localstack');
export const PORTS = { gateway: 54321, auth: 9999, rest: 54329 };
export const SITE_URL = 'http://localhost:9002';
