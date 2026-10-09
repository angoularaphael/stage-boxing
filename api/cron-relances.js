import '../lib/load-env.js';
import { publicUrl } from '../lib/config.js';
import { json, methodOf, queryFromUrl } from '../lib/http.js';
import { sendFormReminder } from '../lib/mail.js';
import { listOrders, saveOrder } from '../lib/orders.js';

export default async function handler(req, res) {
  const q = queryFromUrl(req);
  const auth = String(req.headers.authorization || '');
  const cronOk =
    auth === `Bearer ${process.env.CRON_SECRET}` ||
    q.secret === process.env.CRON_SECRET ||
    req.headers['x-vercel-cron'] === '1';
  if (!cronOk) return json(res, 401, { ok: false });
  if (methodOf(req) !== 'GET' && methodOf(req) !== 'POST') {
    return json(res, 405, { ok: false });
  }

  const orders = await listOrders({ limit: 500 });
  const now = Date.now();
  let sent = 0;
  for (const order of orders) {
    if (order.status !== 'form_pending' || order.payment?.status !== 'paid') continue;
    if ((order.reminders_sent || 0) >= 3) continue;
    const last = order.last_reminder_at ? Date.parse(order.last_reminder_at) : 0;
    if (last && now - last < 24 * 3600 * 1000) continue;
    const formUrl = `${publicUrl()}/inscription?order=${order.id}&token=${order.access_token}`;
    await sendFormReminder(order, { formUrl });
    order.reminders_sent = (order.reminders_sent || 0) + 1;
    order.last_reminder_at = new Date().toISOString();
    await saveOrder(order);
    sent += 1;
  }
  return json(res, 200, { ok: true, sent });
}
