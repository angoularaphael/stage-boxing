import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import './load-env.js';

const COOKIE = 'bc_admin_session';
const MAX_AGE_SEC = 60 * 60 * 24 * 7;
const INSECURE = new Set(['', 'change-me', 'change-me-in-production']);

let devFallback = '';

function configuredSecret(...candidates) {
  for (const raw of candidates) {
    const value = String(raw || '').trim();
    if (value && !INSECURE.has(value)) return value;
  }
  return '';
}

export function sessionSecret() {
  const fromEnv = configuredSecret(
    process.env.SESSION_SECRET,
    process.env.SITE_API_SECRET,
    process.env.ADMIN_SECRET,
    process.env.ADMIN_TOKEN
  );
  if (fromEnv) return fromEnv;
  const onVercel = String(process.env.VERCEL || '') === '1';
  if (onVercel || process.env.NODE_ENV === 'production') return '';
  if (!devFallback) devFallback = randomBytes(32).toString('hex');
  return devFallback;
}

function base64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function hmacEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function signJwt(payload) {
  const secret = sessionSecret();
  if (!secret) throw new Error('session_secret_missing');
  const header = base64urlJson({ alg: 'HS256', typ: 'JWT' });
  const body = base64urlJson(payload);
  const data = `${header}.${body}`;
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyJwt(token) {
  const secret = sessionSecret();
  if (!secret) throw new Error('session_secret_missing');
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('invalid token');
  const data = `${parts[0]}.${parts[1]}`;
  const expected = createHmac('sha256', secret).update(data).digest('base64url');
  if (!hmacEqual(parts[2], expected)) throw new Error('invalid signature');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('expired');
  }
  return payload;
}

function parseCookie(req, name) {
  const raw = req?.headers?.cookie || '';
  const match = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function cookieSecure() {
  return process.env.NODE_ENV === 'production' || String(process.env.VERCEL || '') === '1';
}

export async function setAdminSessionCookie(res, user) {
  const token = signJwt({
    email: user.email,
    role: user.role,
    name: user.name || '',
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

export async function getAdminSession(req) {
  const token = parseCookie(req, COOKIE);
  if (!token) return null;
  try {
    const payload = verifyJwt(token);
    return { email: payload.email, role: payload.role, name: payload.name };
  } catch {
    return null;
  }
}

export function clearAdminSessionCookie(res) {
  const parts = [`${COOKIE}=`, 'Path=/', 'HttpOnly', 'Max-Age=0', 'SameSite=Lax'];
  if (cookieSecure()) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export { COOKIE as ADMIN_SESSION_COOKIE };
