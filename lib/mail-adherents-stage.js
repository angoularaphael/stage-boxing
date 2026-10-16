import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { stageLinkWithSrc } from './attribution.js';

const STAGE_SITE = stageLinkWithSrc('https://stage.boxingcenter.fr', 'mail');

export function adherentsReplyEmail() {
  return String(
    process.env.ADHERENTS_REPLY_TO ||
      process.env.BREVO_REPLY_TO ||
      process.env.STAGE_CONTACT ||
      'boxingcentertls@gmail.com'
  ).trim();
}

export const ADHERENTS_MAIL_SUBJECT =
  'Stage vacances octobre — Les Vacances des Boxeurs (adhérents)';

export function adherentsMailHtml() {
  return `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222222;max-width:36rem">
<p style="margin:0 0 1em 0">Bonjour,</p>
<p style="margin:0 0 1em 0">Je me permets de vous écrire car votre enfant est inscrit chez Boxing Center et nous organisons, pendant les vacances de la Toussaint, une semaine de stage spécialement dédiée à nos jeunes boxeurs.</p>
<p style="margin:0 0 1em 0">Du lundi 26 au samedi 31 octobre, nous proposons Les Vacances des Boxeurs, un stage ouvert aux filles et garçons de 8 à 16 ans, quel que soit leur niveau.</p>
<p style="margin:0 0 1em 0">Au programme : boxe technique, préparation physique, assauts adaptés et encadrés, défis collectifs, découverte du haut niveau, bowling et interclub pour terminer la semaine.</p>
<p style="margin:0 0 1em 0">L'idée est simple : permettre aux enfants de progresser en boxe, prendre confiance, se dépasser et surtout passer une belle semaine ensemble, avec un encadrement sérieux assuré par nos coachs et des boxeurs professionnels du club.</p>
<p style="margin:0 0 1em 0">Deux stages sont organisés, au Boxing Center Minimes et au Boxing Center Portet-sur-Garonne. Pour nos adhérents, le tarif est de <strong>80 €</strong> la semaine complète (140 € pour les non-adhérents).</p>
<p style="margin:0 0 1em 0">Les places sont limitées dans chaque salle afin de préserver la qualité de l'encadrement. Je vous conseille donc de réserver assez rapidement si votre enfant souhaite participer.</p>
<p style="margin:0 0 1em 0">Pour découvrir le programme et inscrire votre enfant : <a href="${STAGE_SITE}" style="color:#1a4d8c">stage.boxingcenter.fr</a></p>
<p style="margin:0 0 1em 0">J'espère que nous aurons le plaisir de retrouver votre enfant pendant cette semaine de stage !</p>
<p style="margin:0 0 1em 0">Pour toute question sur le programme ou l'organisation, vous pouvez simplement répondre à ce mail.</p>
<p style="margin:1.25em 0 0 0">À bientôt,<br>
David<br>
Boxing Center<br>
<a href="mailto:${adherentsReplyEmail()}" style="color:#1a4d8c">${adherentsReplyEmail()}</a></p>
</div>`;
}

function parseCsvLine(line) {
  const parts = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === ';' && !inQ) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  parts.push(cur);
  return parts;
}

function emailFromCsvRow(parts) {
  const email = (parts[17] || '').trim().toLowerCase();
  const ok = (parts[18] || '').trim() === 'O';
  if (!ok || !email || !email.includes('@')) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function loadEmailsFromCsv(filePath, into) {
  if (!existsSync(filePath)) return 0;
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/).slice(1).filter(Boolean);
  let added = 0;
  for (const line of lines) {
    const parts = parseCsvLine(line);
    const email = emailFromCsvRow(parts);
    if (email && !into.has(email)) {
      into.add(email);
      added++;
    }
  }
  return added;
}

/** Export Deciplus HTML (.xls) : colonne E-mail + OK.mailing */
function loadEmailsFromDeciplusHtml(filePath, into) {
  if (!existsSync(filePath)) return 0;
  const html = readFileSync(filePath, 'utf8');
  const rowRe = /<tr>\s*([\s\S]*?)\s*<\/tr>/gi;
  let added = 0;
  let m;
  while ((m = rowRe.exec(html))) {
    const cells = [];
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let c;
    while ((c = cellRe.exec(m[1]))) {
      cells.push(
        c[1]
          .replace(/&nbsp;/g, '')
          .replace(/<[^>]+>/g, '')
          .trim()
      );
    }
    if (cells.length < 19) continue;
    const email = (cells[17] || '').trim().toLowerCase();
    const ok = (cells[18] || '').trim() === 'O';
    if (!ok || !email || !email.includes('@')) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    if (!into.has(email)) {
      into.add(email);
      added++;
    }
  }
  return added;
}

export function loadAdherentRecipientEmails({ dataRoot } = {}) {
  const root =
    dataRoot ||
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const csv = path.join(root, 'membres (20).csv');
  const xls = path.join(root, 'membres (15).xls');
  const set = new Set();
  const fromCsv = loadEmailsFromCsv(csv, set);
  const fromXls = loadEmailsFromDeciplusHtml(xls, set);
  return {
    emails: [...set].sort(),
    fromCsv,
    fromXls,
    total: set.size,
    paths: { csv, xls },
  };
}
