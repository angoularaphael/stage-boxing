import { publicUrl } from './config.js';
import { isMethodAllowed } from './clubs.js';
import { createHostedCheckout, isCawlEnabled } from './cawl.js';
import {
  createHostedPayment,
  createScalapayPayment,
  hostedPaymentUrl,
  isPayplugEnabled,
  isScalapayEnabled,
} from './payplug.js';
import { createPaypalOrder, isPaypalEnabled } from './paypal.js';
import { assertStockAvailable, createOrderDraft, saveOrder } from './orders.js';

export function availableMethodsForClub(club) {
  const methods = [];
  if (club === 'portet') {
    if (isCawlEnabled()) methods.push({ id: 'cawl_card', label: 'Carte bancaire (comptant)', provider: 'cawl' });
    if (isPaypalEnabled('portet')) {
      methods.push({ id: 'paypal_once', label: 'PayPal (comptant)', provider: 'paypal' });
      methods.push({ id: 'paypal_4x', label: 'PayPal 4x sans frais', provider: 'paypal' });
    }
  } else if (club === 'minimes') {
    if (isPayplugEnabled()) {
      methods.push({ id: 'payplug_card', label: 'Carte bancaire (comptant)', provider: 'payplug' });
    }
    if (isPaypalEnabled('minimes')) {
      methods.push({ id: 'paypal_once', label: 'PayPal (comptant)', provider: 'paypal' });
      methods.push({ id: 'paypal_4x', label: 'PayPal 4x sans frais', provider: 'paypal' });
    }
    if (isPayplugEnabled() && isScalapayEnabled()) {
      methods.push({ id: 'scalapay', label: 'Scalapay (plusieurs fois)', provider: 'payplug' });
    }
  }
  return methods.filter((m) => isMethodAllowed(club, m.id));
}

export async function startCheckout(input) {
  const club = String(input.club || '').toLowerCase();
  const method = String(input.method || '').trim();
  if (!isMethodAllowed(club, method)) {
    const err = new Error('Moyen de paiement non autorise pour ce club.');
    err.code = 'method_forbidden';
    throw err;
  }
  if (!input.parent_email) {
    const err = new Error('E-mail parent obligatoire.');
    err.code = 'validation';
    throw err;
  }
  if (input.is_member && !input.member_declare) {
    const err = new Error('Veuillez declarer etre adherent pour le tarif 80 EUR.');
    err.code = 'validation';
    throw err;
  }

  await assertStockAvailable(club);

  const order = createOrderDraft({
    club,
    is_member: Boolean(input.is_member),
    parent_email: input.parent_email,
    parent_phone: input.parent_phone,
    parent_first_name: input.parent_first_name,
    parent_last_name: input.parent_last_name,
  });
  order.status = 'checkout';
  order.payment.method = method;

  const baseUrl = publicUrl();
  const description = `Stage Vacances des Boxeurs — ${order.club_label}`;
  let redirect_url = null;
  let provider_id = null;
  let provider = null;

  if (method === 'cawl_card') {
    if (club !== 'portet') throw Object.assign(new Error('CAWL reserve a Portet'), { code: 'method_forbidden' });
    const session = await createHostedCheckout({
      order,
      amountCents: order.amount_cents,
      baseUrl,
      description,
    });
    redirect_url = session.redirectUrl;
    provider_id = session.hostedCheckoutId;
    provider = 'cawl';
  } else if (method === 'payplug_card') {
    if (club !== 'minimes') throw Object.assign(new Error('PayPlug CB reserve aux Minimes'), { code: 'method_forbidden' });
    const payment = await createHostedPayment({
      order,
      amountCents: order.amount_cents,
      baseUrl,
      description,
    });
    redirect_url = hostedPaymentUrl(payment);
    provider_id = payment.id;
    provider = 'payplug';
  } else if (method === 'scalapay') {
    if (club !== 'minimes') throw Object.assign(new Error('Scalapay interdit a Portet'), { code: 'method_forbidden' });
    const payment = await createScalapayPayment({
      order,
      amountCents: order.amount_cents,
      baseUrl,
      description,
    });
    redirect_url = hostedPaymentUrl(payment);
    provider_id = payment.id;
    provider = 'payplug';
  } else if (method === 'paypal_once' || method === 'paypal_4x') {
    const session = await createPaypalOrder({
      order,
      amountCents: order.amount_cents,
      baseUrl,
      paymentPlan: method === 'paypal_4x' ? '4x' : 'once',
      description,
    });
    redirect_url = session.approve_url;
    provider_id = session.id;
    provider = 'paypal';
  } else {
    throw Object.assign(new Error('Methode inconnue'), { code: 'method_forbidden' });
  }

  if (!redirect_url) {
    throw new Error('Le prestataire de paiement n a pas renvoye d URL.');
  }

  order.payment.provider = provider;
  order.payment.provider_id = provider_id;
  await saveOrder(order);

  return {
    order_id: order.id,
    access_token: order.access_token,
    amount_cents: order.amount_cents,
    redirect_url,
    method,
  };
}
