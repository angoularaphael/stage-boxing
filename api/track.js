import '../lib/load-env.js';
import { json, methodOf, readBody } from '../lib/http.js';
import { resolveAttributionFromVisit } from '../lib/attribution.js';
import { randomUUID } from 'node:crypto';

async function supabaseInsert(row) {
  const base = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return { ok: false, error: 'no_supabase' };
  const res = await fetch(`${base}/rest/v1/stage_visits`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, error: `http_${res.status}`, detail: text.slice(0, 120) };
  }
  return { ok: true };
}

export default async function handler(req, res) {
  if (methodOf(req) !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }
  const body = await readBody(req);
  const src = resolveAttributionFromVisit({
    src: body.src || body.utm_source,
    path: body.path,
    search: body.search,
  });
  const row = {
    id: `pv-${Date.now()}-${randomUUID().slice(0, 8)}`,
    status: 'pageview',
    src,
    path: String(body.path || '/').slice(0, 200),
  };
  const ins = await supabaseInsert(row);
  return json(res, ins.ok ? 200 : 503, { ok: ins.ok, src, ...(ins.ok ? {} : { error: ins.error }) });
}
