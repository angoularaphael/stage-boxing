import '../../lib/load-env.js';
import { verifyAdminLogin } from '../../lib/admin-auth.js';
import { sessionSecret, setAdminSessionCookie } from '../../lib/admin-session.js';
import { json, methodOf, readBody } from '../../lib/http.js';

const fails = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;

function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || req.socket?.remoteAddress || 'unknown';
}

function loginLocked(req) {
  const key = clientIp(req);
  const row = fails.get(key);
  if (!row) return false;
  if (Date.now() - row.t0 > WINDOW_MS) {
    fails.delete(key);
    return false;
  }
  return row.n >= MAX_FAILS;
}

function recordFail(req) {
  const key = clientIp(req);
  const row = fails.get(key);
  if (!row || Date.now() - row.t0 > WINDOW_MS) {
    fails.set(key, { n: 1, t0: Date.now() });
    return;
  }
  row.n += 1;
}

function clearFails(req) {
  fails.delete(clientIp(req));
}

export default async function handler(req, res) {
  if (methodOf(req) !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  if (!sessionSecret()) {
    return json(res, 503, { ok: false, error: 'SESSION_SECRET manquant (meme secret que BOXPLUS).' });
  }
  if (loginLocked(req)) {
    return json(res, 429, { ok: false, error: 'Trop d essais. Reessayez plus tard.' });
  }
  try {
    const body = await readBody(req);
    const user = await verifyAdminLogin(body.email, body.password);
    if (!user) {
      recordFail(req);
      return json(res, 401, { ok: false, error: 'Email ou mot de passe incorrect' });
    }
    clearFails(req);
    await setAdminSessionCookie(res, user);
    return json(res, 200, {
      ok: true,
      user: { email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('[auth/login]', err.message);
    return json(res, 500, { ok: false, error: err.message || 'Erreur connexion' });
  }
}
