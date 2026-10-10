import './load-env.js';
import { paymentVar, useStudio } from './studio.js';

export function paypalAccountForGym(gym) {
  return String(gym || '').trim().toLowerCase() === 'portet' ? 'portet' : 'minimes';
}

function credentialsForAccount(account) {
  if (account === 'portet') {
    return {
      account: 'portet',
      clientId: paymentVar('PAYPAL_PORTET_CLIENT_ID'),
      secret: paymentVar('PAYPAL_PORTET_CLIENT_SECRET'),
    };
  }
  return {
    account: 'minimes',
    clientId: paymentVar('PAYPAL_CLIENT_ID'),
    secret: paymentVar('PAYPAL_CLIENT_SECRET'),
  };
}

export function isPaypalEnabled(gym) {
  const creds = credentialsForAccount(paypalAccountForGym(gym));
  return Boolean(creds.clientId && creds.secret);
}

function paypalMode() {
  if (useStudio()) return 'sandbox';
  const mode = paymentVar('PAYPAL_MODE').toLowerCase();
  if (mode === 'sandbox' || mode === 'test') return 'sandbox';
  if (mode === 'live' || mode === 'production') return 'live';
  return 'sandbox';
}

function apiBase() {
  return paypalMode() === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

const tokenCache = {};

async function getAccessToken(account = 'minimes') {
  const acc = account === 'portet' ? 'portet' : 'minimes';
  const cacheKey = `${acc}:${paypalMode()}:studio=${useStudio() ? 1 : 0}`;
  const cached = tokenCache[cacheKey];
  if (cached?.value && Date.now() < cached.exp - 30_000) return cached.value;
  const { clientId, secret } = credentialsForAccount(acc);
  if (!clientId || !secret) {
    throw new Error(
      acc === 'portet'
        ? 'PAYPAL_PORTET_CLIENT_ID / SECRET manquants'
        : 'PAYPAL_CLIENT_ID / SECRET manquants'
    );
  }
  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error_description || body.error || `PayPal OAuth ${res.status}`);
  tokenCache[cacheKey] = {
    value: body.access_token,
    exp: Date.now() + Number(body.expires_in || 300) * 1000,
  };
  return tokenCache[cacheKey].value;
}

async function paypalRequest(path, { method = 'GET', body = null, account } = {}) {
  const token = await getAccessToken(account);
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
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
    const msg =
      data.message ||
      data.error_description ||
      data.details?.[0]?.description ||
      `PayPal HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

function eurosFromCents(cents) {
  return (Number(cents) / 100).toFixed(2);
}

function approveUrl(order) {
  const link = (order.links || []).find((l) => l.rel === 'approve' || l.rel === 'payer-action');
  return link?.href || null;
}

export async function createPaypalOrder({
  order,
  amountCents,
  baseUrl,
  paymentPlan = 'once',
  description = 'Stage Les Vacances des Boxeurs',
}) {
  const account = paypalAccountForGym(order.club);
  const amount = Number(amountCents || order.amount_cents || 0);
  if (!amount) throw new Error('Montant PayPal invalide');

  const returnUrl = `${baseUrl}/inscription?order=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.access_token)}&paypal_return=1`;
  const cancelUrl = `${baseUrl}/inscription?order=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.access_token)}&cancelled=1`;

  const email = String(order.parent?.email || '').trim().toLowerCase();
  const paypalSource = {
    experience_context: {
      brand_name: account === 'portet' ? 'Noble Art Portésien' : 'Boxing Center',
      locale: 'fr-FR',
      landing_page: paymentPlan === '4x' ? 'NO_PREFERENCE' : 'LOGIN',
      user_action: 'PAY_NOW',
      return_url: returnUrl,
      cancel_url: cancelUrl,
      shipping_preference: 'NO_SHIPPING',
    },
  };
  if (email.includes('@')) paypalSource.email_address = email.slice(0, 254);

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: order.id,
        custom_id: order.id,
        description: String(description).slice(0, 127),
        amount: { currency_code: 'EUR', value: eurosFromCents(amount) },
      },
    ],
    payment_source: { paypal: paypalSource },
  };

  const created = await paypalRequest('/v2/checkout/orders', {
    method: 'POST',
    body: payload,
    account,
  });

  return {
    id: created.id,
    approve_url: approveUrl(created),
    payment_plan: paymentPlan,
    paypal_account: account,
    studio: useStudio(),
    raw: created,
  };
}

export async function getPaypalOrder(paypalOrderId, { gym } = {}) {
  const account = paypalAccountForGym(gym);
  return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, {
    method: 'GET',
    account,
  });
}

export async function capturePaypalOrder(paypalOrderId, { gym } = {}) {
  const account = paypalAccountForGym(gym);
  return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    body: {},
    account,
  });
}

/**
 * Capture si APPROVED ; si deja COMPLETED, renvoie l'ordre sans re-capturer (idempotent).
 */
export async function ensurePaypalCaptured(paypalOrderId, { gym } = {}) {
  const current = await getPaypalOrder(paypalOrderId, { gym });
  if (isPaypalOrderPaid(current)) return current;
  const status = String(current?.status || '').toUpperCase();
  if (status !== 'APPROVED') {
    const err = new Error(`Paiement PayPal non pret (${status || 'inconnu'}).`);
    err.code = 'paypal_not_ready';
    err.paypal = current;
    throw err;
  }
  try {
    return await capturePaypalOrder(paypalOrderId, { gym });
  } catch (err) {
    // Course : une autre confirmation a deja capture
    const again = await getPaypalOrder(paypalOrderId, { gym }).catch(() => null);
    if (again && isPaypalOrderPaid(again)) return again;
    throw err;
  }
}

export function isPaypalOrderPaid(capturedOrOrder) {
  const status = String(capturedOrOrder?.status || '').toUpperCase();
  if (status === 'COMPLETED') return true;
  const units = capturedOrOrder?.purchase_units || [];
  for (const u of units) {
    const captures = u.payments?.captures || [];
    if (captures.some((c) => String(c.status || '').toUpperCase() === 'COMPLETED')) return true;
  }
  return false;
}

export async function verifyPaypalWebhook(headers, body) {
  const webhookId = String(process.env.PAYPAL_WEBHOOK_ID || '').trim();
  if (!webhookId) {
    if (String(process.env.VERCEL || '') === '1' && paypalMode() === 'live') {
      return { ok: false, reason: 'PAYPAL_WEBHOOK_ID manquant' };
    }
    return { ok: true, skipped: true };
  }
  const transmissionId = headers['paypal-transmission-id'] || headers['PayPal-Transmission-Id'];
  const transmissionTime = headers['paypal-transmission-time'] || headers['PayPal-Transmission-Time'];
  const certUrl = headers['paypal-cert-url'] || headers['PayPal-Cert-Url'];
  const authAlgo = headers['paypal-auth-algo'] || headers['PayPal-Auth-Algo'];
  const transmissionSig = headers['paypal-transmission-sig'] || headers['PayPal-Transmission-Sig'];
  if (!transmissionId || !transmissionSig) {
    return { ok: false, reason: 'en-tetes webhook PayPal manquants' };
  }
  // Verification via compte Minimes (webhook unique) ; sandbox si mode sandbox
  const account = 'minimes';
  const result = await paypalRequest('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    account,
    body: {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: body,
    },
  });
  const ok = String(result.verification_status || '').toUpperCase() === 'SUCCESS';
  return { ok, status: result.verification_status };
}
