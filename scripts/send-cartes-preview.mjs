/**
 * Envoie les cartes boxeur regenerees.
 * Defaut : angoularaphael05@gmail.com seulement (validation).
 * --parents : parents + boxingcenter31 (apres validation Raphael).
 */
import '../lib/load-env.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listOrders } from '../lib/orders.js';
import { buildCartePng } from '../lib/carte-mail.js';
import { sendMail } from '../lib/mail.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'data', 'cartes-preview');
const toParents = process.argv.includes('--parents');
const PREVIEW_TO = 'angoularaphael05@gmail.com';
const CLUB_NOTIFY = 'boxingcenter31@gmail.com';

function slug(s) {
  return String(s || 'boxeur')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const orders = (await listOrders({ limit: 500 })).filter((o) => o.status === 'complete');
if (!orders.length) {
  console.error('aucune inscription complete');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const built = [];
for (const order of orders) {
  const png = await buildCartePng(order);
  if (!png?.content) {
    console.error('png fail', order.id);
    continue;
  }
  const name = `${order.club}-${slug(order.child?.first_name)}-${order.id.slice(-6)}.png`;
  writeFileSync(path.join(outDir, name), png.content);
  built.push({ order, png: { filename: name, content: png.content }, html: png.html });
}

if (!built.length) {
  console.error('aucune carte generee');
  process.exit(1);
}

const liste = built
  .map(
    (b) =>
      `${b.order.child?.first_name || ''} ${b.order.child?.last_name || ''} — ${b.order.club_label} — ${b.order.parent?.email}`
  )
  .join('\n');

if (!toParents) {
  const html = `
    <p>Raphael,</p>
    <p>Voici les <strong>cartes corrigees</strong> (sceau blanc et tampons retires de la photo, recadrage visage).</p>
    <p>Rien n'a encore ete envoye aux parents ni a boxingcenter31@gmail.com.</p>
    <p>Si c'est bon, reponds OK et je les envoie aux parents, avec copie boxingcenter31.</p>
    <pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${liste.replace(/</g, '')}</pre>
    ${built.map((b) => b.html).join('\n')}
    <p>Boxing Center Stages</p>`;
  const r = await sendMail({
    to: PREVIEW_TO,
    subject: `VALIDATION — nouvelles cartes boxeur (${built.length}) — ne pas envoyer aux parents`,
    html,
    attachments: built.map((b) => b.png),
    tags: ['stage-cartes-preview'],
  });
  console.log(JSON.stringify({ preview: true, to: PREVIEW_TO, n: built.length, sent: r.sent, id: r.id, error: r.error || null }));
  if (!r.sent) process.exit(1);
  process.exit(0);
}

let sent = 0;
let failed = 0;
for (const b of built) {
  const child = b.order.child || {};
  const parentTo = String(b.order.parent?.email || '').trim();
  if (!parentTo) {
    failed += 1;
    continue;
  }
  const html = `
    <p>Bonjour,</p>
    <p>Nous vous renvoyons la <strong>carte boxeur</strong> de <strong>${child.first_name || ''} ${child.last_name || ''}</strong>
    pour <strong>Les Vacances des Boxeurs</strong> (26-31 octobre 2026) a <strong>${b.order.club_label}</strong>.</p>
    <p>La version precedente recouvrait la photo : celle-ci est la bonne, a conserver (telephone ou impression).</p>
    ${b.html}
    <p>Contact : boxingcenter31@gmail.com</p>
    <p>A tres bientot.</p>
    <p>Boxing Center</p>`;
  const r = await sendMail({
    to: parentTo,
    subject: `Carte boxeur corrigee — ${child.first_name || 'votre enfant'} — Les Vacances des Boxeurs`,
    html,
    attachments: [b.png],
    cc: [CLUB_NOTIFY],
    tags: ['stage-cartes-parents'],
  });
  if (r.sent) sent += 1;
  else {
    failed += 1;
    console.error('fail', parentTo, r.error || r.reason);
  }
}
console.log(JSON.stringify({ parents: true, sent, failed, n: built.length }));
if (failed) process.exit(1);
