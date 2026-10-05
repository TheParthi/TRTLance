// Recreates the local test database from the Supabase shim and every migration, in order.
// Usage: node supabase/tests/reset-local.mjs   (TEST_DATABASE_URL overrides the default)
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const url = new URL(process.env.TEST_DATABASE_URL ?? 'postgres://localhost:5432/trustlance_test');
const dbName = url.pathname.slice(1);

export async function resetLocalDatabase() {
  const admin = new pg.Client({ connectionString: new URL('/postgres', url).toString() });
  await admin.connect();
  await admin.query(`select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()`, [dbName]);
  await admin.query(`drop database if exists "${dbName}"`);
  await admin.query(`create database "${dbName}"`);
  await admin.end();

  const db = new pg.Client({ connectionString: url.toString() });
  await db.connect();
  await db.query('set client_min_messages = error');
  await db.query(readFileSync(join(here, 'shim.sql'), 'utf8'));
  const dir = join(here, '..', 'migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      await db.query(readFileSync(join(dir, file), 'utf8'));
    } catch (error) {
      throw new Error(`${file}: ${error.message}`);
    }
  }
  await db.end();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  resetLocalDatabase().then(() => process.stdout.write(`Reset ${dbName}\n`)).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
