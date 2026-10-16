import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STAGE_SITE = 'https://stage.boxingcenter.fr/';

export const ADHERENTS_MAIL_SUBJECT =
  'Stage vacances octobre — Les Vacances des Boxeurs (adhérents)';

export function adherentsMailHtml() {
  return `
<div style="font-family:Georgia,serif;font-size:16px;line-height:1.55;color:#1a1a1a;max-width:36rem">
<p>Bonjour,</p>
<p>Je me permets de vous écrire car votre enfant est inscrit chez Boxing Center et nous organisons, pendant les vacances de la Toussaint, une semaine de stage spécialement dédiée à nos jeunes boxeurs.</p>
<p>Du lundi 26 au samedi 31 octobre, nous proposons <strong>Les Vacances des Boxeurs</strong>, un stage ouvert aux filles et garçons de <strong>8 à 16 ans</strong>, quel que soit leur niveau.</p>
<p>Au programme : boxe technique, préparation physique, assauts adaptés et encadrés, défis collectifs, découverte du haut niveau, bowling et interclub pour terminer la semaine.</p>
<p>L'idée est simple : permettre aux enfants de progresser en boxe, prendre confiance, se dépasser et surtout passer une belle semaine ensemble, avec un encadrement sérieux assuré par nos coachs et des boxeurs professionnels du club.</p>
<p>Deux stages sont organisés, au <strong>Boxing Center Minimes</strong> et au <strong>Boxing Center Portet-sur-Garonne</strong>.</p>
<p>Nous avons souhaité proposer un tarif particulièrement accessible à nos adhérents :</p>
<p><strong>80 € la semaine complète</strong> pour les enfants inscrits chez Boxing Center, au lieu de 140 € pour les non-adhérents.</p>
<p>Les places sont limitées dans chaque salle afin de préserver la qualité de l'encadrement. Je vous conseille donc de réserver assez rapidement si votre enfant souhaite participer.</p>
<p>Pour découvrir le programme et inscrire votre enfant, tout se passe ici :<br>
<a href="${STAGE_SITE}">${STAGE_SITE}</a></p>
<p>J'espère que nous aurons le plaisir de retrouver votre enfant pendant cette semaine de stage !</p>
<p>Pour toute question sur le programme ou l'organisation, vous pouvez simplement répondre à ce mail.</p>
<p>À bientôt,<br><br>
<strong>David</strong><br>
Boxing Center<br>
<a href="mailto:boxingcenter31@gmail.com">boxingcenter31@gmail.com</a></p>
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
