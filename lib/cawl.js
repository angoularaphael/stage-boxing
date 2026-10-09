import crypto from 'node:crypto';
import './load-env.js';
import { paymentVar, useStudio } from './studio.js';

function cawlMode() {
  if (useStudio()) return 'test';
  const mode = (paymentVar('CAWL_MODE') || 'test').toLowerCase();
  if (mode === 'test' || mode === 'preprod' || mode === 'sandbox') return 'test';
  return 'live';
}

function apiHost() {
  return cawlMode() === 'test' ? 'payment.preprod.cawl-solutions.fr' : 'payment.cawl-solutions.fr';
}

function credentials() {
  return {
    merchantId: paymentVar('CAWL_MERCHANT_ID'),
    apiKeyId: paymentVar('CAWL_API_KEY_ID'),
    apiSecret: paymentVar('CAWL_API_SECRET'),
  };
}

export function isCawlEnabled() {
  const { merchantId, apiKeyId, apiSecret } = credentials();
  return Boolean(merchantId && apiKeyId && apiSecret);
}

function merchantReference(id) {
  return String(id || '')
    .replace(/[^0-9A-Za-z_-]/g, '')
    .slice(0, 30) || `STG${Date.now()}`.slice(0, 30);
}

function buildSignatureSubject({ method, contentType, date, resourcePath, contentDigest }) {
  const lines = [
    method.toUpperCase(),
    contentType || '',
    date,
    resourcePath,
    contentDigest || '',
  ];
  return lines.join('\n') + '\n';
}

function sign(secret, subject) {
  return crypto.createHmac('sha256', secret).update(subject, 'utf8').digest('base64');
}

async function cawlRequest(method, resourcePath, body = null) {
  const { merchantId, apiKeyId, apiSecret } = credentials();
  if (!merchantId || !apiKeyId || !apiSecret) throw new Error('CAWL non configure');
  const contentType = body ? 'application/json' : '';
  const raw = body ? JSON.stringify(body) : '';
  const contentDigest = raw
    ? crypto.createHash('sha256').update(raw, 'utf8').digest('base64')
    : '';
  const date = new Date().toUTCString();
  const subject = buildSignatureSubject({
    method,
    contentType,
    date,
    resourcePath,
    contentDigest,
  });
  const signature = sign(apiSecret, subject);
  const headers = {
    Date: date,
    Authorization: `GCS v1HMAC:${apiKeyId}:${signature}`,
    Accept: 'application/json',
  };
  if (contentType) headers['Content-Type'] = contentType;
  if (contentDigest) headers['X-GCS-ContentDigest'] = `sha256=${contentDigest}`;

  const res = await fetch(`https://${apiHost()}${resourcePath}`, {
    method,
    headers,
    body: raw || undefined,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!res.ok) {
    const msg = data.message || data.errorMessage || `CAWL HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export async function createHostedCheckout({ order, amountCents, baseUrl, description }) {
  const { merchantId } = credentials();
  const amount = Number(amountCents || order.amount_cents || 0);
  if (!amount) throw new Error('Montant CAWL invalide');
  const returnUrl = `${baseUrl}/inscription?order=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.access_token)}&cawl_return=1`;
  const payload = {
    order: {
      amountOfMoney: { amount, currencyCode: 'EUR' },
      customer: {
        billingAddress: { countryCode: 'FR' },
        contactDetails: {
          emailAddress: order.parent?.email || undefined,
          phoneNumber: order.parent?.phone || undefined,
        },
        personalInformation: {
          name: {
            firstName: order.parent?.first_name || 'Parent',
            surname: order.parent?.last_name || 'Boxing',
          },
        },
      },
      references: {
        merchantReference: merchantReference(order.id),
        descriptor: String(description || 'Stage Boxing Center').slice(0, 32),
      },
    },
    hostedCheckoutSpecificInput: {
      returnUrl: returnUrl.slice(0, 200),
      locale: 'fr_FR',
    },
  };

  const created = await cawlRequest('POST', `/v2/${merchantId}/hostedcheckouts`, payload);
  const redirectUrl = created.redirectUrl
    ? created.redirectUrl
    : created.partialRedirectUrl
      ? `https://${created.partialRedirectUrl.replace(/^https?:\/\//, '')}`
      : null;

  return {
    id: created.hostedCheckoutId,
    hostedCheckoutId: created.hostedCheckoutId,
    redirectUrl,
    studio: useStudio(),
    raw: created,
  };
}

export async function getHostedCheckout(hostedCheckoutId) {
  const { merchantId } = credentials();
  return cawlRequest(
    'GET',
    `/v2/${merchantId}/hostedcheckouts/${encodeURIComponent(hostedCheckoutId)}`
  );
}

export function isCawlCheckoutPaid(checkout) {
  const status = String(
    checkout?.createdPaymentOutput?.payment?.status || checkout?.status || ''
  ).toUpperCase();
  if (['CAPTURED', 'PAID', 'PAYMENT_CREATED'].includes(status)) return true;
  const category = String(checkout?.createdPaymentOutput?.paymentStatusCategory || '').toUpperCase();
  return category === 'SUCCESSFUL';
}
