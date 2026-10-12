import './load-env.js';
import { STAGE, publicUrl } from './config.js';
import { buildStageInvoicePdf } from './invoice-pdf.js';
import { buildStageAgendaIcs, googleCalendarUrl } from './agenda-ics.js';
import { buildCartePng, buildCarteSvg } from './carte-mail.js';

/** Meme contrat Brevo que BOXPLUS / boutique : suzinabot valide. */
const DEFAULT_SENDER_EMAIL = 'suzinabot@gmail.com';
const DEFAULT_SENDER_NAME = 'Boxing Center Stages';

function senderEmail() {
  const fromBrevo = String(process.env.BREVO_SENDER_EMAIL || '').trim();
  if (fromBrevo) return fromBrevo;
  const raw = String(process.env.MAIL_FROM || '').trim();
  const m = raw.match(/<([^>]+)>/);
  const email = (m ? m[1] : raw.includes('@') ? raw : '').trim().toLowerCase();
  // stages@boxingcenter.fr n'est pas un sender Brevo valide — ne jamais l'utiliser.
  if (email && email !== 'stages@boxingcenter.fr') return email;
  return DEFAULT_SENDER_EMAIL;
}

function senderName() {
  return (
    String(process.env.BREVO_SENDER_NAME || '').trim() ||
    String(process.env.MAIL_FROM || '')
      .replace(/<[^>]+>/, '')
      .replace(/^["']|["']$/g, '')
      .trim() ||
    DEFAULT_SENDER_NAME
  );
}

function fromAddress() {
  return `${senderName()} <${senderEmail()}>`;
}

function notifyEmail() {
  return String(process.env.NOTIFY_EMAIL || 'boxingcenter31@gmail.com').trim();
}

function contactLine() {
  return String(process.env.STAGE_CONTACT || 'boxingcenter31@gmail.com').trim();
}

function replyTo() {
  return String(
    process.env.BREVO_REPLY_TO || process.env.MAIL_REPLY_TO || contactLine()
  ).trim();
}

/**
 * @param {{ to: string, subject: string, html: string, attachments?: Array<{ filename: string, content: Buffer|string }> }} opts
 */
async function sendViaBrevo({ to, subject, html, attachments = [] }) {
  const key = String(process.env.BREVO_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!key || !key.startsWith('xkeysib-')) return { sent: false, reason: 'no_provider' };
  const name = senderName();
  const email = senderEmail();
  const body = {
    sender: { name, email },
    to: [{ email: to }],
    replyTo: { email: replyTo(), name },
    subject,
    htmlContent: html,
  };
  const files = [];
  for (const att of attachments) {
    if (!att?.content) continue;
    const buf = Buffer.isBuffer(att.content) ? att.content : Buffer.from(String(att.content), 'utf8');
    if (buf.length < 50) continue;
    files.push({
      name: att.filename || 'piece-jointe.pdf',
      content: buf.toString('base64'),
    });
  }
  if (files.length) body.attachment = files;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { sent: false, error: data.message || `Brevo ${res.status}` };
  return { sent: true, id: data.messageId, via: 'brevo' };
}

async function sendViaResend({ to, subject, html, attachments = [] }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_provider' };
  const payload = { from: fromAddress(), to: [to], subject, html, reply_to: replyTo() };
  if (attachments.length) {
    payload.attachments = attachments.map((a) => ({
      filename: a.filename || 'piece-jointe.pdf',
      content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(String(a.content)).toString('base64'),
    }));
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { sent: false, error: data.message || `Resend ${res.status}` };
  return { sent: true, id: data.id, via: 'resend' };
}

/** Brevo en priorite (consigne Boxing Center) ; Resend en secours seulement. */
export async function sendMail({ to, subject, html, attachments = [] }) {
  if (!to) return { sent: false, reason: 'no_recipient' };
  if (process.env.BREVO_API_KEY) {
    const r = await sendViaBrevo({ to, subject, html, attachments });
    if (r.sent || r.error) return r;
  }
  if (process.env.RESEND_API_KEY) return sendViaResend({ to, subject, html, attachments });
  console.log('[mail:dry]', { to, subject, attachments: attachments.map((a) => a.filename) });
  return { sent: false, reason: 'no_provider', dry: true };
}

function euros(cents) {
  return `${(Number(cents) / 100).toFixed(2).replace('.', ',')} EUR`;
}

function invoiceAttachment(order) {
  try {
    const inv = buildStageInvoicePdf(order);
    if (!inv) return [];
    return [{ filename: inv.filename, content: inv.content }];
  } catch (err) {
    console.error('[invoice]', err.message);
    return [];
  }
}

/** Brevo refuse le SVG — on joint un PNG (sharp). */
async function carteAttachments(order) {
  try {
    const carte = await buildCartePng(order);
    if (carte?.content && carte?.filename) {
      return [{ filename: carte.filename, content: carte.content }];
    }
  } catch (err) {
    console.error('[carte-mail]', err.message);
  }
  return [];
}

function agendaAttachments(order) {
  try {
    const ics = buildStageAgendaIcs(order);
    return [{ filename: ics.filename, content: ics.content }];
  } catch (err) {
    console.error('[agenda-ics]', err.message);
    return [];
  }
}

function agendaLinksHtml(order) {
  const base = publicUrl();
  const icsUrl = `${base}/api/agenda?order=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.access_token)}`;
  const gcal = googleCalendarUrl(order);
  return `
    <p style="margin:20px 0 8px"><strong>Ajouter les seances a votre agenda</strong></p>
    <p style="margin:0 0 12px">
      <a href="${icsUrl}" style="display:inline-block;background:#E8001C;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700;border-radius:8px;margin:0 8px 8px 0">Telecharger le fichier agenda (.ics)</a>
      <a href="${gcal}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;text-decoration:none;font-weight:700;border-radius:8px;border:1px solid #fff;margin:0 0 8px 0">Google Agenda</a>
    </p>
    <p style="font-size:13px;color:#555">Le fichier .ics est aussi joint a cet e-mail (12 seances, 26-31 octobre 2026). Ouvrez-le pour l importer dans Outlook, Apple Calendar, etc.</p>`;
}

export async function sendPaymentReceived(order, { formUrl }) {
  const attachments = invoiceAttachment(order);
  const factureNote = attachments.length
    ? `<p>Votre <strong>facture du club</strong> (PDF) est jointe a cet e-mail — distincte du recu PayPlug eventuel.</p>`
    : '';
  const html = `
    <p>Bonjour,</p>
    <p>Nous avons bien reçu votre paiement de <strong>${euros(order.amount_cents)}</strong>
    pour le stage <strong>${STAGE.name}</strong> (${STAGE.dates_label}) à
    <strong>${order.club_label}</strong>.</p>
    ${factureNote}
    <p>Il reste à finaliser l'inscription de votre enfant :</p>
    <p><a href="${formUrl}" style="display:inline-block;background:#E8001C;color:#fff;padding:12px 20px;text-decoration:none;font-weight:700">Finaliser l'inscription</a></p>
    <p>Sans formulaire et documents validés, la place n'est pas considérée comme complète.</p>
    <p>Contact : ${contactLine()}</p>
    <p>Boxing Center</p>`;
  return sendMail({
    to: order.parent?.email,
    subject: `Paiement reçu et facture — ${STAGE.name}`,
    html,
    attachments,
  });
}

export async function sendRegistrationComplete(order) {
  const child = order.child || {};
  const carteFiles = await carteAttachments(order);
  const factureFiles = invoiceAttachment(order);
  const agendaFiles = agendaAttachments(order);
  if (!carteFiles.length) {
    console.error('[mail:registration] carte PNG manquante — envoi bloqué');
    return {
      parent: { sent: false, error: 'carte_png_manquante' },
      team: { sent: false, reason: 'skipped' },
    };
  }
  if (!factureFiles.length) {
    console.error('[mail:registration] facture PDF manquante');
  }
  const attachments = [...factureFiles, ...carteFiles, ...agendaFiles];
  let carteHtml = '';
  try {
    carteHtml = buildCarteSvg(order).html;
  } catch {
    carteHtml = '';
  }
  const factureNote = factureFiles.length
    ? `<p>Votre <strong>facture du club</strong> (PDF) est jointe — emetteur ${order.club === 'portet' ? 'Noble Art Portesien (Portet)' : 'SAS Boxing Center (Minimes)'}.</p>`
    : '';
  const html = `
    <p>Bonjour,</p>
    <p>L'inscription de <strong>${child.first_name || ''} ${child.last_name || ''}</strong>
    est complète pour <strong>${STAGE.name}</strong> (${STAGE.dates_label})
    à <strong>${order.club_label}</strong>.</p>
    ${carteHtml}
    <p>Pieces jointes : <strong>carte PNG</strong>, <strong>facture PDF</strong>, <strong>agenda ICS</strong> (et liens calendrier ci-dessous).</p>
    ${agendaLinksHtml(order)}
    ${factureNote}
    <p><strong>Horaires :</strong> en règle générale 2 séances ou activités par jour
    (matin et après-midi), selon le programme du club.</p>
    <p><strong>À prévoir :</strong> gants, protège-dents, casque, tenue de sport, baskets,
    bouteille d'eau, tenue de rechange. Le repas du midi n'est pas pris en charge.</p>
    <p><strong>Documents :</strong> CGV, règlement, autorisation parentale et état de santé validés.</p>
    <p>Contact utile : ${contactLine()}</p>
    <p>À très bientôt.</p>
    <p>Boxing Center</p>`;
  console.log('[mail:registration] pj', attachments.map((a) => `${a.filename}:${a.content?.length || 0}`));
  const parent = await sendMail({
    to: order.parent?.email,
    subject: `Inscription confirmée — carte, facture et agenda — ${STAGE.name}`,
    html,
    attachments,
  });
  if (!parent.sent) {
    console.error('[mail:registration]', parent.error || parent.reason, {
      to: order.parent?.email,
      files: attachments.map((a) => a.filename),
    });
  }
  const team = await sendMail({
    to: notifyEmail(),
    subject: `[Stage] ${order.club} — ${child.first_name || ''} ${child.last_name || ''}`,
    html: `<p>Nouvelle inscription complète.</p>
      <ul>
        <li>Club : ${order.club_label}</li>
        <li>Tarif : ${order.is_member ? 'adhérent' : 'non-adhérent'} (${euros(order.amount_cents)})</li>
        <li>Enfant : ${child.first_name || ''} ${child.last_name || ''} (${child.birthdate || ''})</li>
        <li>Parent : ${order.parent?.email || ''} / ${order.parent?.phone || ''}</li>
        <li>Fiche : ${String(child.notes || '—').replace(/\n/g, '<br>')}</li>
      </ul>`,
    attachments: invoiceAttachment(order),
  });
  return { parent, team };
}

export async function sendFormReminder(order, { formUrl }) {
  return sendMail({
    to: order.parent?.email,
    subject: `Action requise — finaliser le stage ${STAGE.name}`,
    html: `<p>Votre paiement est bien reçu, mais le formulaire enfant n'est pas encore complété.</p>
      <p><a href="${formUrl}">Finaliser maintenant</a></p>
      <p>Contact : ${contactLine()}</p>`,
  });
}
