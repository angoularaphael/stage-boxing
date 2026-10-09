import '../../lib/load-env.js';
import { publicUrl } from '../../lib/config.js';
import { json, methodOf, readBody } from '../../lib/http.js';
import { sendPaymentReceived } from '../../lib/mail.js';
import { getOrder, listOrders, markPaid, saveOrder } from '../../lib/orders.js';

export default async function handler(req, res) {
  if (methodOf(req) !== 'POST') return json(res, 405, { ok: false });
  try {
    const body = await readBody(req);
    const event = String(body.event_type || '');
    if (!/PAYMENT.CAPTURE.COMPLETED|CHECKOUT.ORDER.APPROVED/i.test(event)) {
      return json(res, 200, { ok: true, ignored: true });
    }
    const resource = body.resource || {};
    const customId =
      resource.custom_id ||
      resource.purchase_units?.[0]?.custom_id ||
      resource.supplementary_data?.related_ids?.order_id;
    let order = customId ? await getOrder(customId) : null;
    if (!order && resource.id) {
      const all = await listOrders({ limit: 100 });
      order = all.find((o) => o.payment?.provider_id === resource.id) || null;
    }
    if (!order) return json(res, 200, { ok: true, unknown_order: true });
    if (order.payment?.status === 'paid') return json(res, 200, { ok: true, already: true });
    markPaid(order, {
      method: order.payment?.method || 'paypal_once',
      provider: 'paypal',
      provider_id: order.payment?.provider_id || resource.id,
    });
    await saveOrder(order);
    const formUrl = `${publicUrl()}/inscription?order=${order.id}&token=${order.access_token}`;
    await sendPaymentReceived(order, { formUrl }).catch(() => null);
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error('[webhook paypal]', err.message);
    return json(res, 200, { ok: false });
  }
}
