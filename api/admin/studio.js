import '../../lib/load-env.js';
import { json, methodOf, readBody } from '../../lib/http.js';
import {
  adminAuthorized,
  clearStudioCookie,
  isStudioRequest,
  setStudioCookie,
  studioStatus,
  withStudioContext,
} from '../../lib/studio.js';

export default async function handler(req, res) {
  const method = methodOf(req);
  const body = method === 'POST' || method === 'DELETE' ? await readBody(req) : {};
  if (!(await adminAuthorized(req, body.token))) {
    return json(res, 401, { ok: false, error: 'Non autorise' });
  }

  if (method === 'GET') {
    return withStudioContext(req, () => {
      return json(res, 200, {
        ok: true,
        studio: { ...studioStatus(), active: isStudioRequest(req) },
      });
    });
  }

  if (method === 'POST') {
    setStudioCookie(res);
    return json(res, 200, {
      ok: true,
      studio: { active: true, message: 'Studio active : paiements en cles TEST / sandbox.' },
    });
  }

  if (method === 'DELETE') {
    clearStudioCookie(res);
    return json(res, 200, {
      ok: true,
      studio: { active: false, message: 'Studio desactive : paiements live.' },
    });
  }

  return json(res, 405, { ok: false, error: 'Method not allowed' });
}
