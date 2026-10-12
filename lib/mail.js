import './load-env.js';
import { STAGE } from './config.js';
import { buildStageInvoicePdf } from './invoice-pdf.js';

function fromAddress() {
  return process.env.MAIL_FROM || 'Boxing Center Stages <stages@boxingcenter.fr>';
}

function parseFrom(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].trim().replace(/^["']|["']$/g, ''), email: m[2].trim() };
  if (s.includes('@')) return { name: 'Boxing Center Stages', email: s };
  return { name: 'Boxing Center Stages', email: 'stages@boxingcenter.fr' };
}

function notifyEmail() {
  return String(process.env.NOTIFY_EMAIL || 'boxingcenter31@gmail.com').trim();
}

function contactLine() {
  return String(process.env.STAGE_CONTACT || 'boxingcenter31@gmail.com').trim();
}

function replyTo() {
  return String(process.env.BREVO_REPLY_TO || process.env.MAIL_REPLY_TO || contactLine()).trim();
}

/**
 * @param {{ to: string, subject: string, html: string, attachments?: Array<{ filename: string, content: Buffer|string }> }} opts
 */
async function sendViaBrevo({ to, subject, html, attachments = [] }) {
  const key = String(process.env.BREVO_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!key || !key.startsWith('xkeysib-')) return { sent: false, reason: 'no_provider' };
  const sender = parseFrom(fromAddress());
  const body = {
    sender: { name: sender.name, email: sender.email },
    to: [{ email: to }],
    replyTo: { email: replyTo(), name: sender.name },
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
  const payload = { from: fromAddress(), to: [to], subject, html };
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

export async function sendPaymentReceived(order, { formUrl }) {
  const attachments = invoiceAttachment(order);
  const factureNote = attachments.length
    ? `<p>Votre <strong>facture</strong> est jointe a cet e-mail (PDF).</p>`
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
  const attachments = invoiceAttachment(order);
  const factureNote = attachments.length
    ? `<p>Votre <strong>facture</strong> est jointe a cet e-mail (PDF).</p>`
    : '';
  const html = `
    <p>Bonjour,</p>
    <p>L'inscription de <strong>${child.first_name || ''} ${child.last_name || ''}</strong>
    est complète pour <strong>${STAGE.name}</strong> (${STAGE.dates_label})
    à <strong>${order.club_label}</strong>.</p>
    ${factureNote}
    <p><strong>Horaires :</strong> en règle générale 2 séances ou activités par jour
    (matin et après-midi), selon le programme du club. Détail sur la page du stage.</p>
    <p><strong>À prévoir :</strong> gants, protège-dents, casque, tenue de sport, baskets,
    bouteille d'eau, tenue de rechange. Le repas du midi n'est pas pris en charge.</p>
    <p><strong>Documents :</strong> CGV, règlement, autorisation parentale et état de santé validés.</p>
    <p>Contact utile : ${contactLine()}</p>
    <p>À très bientôt.</p>
    <p>Boxing Center</p>`;
  const parent = await sendMail({
    to: order.parent?.email,
    subject: `Inscription confirmée — ${STAGE.name}`,
    html,
    attachments,
  });
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
    attachments,
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
