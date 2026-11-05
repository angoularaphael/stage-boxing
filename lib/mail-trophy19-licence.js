import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.join(__dirname, '..', 'data', 'campaign-logs');

export const TROPHY19_LICENCE_URL =
  process.env.TROPHY19_LICENCE_URL ||
  'https://boxing-trophy-18.vercel.app/#licence';

export const TROPHY19_CAMPAIGN_COMBAT = 'trophy19-licence-combat-2026-11';
export const TROPHY19_CAMPAIGN_ATTENTE = 'trophy19-sans-adversaire-2026-11';

export const TROPHY19_SUBJECT_COMBAT =
  'Boxing Trophy 19 — votre combat est valide, licence 50 EUR a regulariser avant le 11/11';

export const TROPHY19_SUBJECT_ATTENTE =
  'Boxing Trophy 19 — pas d adversaire pour cette edition';

const PORTET_REPLY = 'vgsportmanagement@gmail.com';

export function trophy19ReplyEmail() {
  return String(
    process.env.BREVO_REPLY_TO_PORTET ||
      process.env.PORTET_AMENAGEMENT_REPLY_TO ||
      PORTET_REPLY
  ).trim();
}

function titleCaseWord(word) {
  const s = String(word || '').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function loadJsonList(fileName) {
  const p = path.join(logDir, fileName);
  if (!existsSync(p)) throw new Error(`Liste introuvable: ${p}`);
  const rows = JSON.parse(readFileSync(p, 'utf8'));
  if (!Array.isArray(rows)) throw new Error(`JSON invalide: ${p}`);
  return rows.filter((r) => r && r.email);
}

export function loadTrophy19CombatRecipients() {
  return loadJsonList('trophy19-mail-combat.json');
}

export function loadTrophy19AttenteRecipients() {
  return loadJsonList('trophy19-mail-attente.json');
}

export function trophy19CombatMailText(prenom = '') {
  const who = titleCaseWord(prenom);
  const hello = who ? `Bonjour ${who},` : 'Bonjour,';
  const reply = trophy19ReplyEmail();
  const link = TROPHY19_LICENCE_URL;
  return [
    hello,
    '',
    'Votre inscription et votre combat au Boxing Trophy 19 sont valides.',
    '',
    'Pour finaliser votre participation, merci d\'effectuer les demarches suivantes :',
    '',
    '- Ouvrir le lien ci-dessous, cliquer sur « Payer ma licence » (50 EUR), puis signer en ligne.',
    '- Apres signature : telecharger le formulaire et le certificat medical (page de confirmation + e-mail).',
    '- Faire remplir et tamponner le dossier par votre medecin.',
    '- Joindre une copie de votre piece d\'identite (carte d\'identite, passeport ou autre piece officielle).',
    '- Deposer le dossier signe + la copie d\'identite au manager de n\'importe quelle salle Boxing Center (Minimes, Portet, Ramonville, Saint-Cyprien ou Etats-Unis), au plus tard le 11 novembre 2026.',
    '',
    `Lien pour payer la licence : ${link}`,
    '',
    'Sans regularisation dans ce delai, votre inscription et votre combat pourront etre annules.',
    '',
    'Rendez-vous vendredi 13 novembre :',
    '- Pesee : 17h30 a 18h15',
    '- Lieu : Boxing Center de Portet — 61 route d\'Espagne, 31120 Portet-sur-Garonne',
    '- Debut des combats : 19h',
    '- Entree public : 10 EUR',
    '',
    'A prevoir : protege-dents, coquille et bandes. Casques et gants fournis.',
    'Buvette et restauration sur place.',
    '',
    'Invitez vos proches a venir vous encourager.',
    '',
    'A tres vite,',
    'L\'equipe Boxing Center Portet',
    reply,
  ].join('\n');
}

export function trophy19AttenteMailText(prenom = '') {
  const who = titleCaseWord(prenom);
  const hello = who ? `Bonjour ${who},` : 'Bonjour,';
  const reply = trophy19ReplyEmail();
  return [
    hello,
    '',
    'Merci pour votre inscription au Boxing Trophy 19.',
    '',
    'Apres appariement des categories, nous n\'avons pas pu vous trouver d\'adversaire pour cette edition.',
    'Vous ne boxerez donc pas le vendredi 13 novembre a Portet.',
    '',
    'Vous restez bienvenu(e) dans le public (entree 10 EUR) pour encourager les combattants.',
    'Si un adversaire se liberait d\'ici la, nous vous recontacterions.',
    '',
    'Pour toute question, repondez simplement a ce mail.',
    '',
    'Sportivement,',
    'L\'equipe Boxing Center Portet',
    reply,
  ].join('\n');
}

export function trophy19CombatBrevoOpts(prenom = '') {
  return {
    text: trophy19CombatMailText(prenom),
    html: null,
    headers: {},
    tags: [TROPHY19_CAMPAIGN_COMBAT],
    skipListUnsubscribe: true,
    replyToEmail: trophy19ReplyEmail(),
  };
}

export function trophy19AttenteBrevoOpts(prenom = '') {
  return {
    text: trophy19AttenteMailText(prenom),
    html: null,
    headers: {},
    tags: [TROPHY19_CAMPAIGN_ATTENTE],
    skipListUnsubscribe: true,
    replyToEmail: trophy19ReplyEmail(),
  };
}
