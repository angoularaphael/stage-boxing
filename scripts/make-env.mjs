/**
 * Genere .env local depuis BOXPLUS/.env (sans echo des secrets).
 * Usage: node scripts/make-env.mjs
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const boxplusEnv = path.join(root, '..', 'BOXPLUS', '.env');
const outFile = path.join(root, '.env');

function parseEnv(text) {
  const map = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map[key] = value;
  }
  return map;
}

function pick(src, key, fallback = '') {
  return src[key] != null && src[key] !== '' ? src[key] : fallback;
}

if (!existsSync(boxplusEnv)) {
  console.error('BOXPLUS/.env introuvable');
  process.exit(1);
}

const src = parseEnv(readFileSync(boxplusEnv, 'utf8'));
const admin = randomBytes(24).toString('hex');
const cron = randomBytes(24).toString('hex');

const lines = [
  '# Genere depuis BOXPLUS/.env — ne pas committer',
  'PUBLIC_URL=https://stages.boxingcenter.fr',
  'SITE_NAME=Stages enfants Boxing Center',
  '',
  'PRICE_GUEST_CENTS=14000',
  'PRICE_MEMBER_CENTS=8000',
  'STOCK_PORTET=40',
  'STOCK_MINIMES=40',
  '',
  `ADMIN_TOKEN=${admin}`,
  `CRON_SECRET=${cron}`,
  '',
  'NOTIFY_EMAIL=boxingcenter31@gmail.com',
  `RESEND_API_KEY=${pick(src, 'RESEND_API_KEY')}`,
  `BREVO_API_KEY=${pick(src, 'BREVO_API_KEY')}`,
  'MAIL_FROM=Boxing Center Stages <stages@boxingcenter.fr>',
  '',
  `SUPABASE_URL=${pick(src, 'SUPABASE_URL')}`,
  `SUPABASE_SERVICE_ROLE_KEY=${pick(src, 'SUPABASE_SERVICE_ROLE_KEY')}`,
  '',
  `PAYPLUG_SECRET_KEY=${pick(src, 'PAYPLUG_SECRET_KEY')}`,
  `PAYPLUG_TEST_SECRET_KEY=${pick(src, 'PAYPLUG_TEST_SECRET_KEY')}`,
  'PAYPLUG_API_VERSION=2019-08-06',
  'PAYPLUG_SCALAPAY_ENABLED=1',
  '',
  `PAYPAL_CLIENT_ID=${pick(src, 'PAYPAL_CLIENT_ID')}`,
  `PAYPAL_CLIENT_SECRET=${pick(src, 'PAYPAL_CLIENT_SECRET')}`,
  `PAYPAL_MODE=${pick(src, 'PAYPAL_MODE', 'live')}`,
  `PAYPAL_WEBHOOK_ID=${pick(src, 'PAYPAL_WEBHOOK_ID')}`,
  '',
  `PAYPAL_PORTET_CLIENT_ID=${pick(src, 'PAYPAL_PORTET_CLIENT_ID')}`,
  `PAYPAL_PORTET_CLIENT_SECRET=${pick(src, 'PAYPAL_PORTET_CLIENT_SECRET')}`,
  `PAYPAL_TEST_CLIENT_ID=${pick(src, 'PAYPAL_TEST_CLIENT_ID')}`,
  `PAYPAL_TEST_CLIENT_SECRET=${pick(src, 'PAYPAL_TEST_CLIENT_SECRET')}`,
  `PAYPAL_TEST_PORTET_CLIENT_ID=${pick(src, 'PAYPAL_TEST_PORTET_CLIENT_ID')}`,
  `PAYPAL_TEST_PORTET_CLIENT_SECRET=${pick(src, 'PAYPAL_TEST_PORTET_CLIENT_SECRET')}`,
  '',
  `CAWL_MERCHANT_ID=${pick(src, 'CAWL_MERCHANT_ID')}`,
  `CAWL_API_KEY_ID=${pick(src, 'CAWL_API_KEY_ID')}`,
  `CAWL_API_SECRET=${pick(src, 'CAWL_API_SECRET')}`,
  `CAWL_MODE=${pick(src, 'CAWL_MODE', 'live')}`,
  `CAWL_TEST_MERCHANT_ID=${pick(src, 'CAWL_TEST_MERCHANT_ID')}`,
  `CAWL_TEST_API_KEY_ID=${pick(src, 'CAWL_TEST_API_KEY_ID')}`,
  `CAWL_TEST_API_SECRET=${pick(src, 'CAWL_TEST_API_SECRET')}`,
  '',
];

writeFileSync(outFile, lines.join('\n'), 'utf8');
console.log('.env ecrit (cles masquees). Cles non vides:', Object.keys(src).filter((k) => lines.some((l) => l.startsWith(k + '=') && !l.endsWith('='))).length);
