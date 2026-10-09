import '../../lib/load-env.js';
import { publicUrl } from '../../lib/config.js';
import { json, methodOf, readBody } from '../../lib/http.js';
import { sendPaymentReceived } from '../../lib/mail.js';
import { getOrder, markPaid, saveOrder } from '../../lib/orders.js';
import { isPayplugPaymentPaid, retrievePayment } from '../../lib/payplug.js';

export default async function handler(req, res) {
  if (methodOf(req) !== 'POST') return json(res, 405, { ok: false });
  try {
    const body = await readBody(req);
    const paymentId = body?.id || body?.payment_id || body?.resource?.id;
    if (!paymentId) return json(res, 200, { ok: true, ignored: true });
    const payment = await retrievePayment(paymentId);
    if (!isPayplugPaymentPaid(payment)) return json(res, 200, { ok: true, pending: true });
    const orderId = payment.metadata?.order_id;
    const order = await getOrder(orderId);
    if (!order) return json(res, 200, { ok: true, unknown_order: true });
    if (order.payment?.status === 'paid') return json(res, 200, { ok: true, already: true });
    markPaid(order, {
      method: order.payment?.method || (payment.payment_method?.type === 'scalapay' ? 'scalapay' : 'payplug_card'),
      provider: 'payplug',
      provider_id: paymentId,
    });
    await saveOrder(order);
    const formUrl = `${publicUrl()}/inscription?order=${order.id}&token=${order.access_token}`;
    await sendPaymentReceived(order, { formUrl }).catch(() => null);
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error('[webhook payplug]', err.message);
    return json(res, 200, { ok: false, error: err.message });
  }
}
