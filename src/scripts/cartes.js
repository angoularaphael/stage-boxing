/**
 * Les cartes s'inclinent sous le pointeur et leur reflet holographique suit la lumière.
 * `incliner(el)` est aussi utilisé par la carte de l'enfant dans le tunnel (avec le
 * gyroscope du téléphone, quand il est autorisé).
 */
import { reduit } from './ui.js';

const survol = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function incliner(carte, { force = 11 } = {}) {
  if (reduit()) return () => {};
  let rect = null;
  let raf = 0;
  const appliquer = (px, py) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      carte.style.setProperty('--ry', `${(px - 0.5) * force * 2}deg`);
      carte.style.setProperty('--rx', `${(0.5 - py) * force * 2}deg`);
      carte.style.setProperty('--mx', `${px * 100}%`);
      carte.style.setProperty('--my', `${py * 100}%`);
    });
  };
  const bouge = (e) => {
    rect = rect || carte.getBoundingClientRect();
    appliquer((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
  };
  const entre = () => {
    rect = carte.getBoundingClientRect();
    carte.classList.add('is-suit');
    carte.style.setProperty('--holo', '1');
  };
  const sort = () => {
    rect = null;
    carte.classList.remove('is-suit');
    carte.style.setProperty('--holo', '0');
    appliquer(0.5, 0.5);
  };
  carte.addEventListener('pointerenter', entre);
  carte.addEventListener('pointermove', bouge);
  carte.addEventListener('pointerleave', sort);
  return appliquer;
}

/** Inclinaison par le gyroscope : beta (avant/arrière), gamma (gauche/droite). */
export function gyroscope(appliquer) {
  const ecoute = (e) => {
    if (e.beta == null || e.gamma == null) return;
    const px = Math.min(1, Math.max(0, 0.5 + e.gamma / 50));
    const py = Math.min(1, Math.max(0, 0.5 + (e.beta - 40) / 60));
    appliquer(px, py);
  };
  window.addEventListener('deviceorientation', ecoute, { passive: true });
  return () => window.removeEventListener('deviceorientation', ecoute);
}

export function cartes() {
  if (!survol()) return;
  document.querySelectorAll('[data-carte]').forEach((c) => incliner(c));
}
