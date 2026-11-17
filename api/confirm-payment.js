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
import { ensurePaypalCaptured, isPaypalOrderPaid } from '../lib/paypal.js';
import { withStudioContext } from '../lib/studio.js';
import { verifyOrderPayment } from '../lib/payment-verify.js';

const PAYMENT_DEPS = {
  payplug: { retrieve: retrievePayment, isPaid: isPayplugPaymentPaid },
  paypal: {
    capture: (id, order) => ensurePaypalCaptured(id, { gym: order.club }),
    isPaid: isPaypalOrderPaid,
  },
  cawl: { get: getHostedCheckout, isPaid: isCawlCheckoutPaid },
};

export default async function handler(req, res) {
  return withStudioContext(req, async () => {
    if (methodOf(req) !== 'POST') {
      return json(res, 405, { ok: false, error: 'Method not allowed' });
    }
    let orderId = '';
    let accessToken = '';
    try {
      const body = await readBody(req);
      orderId = body.order_id;
      accessToken = body.token;
      const order = await getOrderByToken(orderId, accessToken);
      if (!order) return json(res, 404, { ok: false, error: 'Commande introuvable.' });

      if (order.payment?.status === 'paid') {
        return json(res, 200, { ok: true, order: publicOrderView(order), already: true });
      }

      if (order.payment?.status === 'confirming') {
        const fresh = await getOrderByToken(orderId, accessToken);
        if (fresh?.payment?.status === 'paid') {
          return json(res, 200, { ok: true, order: publicOrderView(fresh), already: true });
        }
      }

      const provider = order.payment?.provider;
      // Jamais l'id envoye par le navigateur : seul l'id stocke a la creation du paiement compte.
      const providerId = order.payment?.provider_id;

      order.payment = { ...(order.payment || {}), status: 'confirming' };
      await saveOrder(order);

      const check = await verifyOrderPayment(order, PAYMENT_DEPS);
      const paid = check.paid === true;
      if (check.reason === 'mismatch') {
        console.error('[confirm-payment] paiement non rattache a la commande', order.id, provider);
      }

      if (!paid) {
        order.payment = { ...(order.payment || {}), status: 'pending' };
        await saveOrder(order);
        return json(res, 402, { ok: false, error: 'Paiement non confirme pour le moment.' });
      }

      const latest = await getOrderByToken(orderId, accessToken);
      if (latest?.payment?.status === 'paid') {
        return json(res, 200, { ok: true, order: publicOrderView(latest), already: true });
      }

      const target = latest || order;
      markPaid(target, {
        method: target.payment?.method,
        provider,
        provider_id: providerId,
      });
      await saveOrder(target);

      const formUrl = `${publicUrl()}/inscription?order=${encodeURIComponent(target.id)}&token=${encodeURIComponent(target.access_token)}`;
      await sendPaymentReceived(target, { formUrl }).catch((err) =>
        console.error('[mail]', err.message)
      );

      return json(res, 200, { ok: true, order: publicOrderView(target) });
    } catch (err) {
      try {
        if (orderId && accessToken) {
          const stuck = await getOrderByToken(orderId, accessToken);
          if (stuck?.payment?.status === 'confirming') {
            stuck.payment = { ...(stuck.payment || {}), status: 'pending' };
            await saveOrder(stuck);
          }
        }
      } catch {
        /* ignore unlock */
      }
      return json(res, 500, { ok: false, error: err.message || 'Erreur confirmation' });
    }
  });
}
