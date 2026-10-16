#!/usr/bin/env node
/**
 * prem-eu2.bot-hosting.net:20405 — envoi mail adhérents stage (14h40–17h30 Paris).
 *
 * Fichiers sur le serveur (/home/container) :
 *   index.js (ce fichier)
 *   .env (BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_REPLY_TO, MEMBRES_DATA_DIR)
 *   data/membres (20).csv + data/membres (15).xls
 *
 * Startup panel : node index.js
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const REPO = process.env.STAGE_MAIL_REPO || 'https://github.com/angoularaphael/stage-boxing.git';
const BRANCH = process.env.STAGE_MAIL_BRANCH || 'main';
const APP = path.join(ROOT, 'stage-boxeur-app');

function log(m) {
  console.log(`[stage-mail eu2] ${m}`);
}

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] == null || process.env[k] === '') process.env[k] = v;
  }
}

loadEnv(path.join(ROOT, '.env'));

const dataDir = process.env.MEMBRES_DATA_DIR || path.join(ROOT, 'data');
fs.mkdirSync(dataDir, { recursive: true });

function ensureRepo() {
  if (!fs.existsSync(path.join(APP, 'scripts', 'send-mail-adherents-campaign.mjs'))) {
    log(`Clone ${REPO}...`);
    const { execSync } = require('child_process');
    if (fs.existsSync(APP)) fs.rmSync(APP, { recursive: true, force: true });
    execSync(
      `git clone --depth 1 --single-branch --branch ${BRANCH} "${REPO}" "${APP}"`,
      { stdio: 'inherit', shell: true }
    );
  }
}

ensureRepo();

const start = process.env.CAMPAIGN_START || '14:40';
const end = process.env.CAMPAIGN_END || '17:30';
const dataRoot = path.dirname(dataDir);

const child = spawn(
  process.execPath,
  [
    path.join(APP, 'scripts', 'send-mail-adherents-campaign.mjs'),
    '--run',
    `--start=${start}`,
    `--end=${end}`,
    `--data-root=${dataRoot}`,
  ],
  {
    cwd: APP,
    stdio: 'inherit',
    env: { ...process.env, BREVO_SENDER_NAME: 'David — Boxing Center' },
  }
);

child.on('exit', (code) => {
  log(`Campaign exit ${code}`);
  process.exit(code == null ? 1 : code);
});
