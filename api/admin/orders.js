import '../../lib/load-env.js';
import { json, methodOf, queryFromUrl } from '../../lib/http.js';
import { listOrders } from '../../lib/orders.js';

function authorized(req) {
  const token = process.env.ADMIN_TOKEN || '';
  if (!token) return false;
  const header = String(req.headers.authorization || '');
  if (header === `Bearer ${token}`) return true;
  const q = queryFromUrl(req);
  return q.token === token;
}

function toCsv(rows) {
  const cols = [
    'id',
    'status',
    'club',
    'is_member',
    'amount_cents',
    'parent_email',
    'parent_phone',
    'child_first_name',
    'child_last_name',
    'child_birthdate',
    'practice_years',
    'paid_at',
    'created_at',
  ];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.join(',')];
  for (const o of rows) {
    lines.push(
      [
        o.id,
        o.status,
        o.club,
        o.is_member,
        o.amount_cents,
        o.parent?.email,
        o.parent?.phone,
        o.child?.first_name,
        o.child?.last_name,
        o.child?.birthdate,
        o.child?.practice_years,
        o.payment?.paid_at,
        o.created_at,
      ]
        .map(escape)
        .join(',')
    );
  }
  return lines.join('\n');
}

export default async function handler(req, res) {
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'Non autorise' });
  if (methodOf(req) !== 'GET') return json(res, 405, { ok: false });
  const q = queryFromUrl(req);
  const orders = await listOrders({ club: q.club || null, limit: 500 });
  if (q.format === 'csv') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="stages-inscrits.csv"');
    res.end(toCsv(orders));
    return;
  }
  return json(res, 200, { ok: true, orders });
}
