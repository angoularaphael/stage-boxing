/**
 * Applique supabase/001_stage_orders.sql via psql.
 * Requis: DATABASE_URL ou SUPABASE_DB_URL (postgres) dans .env
 * Usage: node scripts/apply-stage-orders.mjs
 */
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
const sqlFile = path.join(root, 'supabase', '001_stage_orders.sql');

function loadEnv() {
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL ||
  '';

if (!dbUrl) {
  console.error(
    'DATABASE_URL / SUPABASE_DB_URL manquant. Ajoute la connection string Postgres du projet Supabase, puis relance.'
  );
  process.exit(1);
}

if (!existsSync(sqlFile)) {
  console.error('SQL manquant:', sqlFile);
  process.exit(1);
}

const tmp = path.join(tmpdir(), `stage-orders-${randomBytes(4).toString('hex')}.sql`);
writeFileSync(tmp, readFileSync(sqlFile, 'utf8'), 'utf8');

const psql =
  process.env.PSQL_PATH ||
  (process.platform === 'win32'
    ? 'D:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe'
    : 'psql');

const result = spawnSync(psql, [dbUrl, '-v', 'ON_ERROR_STOP=1', '-f', tmp], {
  encoding: 'utf8',
  env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD || undefined },
});

try {
  unlinkSync(tmp);
} catch {
  /* ignore */
}

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) {
  console.error('psql exit', result.status);
  process.exit(result.status || 1);
}
console.log('OK: table public.stage_orders appliquee.');
