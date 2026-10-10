import '../../lib/load-env.js';
import { publicUrl } from '../../lib/config.js';
import { getHostedCheckout, isCawlCheckoutPaid } from '../../lib/cawl.js';
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

    const providerId = order.payment?.provider_id || hostedId;
    if (!providerId) return json(res, 200, { ok: true, pending: true });

    // Ne pas faire confiance au body : relire l'etat chez CAWL
    const checkout = await getHostedCheckout(providerId);
    if (!isCawlCheckoutPaid(checkout)) {
      return json(res, 200, { ok: true, pending: true });
    }

    markPaid(order, {
      method: 'cawl_card',
      provider: 'cawl',
      provider_id: providerId,
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
