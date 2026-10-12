/** En-tête, menu, barre collée, allumage des projecteurs, lumière qui suit le pointeur. */

export const reduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const survol = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function enTete() {
  const hd = document.querySelector('[data-hd]');
  if (!hd) return;
  let dernier = window.scrollY;
  let prevu = false;
  const maj = () => {
    prevu = false;
    const y = window.scrollY;
    hd.classList.toggle('is-plein', y > 12);
    const descend = y > dernier && y > window.innerHeight * 0.9;
    hd.classList.toggle('is-cache', descend && !document.querySelector('.tiroir.is-ouvert'));
    dernier = y;
  };
  window.addEventListener('scroll', () => {
    if (!prevu) {
      prevu = true;
      requestAnimationFrame(maj);
    }
  }, { passive: true });
  maj();
}

export function menu() {
  const bouton = document.querySelector('[data-menu]');
  const tiroir = document.querySelector('[data-tiroir]');
  if (!bouton || !tiroir) return;
  const fermer = tiroir.querySelector('[data-fermer]');
  const ouvrir = (oui) => {
    if (oui) tiroir.hidden = false;
    requestAnimationFrame(() => tiroir.classList.toggle('is-ouvert', oui));
    bouton.setAttribute('aria-expanded', String(oui));
    document.body.style.overflow = oui ? 'hidden' : '';
    if (oui) setTimeout(() => fermer?.focus(), 60);
    else {
      bouton.focus();
      setTimeout(() => { if (!tiroir.classList.contains('is-ouvert')) tiroir.hidden = true; }, 400);
    }
  };
  bouton.addEventListener('click', () => ouvrir(true));
  fermer?.addEventListener('click', () => ouvrir(false));
  tiroir.addEventListener('click', (e) => {
    if (e.target.closest('a')) ouvrir(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tiroir.classList.contains('is-ouvert')) ouvrir(false);
  });
}

/** La barre d'inscription apparaît une fois le héros passé, et s'efface sur l'appel final. */
export function barre() {
  const b = document.querySelector('[data-barre]');
  if (!b) return;
  const hero = document.querySelector('[data-fo], [data-hero]');
  const final = document.querySelector('.final');
  const pied = document.querySelector('.pied');
  let prevu = false;
  const maj = () => {
    prevu = false;
    const vh = window.innerHeight;
    const passe = hero ? hero.getBoundingClientRect().bottom < vh * 0.35 : window.scrollY > vh;
    const fin = [final, pied].some((el) => el && el.getBoundingClientRect().top < vh * 0.85);
    const visible = passe && !fin;
    b.classList.toggle('is-visible', visible);
    b.setAttribute('aria-hidden', String(!visible));
    b.querySelectorAll('a, button').forEach((el) => el.setAttribute('tabindex', visible ? '0' : '-1'));
  };
  window.addEventListener('scroll', () => {
    if (!prevu) {
      prevu = true;
      requestAnimationFrame(maj);
    }
  }, { passive: true });
  window.addEventListener('resize', maj, { passive: true });
  maj();
}

/** Les projecteurs s'allument quand la photo du héros est prête (jamais sur un écran vide). */
export function allumage() {
  const scenes = document.querySelectorAll('[data-fo], [data-hero]');
  scenes.forEach((scene) => {
    const imgs = [...scene.querySelectorAll('img')];
    const pret = () => scene.classList.add('is-pret');
    if (reduit()) return pret();
    const attente = imgs.map((img) => (img.complete ? Promise.resolve() : img.decode ? img.decode().catch(() => {}) : Promise.resolve()));
    Promise.race([Promise.all(attente), new Promise((r) => setTimeout(r, 900))]).then(() => requestAnimationFrame(pret));
  });
}

/** Une lumière douce suit le pointeur sur chaque moitié du face-à-face. */
export function suivi() {
  if (!survol() || reduit()) return;
  document.querySelectorAll('[data-suivi]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    });
  });
}

/** Le reflet des boutons suit le pointeur. */
export function magnetique() {
  if (!survol()) return;
  document.addEventListener('pointermove', (e) => {
    const b = e.target.closest?.('.btn');
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--bx', `${e.clientX - r.left}px`);
    b.style.setProperty('--by', `${e.clientY - r.top}px`);
  }, { passive: true });
}

/** Petit utilitaire de stockage : le navigateur peut refuser, la page doit continuer. */
export const stock = {
  lire(cle, defaut = null) {
    try {
      const v = window.localStorage.getItem(cle);
      return v == null ? defaut : JSON.parse(v);
    } catch {
      return defaut;
    }
  },
  ecrire(cle, val) {
    try {
      window.localStorage.setItem(cle, JSON.stringify(val));
    } catch {
      /* navigation privée : on continue sans mémoire */
    }
  },
};
