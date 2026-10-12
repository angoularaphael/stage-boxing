import '../../lib/load-env.js';
import { clearAdminSessionCookie } from '../../lib/admin-session.js';
import { json, methodOf } from '../../lib/http.js';

export default async function handler(req, res) {
  if (methodOf(req) !== 'POST' && methodOf(req) !== 'GET') {
    return json(res, 405, { ok: false });
  }
  clearAdminSessionCookie(res);
  return json(res, 200, { ok: true });
}
