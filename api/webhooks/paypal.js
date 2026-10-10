import '../../lib/load-env.js';
import { publicUrl } from '../../lib/config.js';
import { json, methodOf, readBody } from '../../lib/http.js';
import { sendPaymentReceived } from '../../lib/mail.js';
import { getOrder, listOrders, markPaid, saveOrder } from '../../lib/orders.js';
import { getPaypalOrder, isPaypalOrderPaid, verifyPaypalWebhook } from '../../lib/paypal.js';

export default async function handler(req, res) {
  if (methodOf(req) !== 'POST') return json(res, 405, { ok: false });
  try {
    const body = await readBody(req);
    const verified = await verifyPaypalWebhook(req.headers || {}, body);
    if (!verified.ok) {
      console.error('[webhook paypal] signature', verified.reason || verified.status);
      return json(res, 401, { ok: false, error: 'signature' });
    }

    const event = String(body.event_type || '');
    // Jamais markPaid sur APPROVED (pas encore capture)
    if (!/PAYMENT\.CAPTURE\.COMPLETED/i.test(event)) {
      return json(res, 200, { ok: true, ignored: true });
    }

    const resource = body.resource || {};
    const customId =
      resource.custom_id ||
      resource.purchase_units?.[0]?.custom_id ||
      resource.supplementary_data?.related_ids?.order_id;
    let order = customId ? await getOrder(customId) : null;
    if (!order && resource.supplementary_data?.related_ids?.order_id) {
      const paypalOrderId = resource.supplementary_data.related_ids.order_id;
      const all = await listOrders({ limit: 200 });
      order = all.find((o) => o.payment?.provider_id === paypalOrderId) || null;
    }
    if (!order) return json(res, 200, { ok: true, unknown_order: true });
    if (order.payment?.status === 'paid') return json(res, 200, { ok: true, already: true });

    // Confirmer cote API PayPal (ne pas faire confiance au seul body)
    const paypalOrderId = order.payment?.provider_id;
    if (paypalOrderId) {
      const remote = await getPaypalOrder(paypalOrderId, { gym: order.club });
      if (!isPaypalOrderPaid(remote)) {
        return json(res, 200, { ok: true, pending: true });
      }
    }

    markPaid(order, {
      method: order.payment?.method || 'paypal_once',
      provider: 'paypal',
      provider_id: order.payment?.provider_id || resource.supplementary_data?.related_ids?.order_id,
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
