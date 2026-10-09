/**
 * Tarif affiche 140 EUR par defaut.
 * Clic "Je suis adherent" : animation compteur vers 80 EUR.
 */
export function initPriceToggle({
  priceEl,
  labelEl,
  toggleEl,
  guestCents = 14000,
  memberCents = 8000,
} = {}) {
  if (!priceEl || !toggleEl) return { isMember: () => false, amountCents: () => guestCents };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let anim = null;
  let guest = guestCents;
  let member = memberCents;

  function formatEuros(cents) {
    const n = Math.round(cents / 100);
    return `${n}`;
  }

  function setLabel(isMember) {
    if (!labelEl) return;
    labelEl.textContent = isMember
      ? 'Tarif adherent Boxing Center'
      : 'Tarif non-adherent';
  }

  function paint(cents, isMember) {
    priceEl.innerHTML = `<span class="currency">EUR</span> ${formatEuros(cents)}`;
    priceEl.classList.toggle('is-member', isMember);
    setLabel(isMember);
  }

  function animateTo(from, to, isMember) {
    if (reduce || from === to) {
      paint(to, isMember);
      return;
    }
    if (anim) cancelAnimationFrame(anim);
    const start = performance.now();
    const duration = 700;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(from + (to - from) * eased);
      paint(value, isMember);
      if (t < 1) anim = requestAnimationFrame(tick);
    };
    anim = requestAnimationFrame(tick);
  }

  function sync(animate = true) {
    const isMember = Boolean(toggleEl.checked);
    const to = isMember ? member : guest;
    if (!animate) {
      paint(to, isMember);
      return;
    }
    const from = isMember ? guest : member;
    animateTo(from, to, isMember);
  }

  paint(guest, false);

  if (!toggleEl.dataset.priceBound) {
    toggleEl.dataset.priceBound = '1';
    toggleEl.addEventListener('change', () => sync(true));
  }

  return {
    isMember: () => Boolean(toggleEl.checked),
    amountCents: () => (toggleEl.checked ? member : guest),
    setPrices(nextGuest, nextMember) {
      guest = nextGuest;
      member = nextMember;
      sync(false);
    },
  };
}
