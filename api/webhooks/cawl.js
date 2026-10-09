import '../../lib/load-env.js';
import { publicUrl } from '../../lib/config.js';
import { json, methodOf, readBody } from '../../lib/http.js';
import { sendPaymentReceived } from '../../lib/mail.js';
import { getOrder, listOrders, markPaid, saveOrder } from '../../lib/orders.js';

export default async function handler(req, res) {
  if (methodOf(req) !== 'POST') return json(res, 405, { ok: false });
  try {
    const body = await readBody(req);
    const merchantRef =
      body?.payment?.paymentOutput?.references?.merchantReference ||
      body?.createdPaymentOutput?.payment?.paymentOutput?.references?.merchantReference ||
      body?.merchantReference ||
      '';
    const hostedId = body?.hostedCheckoutId || body?.id || '';
    let order = merchantRef ? await getOrder(merchantRef) : null;
    if (!order && hostedId) {
      const all = await listOrders({ club: 'portet', limit: 100 });
      order = all.find((o) => o.payment?.provider_id === hostedId) || null;
    }
    if (!order) return json(res, 200, { ok: true, unknown_order: true });
    if (order.payment?.status === 'paid') return json(res, 200, { ok: true, already: true });

    const status = String(
      body?.payment?.status || body?.createdPaymentOutput?.payment?.status || body?.status || ''
    ).toUpperCase();
    const ok =
      ['CAPTURED', 'PAID', 'PAYMENT_CREATED'].includes(status) ||
      String(body?.paymentStatusCategory || '').toUpperCase() === 'SUCCESSFUL';
    if (!ok) return json(res, 200, { ok: true, pending: true });

    markPaid(order, {
      method: 'cawl_card',
      provider: 'cawl',
      provider_id: order.payment?.provider_id || hostedId,
    });
    await saveOrder(order);
    const formUrl = `${publicUrl()}/inscription?order=${order.id}&token=${order.access_token}`;
    await sendPaymentReceived(order, { formUrl }).catch(() => null);
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error('[webhook cawl]', err.message);
    return json(res, 200, { ok: false });
  }
}
