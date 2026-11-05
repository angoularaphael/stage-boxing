/**
 * Boxing Trophy 19 — mails licence / sans adversaire.
 * AUCUN envoi sans flag explicite.
 *
 *   node scripts/send-trophy19-licence-campaign.mjs --preview combat
 *   node scripts/send-trophy19-licence-campaign.mjs --preview attente
 *   node scripts/send-trophy19-licence-campaign.mjs --test combat
 *   node scripts/send-trophy19-licence-campaign.mjs --test attente
 *   node scripts/send-trophy19-licence-campaign.mjs --run combat    (apres OK Raphael)
 *   node scripts/send-trophy19-licence-campaign.mjs --run attente   (apres OK Raphael)
 */
import { mkdirSync, appendFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const logDir = path.join(root, 'data', 'campaign-logs');

import '../lib/load-env.js';
process.env.BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Boxing Center Portet';
process.env.BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'suzinabot@gmail.com';
process.env.BREVO_REPLY_TO_PORTET =
  process.env.BREVO_REPLY_TO_PORTET || 'vgsportmanagement@gmail.com';
delete process.env.RESEND_API_KEY;

const {
  TROPHY19_CAMPAIGN_COMBAT,
  TROPHY19_CAMPAIGN_ATTENTE,
  TROPHY19_SUBJECT_COMBAT,
  TROPHY19_SUBJECT_ATTENTE,
  TROPHY19_LICENCE_URL,
  trophy19CombatBrevoOpts,
  trophy19AttenteBrevoOpts,
  trophy19CombatMailText,
  trophy19AttenteMailText,
  trophy19ReplyEmail,
  loadTrophy19CombatRecipients,
  loadTrophy19AttenteRecipients,
} = await import('../lib/mail-trophy19-licence.js');
const { sendMailBrevo } = await import('../lib/mail.js');

const DELAY_MS = Math.max(1500, parseInt(process.env.TROPHY19_MAIL_DELAY_MS || '2200', 10) || 2200);
const TEST_TO = process.env.TROPHY19_TEST_TO || 'vgsportmanagement@gmail.com';

function parseArgs(argv) {
  const o = { preview: false, test: false, run: false, cohort: null };
  for (const a of argv) {
    if (a === '--preview') o.preview = true;
    if (a === '--test') o.test = true;
    if (a === '--run') o.run = true;
    if (a === 'combat' || a === 'attente') o.cohort = a;
  }
  return o;
}

function logLine(msg) {
  mkdirSync(logDir, { recursive: true });
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  appendFileSync(path.join(logDir, 'trophy19-licence-send.log'), line);
}

function statePath(cohort) {
  return path.join(logDir, `trophy19-${cohort}-sent.json`);
}

function loadState(cohort) {
  const p = statePath(cohort);
  if (!existsSync(p)) return { sent: {} };
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return { sent: {} };
  }
}

function saveState(cohort, state) {
  mkdirSync(logDir, { recursive: true });
  writeFileSync(statePath(cohort), JSON.stringify(state, null, 2), 'utf8');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cohortConfig(cohort) {
  if (cohort === 'combat') {
    return {
      campaign: TROPHY19_CAMPAIGN_COMBAT,
      subject: TROPHY19_SUBJECT_COMBAT,
      recipients: loadTrophy19CombatRecipients(),
      opts: trophy19CombatBrevoOpts,
      body: trophy19CombatMailText,
    };
  }
  if (cohort === 'attente') {
    return {
      campaign: TROPHY19_CAMPAIGN_ATTENTE,
      subject: TROPHY19_SUBJECT_ATTENTE,
      recipients: loadTrophy19AttenteRecipients(),
      opts: trophy19AttenteBrevoOpts,
      body: trophy19AttenteMailText,
    };
  }
  throw new Error('Cohorte requise: combat | attente');
}

const args = parseArgs(process.argv.slice(2));
if (!args.cohort) {
  console.log(
    JSON.stringify(
      {
        usage: '--preview|--test|--run  combat|attente',
        note: 'Aucun envoi sans --test ou --run explicite, et accord Raphael.',
      },
      null,
      2
    )
  );
  process.exit(1);
}

const cfg = cohortConfig(args.cohort);

if (args.preview || (!args.test && !args.run)) {
  const sample = cfg.recipients[0];
  const prenom = sample?.prenom || 'Test';
  console.log(
    JSON.stringify(
      {
        campaign: cfg.campaign,
        cohort: args.cohort,
        destinataires: cfg.recipients.length,
        avec_email: cfg.recipients.filter((r) => r.email).length,
        expediteur: `Boxing Center Portet <suzinabot@gmail.com>`,
        reply_to: trophy19ReplyEmail(),
        objet: cfg.subject,
        lien_licence: args.cohort === 'combat' ? TROPHY19_LICENCE_URL : null,
        exemple_prenom: prenom,
        corps: cfg.body(prenom),
        note: 'Aucun envoi. Pour un essai vers Reply-To Portet: --test. Pour la campagne: --run apres validation Raphael.',
      },
      null,
      2
    )
  );
  process.exit(0);
}

if (args.test) {
  const opts = cfg.opts('Test');
  const r = await sendMailBrevo({
    to: TEST_TO,
    subject: `[TEST] ${cfg.subject}`,
    ...opts,
  });
  logLine(`TEST ${args.cohort} ${TEST_TO} ${JSON.stringify(r)}`);
  process.exit(r.sent ? 0 : 1);
}

if (!args.run) {
  console.log('Usage: --preview | --test | --run  combat|attente');
  process.exit(1);
}

const state = loadState(args.cohort);
let sent = 0;
let failed = 0;
let skipped = 0;

for (const row of cfg.recipients) {
  const email = String(row.email || '')
    .trim()
    .toLowerCase();
  if (!email) {
    skipped++;
    continue;
  }
  if (state.sent[email]) {
    skipped++;
    continue;
  }
  const opts = cfg.opts(row.prenom);
  const r = await sendMailBrevo({
    to: email,
    subject: cfg.subject,
    ...opts,
  });
  if (r.sent) {
    state.sent[email] = {
      at: new Date().toISOString(),
      prenom: row.prenom,
      csv_name: row.csv_name,
      id: r.id || null,
    };
    saveState(args.cohort, state);
    sent++;
    logLine(`OK ${args.cohort} ${email}`);
  } else {
    failed++;
    logLine(`FAIL ${args.cohort} ${email} ${JSON.stringify(r)}`);
  }
  await sleep(DELAY_MS);
}

logLine(
  `DONE ${args.cohort} sent=${sent} failed=${failed} skipped=${skipped} total=${cfg.recipients.length}`
);
process.exit(failed ? 1 : 0);
