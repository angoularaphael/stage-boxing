/** Libellés parent (comme la boutique : CB, pas le nom du prestataire fractionné). */

export function paymentMethodPublicLabel(methodId, fallback = '') {
  const id = String(methodId || '').toLowerCase();
  const map = {
    cawl_card: 'Carte bancaire',
    payplug_card: 'Carte bancaire',
    paypal_once: 'PayPal',
    paypal_4x: 'PayPal en plusieurs fois',
    scalapay: 'Carte bancaire en plusieurs fois',
  };
  return map[id] || fallback || 'Carte bancaire';
}

export function paymentMethodCheckoutLabel(methodId, fallback = '') {
  const id = String(methodId || '').toLowerCase();
  if (id === 'scalapay') return 'Carte bancaire en 3x ou 4x';
  if (id === 'paypal_4x') return 'PayPal en plusieurs fois';
  if (id === 'payplug_card' || id === 'cawl_card') return 'Carte bancaire';
  if (id === 'paypal_once') return 'PayPal';
  return fallback || paymentMethodPublicLabel(id);
}

export function paymentMethodCheckoutDetail(methodId) {
  const id = String(methodId || '').toLowerCase();
  if (id === 'scalapay') return 'CB en 3x sans frais ou 4x (1,5 % de frais) — mobile 06/07 requis';
  if (id === 'paypal_4x') return 'Selon votre éligibilité chez PayPal';
  if (id === 'payplug_card' || id === 'cawl_card') return 'Paiement comptant par CB';
  if (id === 'paypal_once') return 'Paiement comptant';
  return '';
}
