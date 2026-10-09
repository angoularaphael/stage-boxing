export const CLUBS = {
  portet: {
    id: 'portet',
    slug: 'portet',
    label: 'Boxing Center Portet-sur-Garonne',
    short: 'Portet',
    address: '61 Route d’Espagne, 31120 Portet-sur-Garonne',
    path: '/stage-enfants-portet',
    staff: [
      { name: 'Valentin', role: 'Coach' },
      { name: 'Mourad', role: 'Coach' },
      { name: 'Marama', role: 'Coach' },
      {
        name: 'Anna Boullez',
        role: 'Intervenante haut niveau',
        highlight: 'Challenger au titre de championne de France professionnelle',
      },
    ],
    payment_methods: ['cawl_card', 'paypal_once', 'paypal_4x'],
  },
  minimes: {
    id: 'minimes',
    slug: 'minimes',
    label: 'Boxing Center Minimes — Barrière de Paris',
    short: 'Minimes',
    address: '12 rue de Fenouillet, 31200 Toulouse',
    path: '/stage-enfants-minimes',
    staff: [
      { name: 'Mehdi', role: 'Coach' },
      { name: 'Fayez', role: 'Coach' },
      { name: 'Lucas', role: 'Coach' },
      {
        name: 'Johnson Suffo',
        role: 'Intervenant haut niveau',
        highlight: 'Top 100 mondial poids moyens',
      },
    ],
    payment_methods: ['payplug_card', 'paypal_once', 'paypal_4x', 'scalapay'],
  },
};

export function getClub(id) {
  const key = String(id || '')
    .trim()
    .toLowerCase();
  return CLUBS[key] || null;
}

export function allowedPaymentMethods(clubId) {
  const club = getClub(clubId);
  return club ? [...club.payment_methods] : [];
}

export function isMethodAllowed(clubId, method) {
  return allowedPaymentMethods(clubId).includes(String(method || '').trim());
}
