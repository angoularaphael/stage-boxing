import '../lib/load-env.js';
import { publicUrl } from '../lib/config.js';
import { json, methodOf, queryFromUrl, readBody } from '../lib/http.js';
import { sendRegistrationComplete } from '../lib/mail.js';
import { getOrderByToken, publicOrderView, saveOrder } from '../lib/orders.js';

function ageFromBirthdate(iso, refIso = '2026-10-26') {
  const d = new Date(iso);
  const ref = new Date(refIso);
  if (Number.isNaN(d.getTime()) || Number.isNaN(ref.getTime())) return null;
  let age = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age -= 1;
  return age;
}

export default async function handler(req, res) {
  const q = queryFromUrl(req);
  const id = q.id || q.order;
  const token = q.token;

  if (methodOf(req) === 'GET') {
    const order = await getOrderByToken(id, token);
    if (!order) return json(res, 404, { ok: false, error: 'Commande introuvable.' });
    return json(res, 200, { ok: true, order: publicOrderView(order) });
  }

  if (methodOf(req) !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const body = await readBody(req);
  const order = await getOrderByToken(body.order_id || id, body.token || token);
  if (!order) return json(res, 404, { ok: false, error: 'Commande introuvable.' });
  if (!['form_pending', 'paid', 'complete'].includes(order.status) && order.payment?.status !== 'paid') {
    return json(res, 400, { ok: false, error: 'Paiement requis avant le formulaire.' });
  }

  const action = String(body.action || 'child').toLowerCase();

  if (action === 'child') {
    const birthdate = String(body.birthdate || '').trim();
    const age = ageFromBirthdate(birthdate);
    if (age == null || age < 8 || age > 16) {
      return json(res, 400, { ok: false, error: 'L enfant doit avoir entre 8 et 16 ans.' });
    }
    order.child = {
      first_name: String(body.first_name || '').trim(),
      last_name: String(body.last_name || '').trim(),
      birthdate,
      age,
      practice_years: String(body.practice_years || '').trim(),
      notes: String(body.notes || '').trim(),
      parent_phone_2: String(body.parent_phone_2 || '').trim(),
    };
    if (!order.child.first_name || !order.child.last_name) {
      return json(res, 400, { ok: false, error: 'Nom et prenom de l enfant obligatoires.' });
    }
    if (body.parent_phone) order.parent.phone = String(body.parent_phone).trim();
    if (body.parent_email) order.parent.email = String(body.parent_email).trim().toLowerCase();
    order.status = 'form_pending';
    await saveOrder(order);
    return json(res, 200, { ok: true, order: publicOrderView(order), next: 'documents' });
  }

  if (action === 'documents') {
    if (!order.child) {
      return json(res, 400, { ok: false, error: 'Formulaire enfant requis.' });
    }
    const required = ['cgv', 'reglement', 'parental', 'health', 'participation'];
    for (const key of required) {
      if (!body[key]) {
        return json(res, 400, { ok: false, error: `Document obligatoire manquant : ${key}` });
      }
    }
    order.documents = {
      cgv: true,
      reglement: true,
      parental: true,
      health: true,
      participation: true,
      image_rights: body.image_rights === true || body.image_rights === 'yes',
      signature: String(body.signature || '').slice(0, 200000) || null,
      accepted_at: new Date().toISOString(),
    };
    order.status = 'complete';
    await saveOrder(order);
    const formUrl = `${publicUrl()}/inscription?order=${order.id}&token=${order.access_token}`;
    void formUrl;
    await sendRegistrationComplete(order).catch((err) => console.error('[mail]', err.message));
    return json(res, 200, { ok: true, order: publicOrderView(order), next: 'done' });
  }

  return json(res, 400, { ok: false, error: 'Action inconnue.' });
}
