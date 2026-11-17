/**
 * Verification d'un paiement prestataire contre la commande stockee.
 *
 * Regle : l'identifiant de paiement vient UNIQUEMENT de la commande en base
 * (order.payment.provider_id), jamais du navigateur. Le paiement relu chez le
 * prestataire doit en plus porter l'id de commande, le montant et la devise
 * attendus. Sinon un paiement paye pour une autre commande (ou un autre montant)
 * pourrait valider celle-ci.
 */

function cents(value) {
  const n = Math.round(Number(value) * 100);
  return Number.isFinite(n) ? n : NaN;
}

function sameCurrency(a, b = 'EUR') {
  return String(a || '').toUpperCase() === String(b || 'EUR').toUpperCase();
}

export function cawlMerchantReference(id) {
  return String(id || '')
    .replace(/[^0-9A-Za-z_-]/g, '')
    .slice(0, 30);
}

export function payplugMatchesOrder(payment, order) {
  if (!payment || !order) return false;
  if (String(payment.id || '') !== String(order.payment?.provider_id || '')) return false;
  if (String(payment.metadata?.order_id || '') !== String(order.id)) return false;
  if (Number(payment.amount) !== Number(order.amount_cents)) return false;
  return sameCurrency(payment.currency, order.currency);
}

export function paypalMatchesOrder(ppOrder, order) {
  if (!ppOrder || !order) return false;
  if (String(ppOrder.id || '') !== String(order.payment?.provider_id || '')) return false;
  const units = Array.isArray(ppOrder.purchase_units) ? ppOrder.purchase_units : [];
  if (units.length !== 1) return false;
  const unit = units[0];
  const ref = String(unit.custom_id || unit.reference_id || '');
  if (ref !== String(order.id)) return false;
  const captures = unit.payments?.captures || [];
  const completed = captures.filter((c) => String(c.status || '').toUpperCase() === 'COMPLETED');
  if (completed.length) {
    return completed.some(
      (c) =>
        cents(c.amount?.value) === Number(order.amount_cents) &&
        sameCurrency(c.amount?.currency_code, order.currency) &&
        (!c.custom_id || String(c.custom_id) === String(order.id))
    );
  }
  return (
    cents(unit.amount?.value) === Number(order.amount_cents) &&
    sameCurrency(unit.amount?.currency_code, order.currency)
  );
}

export function cawlMatchesOrder(checkout, order) {
  if (!checkout || !order) return false;
  const payment = checkout.createdPaymentOutput?.payment || {};
  const out = payment.paymentOutput || {};
  const money = out.amountOfMoney || {};
  const ref = String(out.references?.merchantReference || '');
  // Le hostedCheckoutId vient deja de la commande stockee ; la reference est
  // controlee quand CAWL la renvoie (absente sur certaines reponses preprod).
  if (ref && ref !== cawlMerchantReference(order.id)) return false;
  if (Number(money.amount) !== Number(order.amount_cents)) return false;
  return sameCurrency(money.currencyCode, order.currency);
}

/**
 * Relit le paiement chez le prestataire avec l'id stocke et dit s'il est paye
 * ET rattache a cette commande.
 * deps : { payplug: { retrieve, isPaid }, paypal: { capture, isPaid }, cawl: { get, isPaid } }
 */
export async function verifyOrderPayment(order, deps) {
  const provider = order?.payment?.provider;
  const providerId = order?.payment?.provider_id;
  if (!provider || !providerId) return { paid: false, reason: 'no_provider_id' };

  if (provider === 'payplug') {
    const payment = await deps.payplug.retrieve(providerId);
    if (!payplugMatchesOrder(payment, order)) return { paid: false, reason: 'mismatch' };
    return { paid: deps.payplug.isPaid(payment), providerId };
  }
  if (provider === 'paypal') {
    const captured = await deps.paypal.capture(providerId, order);
    if (!paypalMatchesOrder(captured, order)) return { paid: false, reason: 'mismatch' };
    return { paid: deps.paypal.isPaid(captured), providerId };
  }
  if (provider === 'cawl') {
    const checkout = await deps.cawl.get(providerId);
    if (!cawlMatchesOrder(checkout, order)) return { paid: false, reason: 'mismatch' };
    return { paid: deps.cawl.isPaid(checkout), providerId };
  }
  return { paid: false, reason: 'unknown_provider' };
}
