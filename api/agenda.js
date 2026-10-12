/**
 * GET /api/agenda?order=…&token=… — fichier .ics des 12 seances (lien depuis le mail).
 */
import '../lib/load-env.js';
import { buildStageAgendaIcs } from '../lib/agenda-ics.js';
import { methodOf, queryFromUrl } from '../lib/http.js';
import { getOrderByToken } from '../lib/orders.js';

export default async function handler(req, res) {
  if (methodOf(req) !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end('Method not allowed');
    return;
  }

  const q = queryFromUrl(req);
  const order = await getOrderByToken(q.order || q.id, q.token);
  if (!order) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Commande introuvable.');
    return;
  }
  if (order.payment?.status !== 'paid' && order.status !== 'complete') {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Paiement requis.');
    return;
  }

  const ics = buildStageAgendaIcs(order);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${ics.filename}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.end(ics.text);
}
