/**
 * Moteur de défilement maison : un seul écouteur, calé sur requestAnimationFrame.
 * Pas d'IntersectionObserver : la mesure de position se vérifie partout, y compris dans
 * un panneau de prévisualisation qui ne compose pas ses images.
 * Gère : les révélations [data-rev] et les compteurs [data-compteur].
 */
import { reduit } from './ui.js';

export function revelations() {
  const elements = [...document.querySelectorAll('[data-rev]')];
  const compteurs = [...document.querySelectorAll('[data-compteur]')];
  if (reduit()) {
    elements.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const comptes = new Set();
  let prevu = false;
  const maj = () => {
    prevu = false;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    for (let i = elements.length - 1; i >= 0; i -= 1) {
      const el = elements[i];
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.9 && r.bottom > 0) {
        el.classList.add('is-in');
        elements.splice(i, 1);
      }
    }
    compteurs.forEach((el) => {
      if (comptes.has(el)) return;
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.85) {
        comptes.add(el);
        compter(el);
      }
    });
  };
  const planifier = () => {
    if (!prevu) {
      prevu = true;
      requestAnimationFrame(maj);
    }
  };
  window.addEventListener('scroll', planifier, { passive: true });
  window.addEventListener('resize', planifier, { passive: true });
  maj();
  // exposé pour la vérification : relire l'état à la demande
  window.__revelations = maj;
}

function compter(el) {
  const fin = Number(el.dataset.compteur);
  if (!Number.isFinite(fin)) return;
  const t0 = performance.now();
  const duree = 900;
  const pas = (t) => {
    const k = Math.min(1, (t - t0) / duree);
    const e = 1 - Math.pow(1 - k, 4);
    el.textContent = String(Math.round(fin * e));
    if (k < 1) requestAnimationFrame(pas);
  };
  el.textContent = '0';
  requestAnimationFrame(pas);
}
