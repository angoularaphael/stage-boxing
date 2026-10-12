import '../../lib/load-env.js';
import { getAdminSession } from '../../lib/admin-session.js';
import { json, methodOf } from '../../lib/http.js';

export default async function handler(req, res) {
  if (methodOf(req) !== 'GET') return json(res, 405, { ok: false });
  const session = await getAdminSession(req);
  if (!session) return json(res, 401, { ok: false, error: 'unauthorized' });
  return json(res, 200, { ok: true, user: session });
}
