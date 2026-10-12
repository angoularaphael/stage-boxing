import './load-env.js';
import { STAGE } from './config.js';
import { paymentVar, useStudio } from './studio.js';

const API_BASE = 'https://api.payplug.com/v1';
const API_VERSION = process.env.PAYPLUG_API_VERSION || '2019-08-06';

export const SCALAPAY_MIN_CENTS = 500;
export const SCALAPAY_MAX_CENTS = 200000;
export const SCALAPAY_FEES_HINT =
  'Scalapay : 3x sans frais pour vous, ou 4x avec 1,5 % de frais (a votre charge).';

function secretKey() {
  return paymentVar('PAYPLUG_SECRET_KEY');
}

export function isPayplugEnabled() {
  return Boolean(secretKey());
}

export function isScalapayEnabled() {
  const flag = String(process.env.PAYPLUG_SCALAPAY_ENABLED || '').trim().toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'no' || flag === 'off') return false;
  return true;
}

export function isAmountEligibleForScalapay(amountCents) {
  const n = Number(amountCents);
  return Number.isFinite(n) && n >= SCALAPAY_MIN_CENTS && n <= SCALAPAY_MAX_CENTS;
}

function headers() {
  const key = secretKey();
  if (!key) throw new Error('PAYPLUG_SECRET_KEY manquante');
  return {
    Authorization: `Bearer ${key}`,
    'PayPlug-Version': API_VERSION,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function request(path, { method = 'GET', body = null } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!res.ok) {
    const detail =
      data.details && typeof data.details === 'object'
        ? Object.entries(data.details)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' ; ')
        : '';
    const msg = [data.message || data.error || `PayPlug HTTP ${res.status}`, detail]
      .filter(Boolean)
      .join(' — ');
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

function sanitizeEmail(value) {
  const email = String(value || '').trim();
  const at = email.indexOf('@');
  if (at < 1) return email;
  return `${email.slice(0, at).replace(/\+/g, '')}@${email.slice(at + 1)}`;
}

/** Mobile FR en E.164 (+33…) — requis par Scalapay / APM PayPlug. */
export function phoneE164(value) {
  const raw = String(value || '').trim();
  let digits = raw.replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (/^[67]\d{8}$/.test(digits)) digits = `0${digits}`;
  if (/^0[67]\d{8}$/.test(digits)) return `+33${digits.slice(1)}`;
  if (/^33[67]\d{8}$/.test(digits)) return `+${digits}`;
  if (raw.startsWith('+') && digits.length >= 10) return `+${digits}`;
  return undefined;
}

function billingFromOrder(order) {
  const mobile = phoneE164(order.parent?.phone);
  const billing = {
    first_name: order.parent?.first_name || 'Parent',
    last_name: order.parent?.last_name || 'Boxing',
    email: sanitizeEmail(order.parent?.email) || undefined,
    address1: '12 rue de Fenouillet',
    postcode: '31200',
    city: 'Toulouse',
    country: 'FR',
    language: 'fr',
    company_name: 'Boxing Center',
  };
  if (mobile) billing.mobile_phone_number = mobile;
  return billing;
}

function returnUrls(order, baseUrl, flag) {
  const returnBase = `${baseUrl}/inscription?order=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.access_token)}`;
  return {
    return_url: `${returnBase}&${flag}=1`,
    cancel_url: `${returnBase}&cancelled=1`,
  };
}

export async function createHostedPayment({ order, amountCents, baseUrl, description }) {
  const amount = Number(amountCents || order.amount_cents || 0);
  if (!amount || amount < 100) throw new Error('Montant PayPlug invalide');
  const billing = billingFromOrder(order);
  const urls = returnUrls(order, baseUrl, 'payplug_return');
  const payload = {
    amount,
    currency: 'EUR',
    billing,
    shipping: { ...billing, delivery_type: 'BILLING' },
    description: String(description || 'Stage enfants Boxing Center').slice(0, 80),
    metadata: {
      order_id: order.id,
      club: order.club,
      product: 'stage-enfants',
      studio: useStudio() ? '1' : '0',
    },
    notification_url: `${baseUrl}/api/webhooks/payplug`,
    hosted_payment: urls,
  };
  return request('/payments', { method: 'POST', body: payload });
}

/**
 * Scalapay via PayPlug — meme contrat que BOXPLUS :
 * payment_method "scalapay" + payment_context.cart obligatoire.
 */
export async function createScalapayPayment({ order, amountCents, baseUrl, description }) {
  if (!isScalapayEnabled()) throw new Error('Scalapay desactive');
  const amount = Number(amountCents || order.amount_cents || 0);
  if (!isAmountEligibleForScalapay(amount)) {
    throw new Error(
      `Montant hors bornes Scalapay (${SCALAPAY_MIN_CENTS / 100}-${SCALAPAY_MAX_CENTS / 100} EUR)`
    );
  }
  const billing = billingFromOrder(order);
  if (!billing.mobile_phone_number) {
    const err = new Error(
      'Pour Scalapay, indiquez un telephone mobile francais (06 ou 07).'
    );
    err.code = 'payplug_customer_incomplete';
    throw err;
  }

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 1);
  const expectedDelivery = deliveryDate.toISOString().slice(0, 10);
  const itemName = String(
    description || `Stage ${STAGE.name} — ${order.club_label || order.club}`
  ).slice(0, 80);

  const cart = [
    {
      delivery_label: 'Boxing Center',
      delivery_type: 'storepickup',
      brand: 'Boxing Center',
      merchant_item_id: String(order.id || 'stage').slice(0, 40),
      name: itemName,
      expected_delivery_date: expectedDelivery,
      total_amount: amount,
      price: amount,
      quantity: 1,
    },
  ];

  const urls = returnUrls(order, baseUrl, 'scalapay_return');
  const payload = {
    amount,
    currency: 'EUR',
    payment_method: 'scalapay',
    payment_context: { cart },
    billing,
    shipping: { ...billing, delivery_type: 'BILLING' },
    description: itemName,
    metadata: {
      order_id: order.id,
      club: order.club,
      product: 'stage-enfants',
      payment_plan: 'scalapay',
      studio: useStudio() ? '1' : '0',
    },
    notification_url: `${baseUrl}/api/webhooks/payplug`,
    hosted_payment: urls,
  };
  return request('/payments', { method: 'POST', body: payload });
}

export async function retrievePayment(paymentId) {
  return request(`/payments/${encodeURIComponent(paymentId)}`, { method: 'GET' });
}

export function isPayplugPaymentPaid(payment) {
  if (!payment) return false;
  if (payment.is_paid === true) return true;
  if (payment.failure) return false;
  const authorizedAt = payment.authorization?.authorized_at || payment.authorized_at;
  const pending = payment.payment_method?.is_pending === true;
  return Boolean(authorizedAt) && !pending && payment.auto_capture !== false;
}

export function hostedPaymentUrl(payment) {
  return payment?.hosted_payment?.payment_url || null;
}
