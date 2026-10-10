import './load-env.js';
import { STAGE } from './config.js';

function fromAddress() {
  return process.env.MAIL_FROM || 'Boxing Center Stages <stages@boxingcenter.fr>';
}

function notifyEmail() {
  return String(process.env.NOTIFY_EMAIL || 'boxingcenter31@gmail.com').trim();
}

function contactLine() {
  return String(process.env.STAGE_CONTACT || 'boxingcenter31@gmail.com').trim();
}

async function sendViaResend({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no_provider' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromAddress(), to: [to], subject, html }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { sent: false, error: data.message || `Resend ${res.status}` };
  return { sent: true, id: data.id };
}

async function sendViaBrevo({ to, subject, html }) {
  const key = process.env.BREVO_API_KEY;
  if (!key) return { sent: false, reason: 'no_provider' };
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Boxing Center Stages', email: 'stages@boxingcenter.fr' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { sent: false, error: data.message || `Brevo ${res.status}` };
  return { sent: true, id: data.messageId };
}

export async function sendMail({ to, subject, html }) {
  if (!to) return { sent: false, reason: 'no_recipient' };
  if (process.env.RESEND_API_KEY) return sendViaResend({ to, subject, html });
  if (process.env.BREVO_API_KEY) return sendViaBrevo({ to, subject, html });
  console.log('[mail:dry]', { to, subject });
  return { sent: false, reason: 'no_provider', dry: true };
}

function euros(cents) {
  return `${(Number(cents) / 100).toFixed(2).replace('.', ',')} EUR`;
}

export async function sendPaymentReceived(order, { formUrl }) {
  const html = `
    <p>Bonjour,</p>
    <p>Nous avons bien reçu votre paiement de <strong>${euros(order.amount_cents)}</strong>
    pour le stage <strong>${STAGE.name}</strong> (${STAGE.dates_label}) à
    <strong>${order.club_label}</strong>.</p>
    <p>Il reste à finaliser l'inscription de votre enfant :</p>
    <p><a href="${formUrl}" style="display:inline-block;background:#E8001C;color:#fff;padding:12px 20px;text-decoration:none;font-weight:700">Finaliser l'inscription</a></p>
    <p>Sans formulaire et documents validés, la place n'est pas considérée comme complète.</p>
    <p>Contact : ${contactLine()}</p>
    <p>Boxing Center</p>`;
  return sendMail({
    to: order.parent?.email,
    subject: `Paiement reçu — ${STAGE.name}`,
    html,
  });
}

export async function sendRegistrationComplete(order) {
  const child = order.child || {};
  const html = `
    <p>Bonjour,</p>
    <p>L'inscription de <strong>${child.first_name || ''} ${child.last_name || ''}</strong>
    est complète pour <strong>${STAGE.name}</strong> (${STAGE.dates_label})
    à <strong>${order.club_label}</strong>.</p>
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
