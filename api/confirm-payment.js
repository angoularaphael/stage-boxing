import '../lib/load-env.js';
import { publicUrl } from '../lib/config.js';
import { isCawlCheckoutPaid, getHostedCheckout } from '../lib/cawl.js';
import { json, methodOf, readBody } from '../lib/http.js';
import { sendPaymentReceived } from '../lib/mail.js';
import {
  getOrderByToken,
  markPaid,
  publicOrderView,
  saveOrder,
} from '../lib/orders.js';
import { isPayplugPaymentPaid, retrievePayment } from '../lib/payplug.js';
import { capturePaypalOrder, isPaypalOrderPaid } from '../lib/paypal.js';
import { withStudioContext } from '../lib/studio.js';

export default async function handler(req, res) {
  return withStudioContext(req, async () => {
  if (methodOf(req) !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }
  try {
    const body = await readBody(req);
    const order = await getOrderByToken(body.order_id, body.token);
    if (!order) return json(res, 404, { ok: false, error: 'Commande introuvable.' });

    if (order.payment?.status === 'paid') {
      return json(res, 200, { ok: true, order: publicOrderView(order), already: true });
    }

    const provider = order.payment?.provider;
    const providerId = body.provider_id || order.payment?.provider_id;
    let paid = false;

    if (provider === 'paypal' && providerId) {
      const captured = await capturePaypalOrder(providerId, { gym: order.club });
      paid = isPaypalOrderPaid(captured);
    } else if (provider === 'payplug' && providerId) {
      const payment = await retrievePayment(providerId);
      paid = isPayplugPaymentPaid(payment);
    } else if (provider === 'cawl' && providerId) {
      const checkout = await getHostedCheckout(providerId);
      paid = isCawlCheckoutPaid(checkout);
    }

    if (!paid) {
      return json(res, 402, { ok: false, error: 'Paiement non confirme pour le moment.' });
    }

    markPaid(order, {
      method: order.payment?.method,
      provider,
      provider_id: providerId,
    });
    await saveOrder(order);

    const formUrl = `${publicUrl()}/inscription?order=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.access_token)}`;
    await sendPaymentReceived(order, { formUrl }).catch((err) => console.error('[mail]', err.message));

    return json(res, 200, { ok: true, order: publicOrderView(order) });
  } catch (err) {
    return json(res, 500, { ok: false, error: err.message || 'Erreur confirmation' });
  }
  });
}
