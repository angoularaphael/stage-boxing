import { initPriceToggle } from './price-toggle.js';

export function bootClubPage() {
  const club = document.documentElement.dataset.club;
  const priceEl = document.querySelector('#price-value');
  const labelEl = document.querySelector('#price-label');
  const toggleEl = document.querySelector('#is-member');
  const cta = document.querySelector('#cta-inscrire');

  const price = initPriceToggle({
    priceEl,
    labelEl,
    toggleEl,
    guestCents: 14000,
    memberCents: 8000,
  });

  function syncCta() {
    if (!cta || !club) return;
    const member = price.isMember() ? '1' : '0';
    cta.href = `/inscription?club=${encodeURIComponent(club)}&member=${member}`;
  }

  toggleEl?.addEventListener('change', syncCta);
  syncCta();
}

if (document.documentElement.dataset.page === 'club') {
  bootClubPage();
}
