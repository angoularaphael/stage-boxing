/**
 * Envoi adhérents stage — transactionnel Brevo, rythme pour finir avant deadline.
 *
 * Usage:
 *   node scripts/send-mail-adherents-campaign.mjs --test
 *   node scripts/send-mail-adherents-campaign.mjs --run --start 15:30 --end 17:30
 *   node scripts/send-mail-adherents-campaign.mjs --run --now
 */
import { mkdirSync, appendFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const logDir = path.join(root, 'data', 'campaign-logs');
const stateFile = path.join(logDir, 'adherents-stage-2026-10-16.json');

import '../lib/load-env.js';
process.env.BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'David de Boxing Center';
if (!process.env.BREVO_REPLY_TO) {
  process.env.BREVO_REPLY_TO = 'boxingcentertls@gmail.com';
}

const {
  adherentsMailPayload,
  loadAdherentRecipientEmails,
} = await import('../lib/mail-adherents-stage.js');
const { sendMail } = await import('../lib/mail.js');

function parseArgs(argv) {
  const o = { test: false, run: false, now: false, start: '15:30', end: '17:30', dataRoot: '' };
  for (const a of argv) {
    if (a === '--test') o.test = true;
    if (a === '--run') o.run = true;
    if (a === '--now') o.now = true;
    if (a.startsWith('--start=')) o.start = a.slice(8);
    if (a.startsWith('--end=')) o.end = a.slice(6);
    if (a.startsWith('--data-root=')) o.dataRoot = a.slice(12);
  }
  return o;
}

function parisParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return parts;
}

function parisMinutesNow() {
  const p = parisParts(new Date());
  return Number(p.hour) * 60 + Number(p.minute);
}

function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

async function waitUntilParis(hhmm) {
  const target = hhmmToMinutes(hhmm);
  while (parisMinutesNow() < target) {
    const now = parisMinutesNow();
    const diffMin = target - now;
    const wait = Math.min(diffMin * 60_000, 30_000);
    logLine(`Attente ${hhmm} Paris (${diffMin} min restantes)`);
    await sleep(Math.max(wait, 1000));
  }
}

function pastParisDeadline(hhmm) {
  return parisMinutesNow() >= hhmmToMinutes(hhmm);
}

function minutesUntilParisDeadline(hhmm) {
  return hhmmToMinutes(hhmm) - parisMinutesNow();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function logLine(msg) {
  mkdirSync(logDir, { recursive: true });
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  appendFileSync(path.join(logDir, 'adherents-send.log'), line);
}

function loadState() {
  if (!existsSync(stateFile)) return { sent: {} };
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    return { sent: {} };
  }
}

function saveState(state) {
  mkdirSync(logDir, { recursive: true });
  writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
}

const args = parseArgs(process.argv.slice(2));
const mailPayload = adherentsMailPayload();

if (args.test) {
  for (const to of ['boxingcenter31@gmail.com', 'boxingcentertls@gmail.com']) {
    const r = await sendMail({ to, subject: mailPayload.subject, ...mailPayload });
    console.log(to, JSON.stringify(r));
  }
  process.exit(0);
}

if (!args.run) {
  console.error('Indiquez --test ou --run');
  process.exit(1);
}

const { emails, total, paths } = loadAdherentRecipientEmails({
  dataRoot: args.dataRoot || path.join(root, '..'),
});
logLine(`Destinataires uniques: ${total} (csv=${paths.csv} xls=${paths.xls})`);

if (!args.now) {
  await waitUntilParis(args.start);
}

const state = loadState();
const pending = emails.filter((e) => !state.sent[e]);
const minsLeft = Math.max(1, minutesUntilParisDeadline(args.end));
const budgetMs = minsLeft * 60_000;
const minDelay = Math.max(4500, Number(process.env.ADHERENTS_MAIL_MIN_DELAY_MS) || 5500);
const delayMs = pending.length
  ? Math.min(14_000, Math.max(minDelay, Math.floor(budgetMs / pending.length)))
  : 0;

logLine(`A envoyer: ${pending.length}, delai ${delayMs}ms, fin cible ${args.end} Paris`);

let ok = 0;
let fail = 0;
for (let i = 0; i < pending.length; i++) {
  const to = pending[i];
  if (pastParisDeadline(args.end)) {
    logLine(`Deadline ${args.end} atteinte — arret (${pending.length - i} restants)`);
    break;
  }
  const r = await sendMail({ to, subject: mailPayload.subject, ...mailPayload });
  if (r.sent) {
    state.sent[to] = { at: new Date().toISOString(), id: r.id || '' };
    ok++;
  } else {
    state.sent[to] = { at: new Date().toISOString(), error: r.error || r.reason || 'fail' };
    fail++;
    logLine(`ECHEC ${to} ${JSON.stringify(r)}`);
  }
  if ((i + 1) % 25 === 0) {
    saveState(state);
    logLine(`Progression ${i + 1}/${pending.length} ok=${ok} fail=${fail}`);
  }
  if (i < pending.length - 1) await sleep(delayMs);
}

saveState(state);
logLine(`Termine ok=${ok} fail=${fail} total_sent=${Object.keys(state.sent).length}`);
