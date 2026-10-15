import '../../lib/load-env.js';
import { json, methodOf, queryFromUrl, readBody } from '../../lib/http.js';
import { buildStageInvoicePdf } from '../../lib/invoice-pdf.js';
import { deleteOrder, getOrder, listOrders } from '../../lib/orders.js';
import { adminAuthorized } from '../../lib/studio.js';

async function authorized(req) {
  return adminAuthorized(req);
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
    'notes',
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
        o.child?.notes,
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
  if (!(await authorized(req))) return json(res, 401, { ok: false, error: 'Non autorise' });
  const method = methodOf(req);
  const q = queryFromUrl(req);

  if (method === 'DELETE') {
    const body = await readBody(req).catch(() => ({}));
    const id = String(body.id || q.id || '').trim();
    if (!id) return json(res, 400, { ok: false, error: 'id manquant' });
    const existing = await getOrder(id);
    if (!existing) return json(res, 404, { ok: false, error: 'Inscription introuvable' });
    await deleteOrder(id);
    return json(res, 200, { ok: true, deleted: id });
  }

  if (method === 'GET' && q.invoice) {
    const id = String(q.invoice || q.id || '').trim();
    const order = await getOrder(id);
    if (!order) return json(res, 404, { ok: false, error: 'Inscription introuvable' });
    const inv = await buildStageInvoicePdf(order);
    if (!inv) {
      return json(res, 400, { ok: false, error: 'Facture disponible uniquement apres paiement.' });
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${inv.filename}"`);
    res.end(inv.content);
    return;
  }

  if (method !== 'GET') return json(res, 405, { ok: false });
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
