/**
 * La carte qui se gagne, en aperçu : la progression du défilement dans la section fait
 * avancer les étapes (payé → fiche → un tampon par document → sceau). On peut revenir en
 * arrière : la carte se défait. Le bouton Portet / Minimes change sa couleur et ses coachs.
 */
import { reduit } from './ui.js';

export function apercuCarte() {
  const s = document.querySelector('[data-apercu]');
  if (!s) return;
  const piste = s.querySelector('.apercu__piste');
  const carte = s.querySelector('[data-apercu-carte]');
  const etapes = [...s.querySelectorAll('[data-apercu-etape]')];
  const tampons = [...carte.querySelectorAll('[data-tampon]')];
  const salles = JSON.parse(s.dataset.salles);
  const paquet = s.querySelector('[data-apercu-paquet]');
  const points = [...s.querySelectorAll('[data-apercu-point]')];

  s.querySelectorAll('[data-apercu-salle]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.apercuSalle;
      const v = salles[id];
      carte.style.setProperty('--cc', `var(--${id})`);
      carte.style.setProperty('--cc-clair', `var(--${id}-clair)`);
      carte.querySelector('[data-apercu-club]').textContent = v.court;
      carte.querySelector('[data-apercu-coachs]').textContent = v.coachs;
      [...paquet.children].forEach((dos, i) => {
        const f = v.visages[i];
        dos.replaceChildren();
        if (f?.src) {
          const img = document.createElement('img');
          img.src = f.src;
          img.alt = '';
          img.width = 72;
          img.height = 100;
          dos.append(img);
        } else if (f) {
          const lettre = document.createElement('b');
          lettre.textContent = f.init;
          dos.append(lettre);
        }
      });
      s.querySelectorAll('[data-apercu-salle]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }),
  );

  const poser = (etape, n) => {
    etapes.forEach((e, i) => {
      e.classList.toggle('is-actif', i === etape);
      e.classList.toggle('is-fait', i < etape);
    });
    points.forEach((pt, i) => pt.classList.toggle('is-actif', i <= etape));
    carte.classList.toggle('is-ecrite', etape >= 1);
    tampons.forEach((t, i) => t.classList.toggle('is-pose', i < n));
    carte.classList.toggle('is-scelle', etape === 3);
    s.classList.toggle('is-paquet', etape === 3);
  };

  if (reduit()) {
    poser(3, tampons.length);
    return;
  }

  let prevu = false;
  const maj = () => {
    prevu = false;
    const r = piste.getBoundingClientRect();
    const course = r.height - window.innerHeight;
    const p = course > 0 ? Math.min(1, Math.max(0, -r.top / course)) : 1;
    // 0–20 % payé · 20–40 % fiche · 40–82 % un tampon après l'autre · au-delà, le sceau
    const etape = p < 0.2 ? 0 : p < 0.4 ? 1 : p < 0.82 ? 2 : 3;
    const n = etape < 2 ? 0 : etape === 3 ? tampons.length : Math.min(tampons.length, Math.floor(((p - 0.4) / 0.42) * tampons.length) + 1);
    poser(etape, n);
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
}
