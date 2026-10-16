/**
 * L'encart des places, qui passe de temps en temps pendant le défilement (le patron, 16/10) : les Minimes
 * d'abord, un peu plus longtemps, puis Portet. Chaque fois, le compte descend de 20 au vrai chiffre et la
 * jauge s'éteint d'autant.
 *
 * Il n'arrive qu'une fois le héros passé (ses deux lignes disent déjà les places), seulement pendant que l'on
 * fait défiler, jamais au pied de page ni par-dessus le menu, au plus trois fois par page, et il se ferme pour
 * la session. Une place prise pendant la visite le fait passer tout de suite, pour la salle concernée.
 * Le chiffre est celui de places.js : toujours le vrai.
 */
import { etatPlaces, jauge, descendre } from './places.js';

const CLE = 'vdb-encart';
const ORDRE = [['minimes', 6500], ['portet', 4500]];
const PREMIER_APRES = 6000; // ms après l'arrivée sur la page
const ENSUITE_APRES = 45000; // ms entre deux passages
const PASSAGES_MAX = 3;

export function encartPlaces() {
  const encart = document.querySelector('[data-encart]');
  if (!encart) return;
  try {
    if (sessionStorage.getItem(CLE) === 'non') {
      encart.remove();
      return;
    }
  } catch {
    /* navigation privée : il passe, mais ne se souviendra pas qu'on l'a fermé */
  }
  const barre = document.querySelector('[data-barre]');
  const faces = Object.fromEntries([...encart.querySelectorAll('[data-encart-club]')].map((f) => [f.dataset.encartClub, f]));
  const debut = performance.now();
  let passages = 0;
  let enCours = false;
  let finDernier = 0;
  let parcouru = 0;
  let yAvant = window.scrollY;
  let dernierDefilement = 0;
  let survole = false;

  // la barre du bas dit déjà où l'on en est : héros passé, pied de page pas encore là
  const libre = () => !!barre?.classList.contains('is-visible') && !document.querySelector('[data-tiroir]:not([hidden])');

  // une pause qui s'arrête quand le pointeur est dessus, et s'interrompt si la place n'est plus libre
  const tenir = (ms) => new Promise((fin) => {
    let reste = ms;
    let t = performance.now();
    const id = setInterval(() => {
      const n = performance.now();
      if (!survole) reste -= n - t;
      t = n;
      if (reste <= 0 || !libre()) {
        clearInterval(id);
        fin();
      }
    }, 120);
  });

  const montrer = async (club, ms, { depuis, perte = false } = {}) => {
    const v = etatPlaces[club];
    const face = faces[club];
    if (!v || !face || !Number.isFinite(v.restantes)) return;
    Object.values(faces).forEach((f) => f.classList.toggle('is-active', f === face));
    const sur = face.querySelector('[data-encart-sur]');
    sur.textContent = v.restantes <= 0 ? 'complet' : `${v.restantes === 1 ? 'dernière place' : 'places restantes'} sur ${v.max}`;
    face.querySelector('[data-encart-perte]').hidden = !perte;
    const barres = jauge(face.querySelector('[data-encart-jauge]'), v.max);
    encart.classList.add('is-la');
    // les 20 barres s'allument d'abord (CSS, 16 ms l'une après l'autre), puis les places prises s'éteignent
    await descendre(face.querySelector('[data-encart-n]'), barres, depuis ?? v.max, v.restantes, { pas: 70, delai: 660 });
    await tenir(ms);
  };

  const jouer = async (liste, options) => {
    enCours = true;
    passages += 1;
    encart.hidden = false;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (const [club, ms] of liste) {
      if (!libre()) break;
      await montrer(club, ms, options);
    }
    encart.classList.remove('is-la');
    await new Promise((r) => setTimeout(r, 650));
    Object.values(faces).forEach((f) => f.classList.remove('is-active'));
    enCours = false;
    finDernier = performance.now();
    parcouru = 0;
  };

  const essayer = () => {
    if (enCours || passages >= PASSAGES_MAX || !libre()) return;
    const n = performance.now();
    if (n - dernierDefilement > 2500) return; // seulement pendant que l'on fait défiler
    const pret = passages === 0
      ? n - debut > PREMIER_APRES && parcouru > window.innerHeight * 0.5
      : n - finDernier > ENSUITE_APRES && parcouru > window.innerHeight * 1.5;
    if (!pret || !ORDRE.every(([club]) => etatPlaces[club])) return;
    jouer(ORDRE);
  };

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    parcouru += Math.abs(y - yAvant);
    yAvant = y;
    dernierDefilement = performance.now();
    essayer();
  }, { passive: true });

  // une place prise pendant la visite : l'encart passe tout de suite, pour cette salle, depuis l'ancien chiffre
  window.addEventListener('vdb:places', (e) => {
    const { club, v, avant } = e.detail || {};
    if (avant == null || !(v.restantes < avant) || enCours || passages >= PASSAGES_MAX || !libre()) return;
    jouer([[club, 6500]], { depuis: avant, perte: true });
  });

  encart.addEventListener('pointerenter', () => { survole = true; });
  encart.addEventListener('pointerleave', () => { survole = false; });
  encart.querySelector('[data-encart-x]')?.addEventListener('click', () => {
    try {
      sessionStorage.setItem(CLE, 'non');
    } catch {
      /* idem */
    }
    passages = PASSAGES_MAX;
    encart.classList.remove('is-la');
    setTimeout(() => encart.remove(), 650);
  });
}
