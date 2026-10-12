/**
 * La bascule « Je suis le boxeur / Je suis le parent ».
 * Le choix s'applique sans recharger : la lumière s'allume (ou s'éteint) depuis le bouton touché,
 * par une transition de vue du document ; l'accueil se réordonne dessous. La section qu'on lisait
 * reste à sa place à l'écran. Le premier choix est posé dans <head> (Base.astro), avant l'affichage.
 */
import { reduit } from './ui.js';

const CLE = 'vdb-vue';
const COULEUR = { parent: '#f3f2ee', boxeur: '#080808' };

function appliquer(vue) {
  const h = document.documentElement;
  if (vue) h.dataset.vue = vue;
  else delete h.dataset.vue;
  document.querySelectorAll('[data-vue-choix]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vueChoix === vue)));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = COULEUR[vue] || COULEUR.boxeur;
  const schema = document.querySelector('meta[name="color-scheme"]');
  if (schema) schema.content = vue === 'parent' ? 'light' : 'dark';
}

/** La première section dont le bas passe sous l'en-tête : c'est elle qu'on est en train de lire. */
function sectionLue() {
  const haut = 80;
  return [...document.querySelectorAll('#contenu > section, #contenu > div')].find((s) => s.getBoundingClientRect().bottom > haut) || null;
}

export function vue() {
  const page = document.documentElement.dataset.page;
  if (page === 'inscription' || page === 'admin') return;
  appliquer(document.documentElement.dataset.vue || null);

  // le lien partagé (?vue=parent) a fait son travail : l'adresse affichée redevient propre
  const url = new URL(window.location.href);
  if (url.searchParams.has('vue')) {
    url.searchParams.delete('vue');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }

  const annonce = document.createElement('p');
  annonce.className = 'sr-only';
  annonce.setAttribute('aria-live', 'polite');
  document.body.append(annonce);

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-vue-choix]');
    if (!b) return;
    const cible = b.dataset.vueChoix;
    const h = document.documentElement;
    if (h.dataset.vue === cible) return;
    try {
      window.localStorage.setItem(CLE, cible);
    } catch {
      /* navigation privée : le choix vaut pour cette page */
    }
    const r = b.getBoundingClientRect();
    h.style.setProperty('--vx', `${Math.round(r.left + r.width / 2)}px`);
    h.style.setProperty('--vy', `${Math.round(r.top + r.height / 2)}px`);

    const changer = () => {
      const lue = sectionLue();
      const avant = lue ? lue.getBoundingClientRect().top : 0;
      appliquer(cible);
      if (lue) window.scrollBy(0, lue.getBoundingClientRect().top - avant);
      // une section qui vient de monter à l'écran se révèle sans attendre un défilement
      if (typeof window.__revelations === 'function') window.__revelations();
      annonce.textContent = cible === 'parent' ? 'Le site s’affiche côté parent.' : 'Le site s’affiche côté boxeur.';
    };
    if (!document.startViewTransition || reduit()) return changer();
    h.classList.add('vt-bascule');
    const t = document.startViewTransition(changer);
    t.finished.finally(() => h.classList.remove('vt-bascule'));
  });
}
