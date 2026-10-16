/**
 * Upload membres Deciplus + démarre la campagne sur prem-eu2:20405 (sim2).
 *
 *   node scripts/launch-stage-adherents-eu2.mjs
 *   node scripts/launch-stage-adherents-eu2.mjs --status
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const coachRoot = path.join(root, '..');
const csvPath = path.join(coachRoot, 'membres (20).csv');
const xlsPath = path.join(coachRoot, 'membres (15).xls');

const BOT_URL = process.env.STAGE_MAIL_BOT_URL || 'http://prem-eu2.bot-hosting.net:20405';
const SECRET =
  process.env.SITE_API_SECRET ||
  (() => {
    try {
      const env = readFileSync(path.join(coachRoot, 'gestion-manager', '.env'), 'utf8');
      const m = env.match(/^SITE_API_SECRET=(.+)$/m);
      return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
    } catch {
      return '';
    }
  })();

const STATUS_ONLY = process.argv.includes('--status');

function request(method, pathname, body, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    const url = new URL(BOT_URL + pathname);
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method,
        timeout: timeoutMs,
        headers: {
          Accept: 'application/json',
          'x-api-secret': SECRET,
          ...(payload
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            : {}),
        },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          let json = {};
          try {
            json = d ? JSON.parse(d) : {};
          } catch {
            json = { raw: d.slice(0, 400) };
          }
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

if (!SECRET) {
  console.error('SITE_API_SECRET manquant');
  process.exit(1);
}

if (STATUS_ONLY) {
  const st = await request('GET', '/api/campaign/stage-adherents-email');
  console.log(JSON.stringify(st, null, 2));
  process.exit(0);
}

if (!existsSync(csvPath) || !existsSync(xlsPath)) {
  console.error('Fichiers introuvables:', csvPath, xlsPath);
  process.exit(1);
}

console.log('git-sync boxing-center-bot…');
const sync = await request('POST', '/api/git-sync', { restart: true });
console.log('git-sync', sync.status, sync.json.out || sync.json.error || sync.json);

console.log('Upload CSV/XLS…');
const csv_b64 = readFileSync(csvPath).toString('base64');
const xls_b64 = readFileSync(xlsPath).toString('base64');
const up = await request('POST', '/api/campaign/stage-adherents-email/upload', {
  csv_b64,
  xls_b64,
});
console.log('upload', up.status, up.json);

if (up.status !== 200 || !up.json.ok) {
  process.exit(1);
}

await new Promise((r) => setTimeout(r, 12000));

console.log('Demarrage campagne (now, fin 17:30 Paris)…');
const start = await request('POST', '/api/campaign/stage-adherents-email', {
  now: true,
  end: '17:30',
  force: true,
});
console.log('start', start.status, start.json);
