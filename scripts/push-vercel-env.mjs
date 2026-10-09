/**
 * Injecte les cles du .env local dans Vercel (Production) sans les afficher.
 * Usage: node scripts/push-vercel-env.mjs
 */
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');

if (!existsSync(envFile)) {
  console.error('.env manquant');
  process.exit(1);
}

const keys = [];
for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq < 1) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1);
  if (!value) continue;
  keys.push({ key, value });
}

console.log(`Injection de ${keys.length} variables vers Vercel (production)...`);

for (const { key, value } of keys) {
  const tmp = path.join(tmpdir(), `stg-env-${randomBytes(6).toString('hex')}.txt`);
  writeFileSync(tmp, value, 'utf8');
  // Remove existing silently then add
  spawnSync('npx', ['vercel', 'env', 'rm', key, 'production', '-y'], {
    cwd: root,
    stdio: 'ignore',
    shell: true,
  });
  const r = spawnSync(
    'npx',
    ['vercel', 'env', 'add', key, 'production'],
    {
      cwd: root,
      input: value + '\n',
      encoding: 'utf8',
      shell: true,
    }
  );
  try {
    unlinkSync(tmp);
  } catch {
    /* ignore */
  }
  if (r.status !== 0) {
    console.error(`Echec ${key}: ${(r.stderr || r.stdout || '').slice(0, 200)}`);
  } else {
    console.log(`OK ${key}`);
  }
}

console.log('Termine.');
