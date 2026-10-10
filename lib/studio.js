import { createHmac, timingSafeEqual } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import './load-env.js';

const COOKIE = 'stg_studio';
const MAX_AGE_SEC = 60 * 60 * 12;
const als = new AsyncLocalStorage();

const ENV_ALIAS = {
  PAYPAL_MODE: 'PAYPAL_TEST_MODE',
  PAYPAL_CLIENT_ID: 'PAYPAL_TEST_CLIENT_ID',
  PAYPAL_CLIENT_SECRET: 'PAYPAL_TEST_CLIENT_SECRET',
  PAYPAL_PORTET_CLIENT_ID: 'PAYPAL_TEST_PORTET_CLIENT_ID',
  PAYPAL_PORTET_CLIENT_SECRET: 'PAYPAL_TEST_PORTET_CLIENT_SECRET',
  PAYPLUG_SECRET_KEY: 'PAYPLUG_TEST_SECRET_KEY',
  CAWL_MODE: 'CAWL_TEST_MODE',
  CAWL_MERCHANT_ID: 'CAWL_TEST_MERCHANT_ID',
  CAWL_API_KEY_ID: 'CAWL_TEST_API_KEY_ID',
  CAWL_API_SECRET: 'CAWL_TEST_API_SECRET',
};

function cookieSecret() {
  return String(process.env.ADMIN_TOKEN || process.env.STUDIO_COOKIE_SECRET || '').trim();
}

function parseCookie(req, name) {
  const raw = req?.headers?.cookie || '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function cookieSecure() {
  return process.env.NODE_ENV === 'production' || String(process.env.VERCEL || '') === '1';
}

function sign(payload) {
  const secret = cookieSecret();
  if (!secret) throw new Error('ADMIN_TOKEN manquant pour le cookie studio');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verify(token) {
  const secret = cookieSecret();
  if (!secret || !token) return null;
  const parts = String(token).split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.k !== 'studio') return null;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isStudioRequest(req) {
  return Boolean(verify(parseCookie(req, COOKIE)));
}

export function useStudio() {
  return Boolean(als.getStore()?.studio);
}

export function withStudioContext(req, fn) {
  return als.run({ studio: isStudioRequest(req) }, fn);
}

export function setStudioCookie(res) {
  const token = sign({
    k: 'studio',
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC,
  });
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_SEC}`,
  ];
  if (cookieSecure()) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearStudioCookie(res) {
  const parts = [`${COOKIE}=`, 'Path=/', 'HttpOnly', 'Max-Age=0', 'SameSite=Lax'];
  if (cookieSecure()) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function paymentVar(key) {
  if (useStudio()) {
    const alias = ENV_ALIAS[key];
    if (alias && process.env[alias]) return String(process.env[alias]).trim();
    if (key === 'PAYPAL_MODE') return 'sandbox';
    if (key === 'CAWL_MODE') return 'test';
    // Ne jamais envoyer les cles live vers le mode studio
    if (String(key).startsWith('CAWL_')) return '';
    if (key === 'PAYPLUG_SECRET_KEY') return '';
  }
  return String(process.env[key] || '').trim();
}

export function studioStatus() {
  const active = useStudio();
  return {
    active,
    cookie: COOKIE,
    configured: Boolean(
      process.env.PAYPAL_TEST_CLIENT_ID ||
        process.env.PAYPLUG_TEST_SECRET_KEY ||
        process.env.CAWL_TEST_MERCHANT_ID
    ),
    has_paypal_test: Boolean(process.env.PAYPAL_TEST_CLIENT_ID && process.env.PAYPAL_TEST_CLIENT_SECRET),
    has_paypal_portet_test: Boolean(
      process.env.PAYPAL_TEST_PORTET_CLIENT_ID && process.env.PAYPAL_TEST_PORTET_CLIENT_SECRET
    ),
    has_payplug_test: Boolean(process.env.PAYPLUG_TEST_SECRET_KEY),
    has_cawl_test: Boolean(
      process.env.CAWL_TEST_MERCHANT_ID &&
        process.env.CAWL_TEST_API_KEY_ID &&
        process.env.CAWL_TEST_API_SECRET
    ),
  };
}

export function adminAuthorized(req, tokenFromBody = '') {
  const expected = String(process.env.ADMIN_TOKEN || '').trim();
  if (!expected) return false;
  const header = String(req.headers?.authorization || '');
  if (header === `Bearer ${expected}`) return true;
  if (String(tokenFromBody || '').trim() === expected) return true;
  return false;
}
