/**
 * La semaine à l'échelle. Pendant le défilement, l'horloge lit le temps sous l'aiguille
 * (« MER 28 · 14:20 »), la séance sous l'aiguille s'allume dans les deux salles, et pendant
 * la vraie semaine un repère « maintenant » se pose sur l'échelle (heure de Paris, UTC+1).
 * Même moteur que le reste du site : un écouteur de défilement calé sur rAF.
 */
import { reduit } from './ui.js';

const DEBUT = Date.parse('2026-10-26T10:00:00+01:00');
const FIN = Date.parse('2026-10-31T18:00:00+01:00');
const LIGNE = 0.42; // l'aiguille, en part de la hauteur d'écran
const instant = (iso) => Date.parse(`${iso}:00+01:00`);
const deux = (n) => String(n).padStart(2, '0');

export function echelle() {
  const racine = document.querySelector('[data-echelle]');
  if (!racine) return;

  const focus = new URLSearchParams(window.location.search).get('club');
  if (focus === 'portet' || focus === 'minimes') racine.dataset.focus = focus;

  const jours = [...racine.querySelectorAll('[data-ech-jour-bloc]')].map((li) => ({
    li,
    date: li.dataset.echJourBloc,
    grille: li.querySelector('[data-ech-grille]'),
    ouverture: Number(li.dataset.ouverture),
    heures: Number(li.dataset.heures),
    court: li.dataset.court,
    blocs: [...li.querySelectorAll('[data-ech-seance]')],
    creux: [...li.querySelectorAll('[data-creux]')],
    etat: li.querySelector('[data-ech-etat]'),
    marque: li.querySelector('[data-ech-now]'),
  }));
  const eJour = racine.querySelector('[data-ech-jour]');
  const eHeure = racine.querySelector('[data-ech-heure]');
  const eQuoi = racine.querySelector('[data-ech-quoi]');
  const aiguille = racine.querySelector('[data-ech-aiguille]');
  const bouton = racine.querySelector('[data-ech-maintenant]');
  let allumes = [];

  const dans = (el, y) => {
    const r = el.getBoundingClientRect();
    return y >= r.top && y < r.bottom;
  };

  const lire = () => {
    const y = window.innerHeight * LIGNE;
    let jour = null;
    let h = 0;
    for (const j of jours) {
      const r = j.grille.getBoundingClientRect();
      if (y < r.top) {
        // dans l'en-tête du jour : on affiche son ouverture
        jour = j;
        h = j.ouverture;
        break;
      }
      if (y < r.bottom) {
        jour = j;
        h = j.ouverture + ((y - r.top) / r.height) * j.heures;
        break;
      }
    }
    if (!jour) {
      jour = jours[jours.length - 1];
      h = jour.ouverture + jour.heures;
    }
    const m = Math.min(Math.round((h * 60) / 5) * 5, (jour.ouverture + jour.heures) * 60);
    eJour.textContent = jour.court;
    eHeure.textContent = `${deux(Math.floor(m / 60))}:${deux(m % 60)}`;

    const sous = jour.blocs.filter((b) => dans(b, y));
    allumes.forEach((b) => {
      if (!sous.includes(b)) b.classList.remove('is-lu');
    });
    sous.forEach((b) => b.classList.add('is-lu'));
    allumes = sous;
    const creux = sous.length ? null : jour.creux.find((c) => dans(c, y));
    eQuoi.textContent = sous.length ? sous[0].dataset.quoi : creux ? creux.dataset.creux : '';

    // l'aiguille n'existe que pendant la traversée de l'échelle, alignée sur la colonne des heures
    const rr = racine.getBoundingClientRect();
    const visible = rr.top < y && rr.bottom > y;
    aiguille.classList.toggle('is-visible', visible);
    if (visible) aiguille.style.left = `${jours[0].grille.getBoundingClientRect().left}px`;
  };

  // l'heure vraie : séances passées, séance en cours, jour en cours, repère « maintenant »
  const maintenant = () => {
    const now = Date.now();
    jours.forEach((j) => {
      j.blocs.forEach((b) => {
        const d = instant(b.dataset.debut);
        const f = instant(b.dataset.fin);
        b.classList.toggle('is-now', now >= d && now < f);
        b.classList.toggle('is-fini', now >= f);
      });
      const d0 = Date.parse(`${j.date}T00:00:00+01:00`);
      if (now >= d0 && now < d0 + 86_400_000) {
        j.etat.hidden = false;
        j.etat.innerHTML = '<span class="puce__point" aria-hidden="true"></span>Aujourd’hui';
      } else if (now >= d0 + 86_400_000 && now < FIN + 86_400_000) {
        j.etat.hidden = false;
        j.etat.textContent = 'Fait';
      } else {
        j.etat.hidden = true;
      }
      const ouvre = d0 + j.ouverture * 3_600_000;
      const ferme = ouvre + j.heures * 3_600_000;
      const ici = now >= ouvre && now <= ferme;
      j.marque.hidden = !ici;
      if (ici) j.marque.style.top = `${((now - ouvre) / (ferme - ouvre)) * 100}%`;
    });
    bouton.hidden = !(now >= DEBUT && now <= FIN);
    bouton.tabIndex = bouton.hidden ? -1 : 0;
  };

  bouton.addEventListener('click', () => {
    const marque = jours.map((j) => j.marque).find((m) => !m.hidden);
    if (!marque) return;
    const r = marque.getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + r.top - window.innerHeight * LIGNE, behavior: reduit() ? 'auto' : 'smooth' });
  });

  // la feuille d'une séance : le bloc entier, lisible sans troncature
  const feuille = racine.querySelector('[data-feuille]');
  const corps = racine.querySelector('[data-feuille-corps]');
  racine.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ech-ouvrir]');
    if (!b || !feuille || typeof feuille.showModal !== 'function') return;
    const copie = b.closest('[data-ech-seance]').cloneNode(true);
    copie.querySelector('[data-ech-ouvrir]')?.remove();
    copie.removeAttribute('style');
    copie.removeAttribute('data-ech-seance');
    copie.classList.remove('is-lu');
    corps.replaceChildren(copie);
    feuille.showModal();
  });
  feuille?.addEventListener('click', (e) => {
    if (e.target === feuille) feuille.close();
  });

  let prevu = false;
  const planifier = () => {
    if (prevu) return;
    prevu = true;
    requestAnimationFrame(() => {
      prevu = false;
      lire();
    });
  };
  window.addEventListener('scroll', planifier, { passive: true });
  window.addEventListener('resize', planifier, { passive: true });
  maintenant();
  lire();
  setInterval(maintenant, 30_000);
}

/** La semaine d'un coup d'œil vit aussi : séance en cours allumée, séances passées estompées. */
export function semaineVivante() {
  const blocs = [...document.querySelectorAll('[data-sem] [data-debut]')];
  if (!blocs.length) return;
  const tic = () => {
    const now = Date.now();
    blocs.forEach((b) => {
      const d = instant(b.dataset.debut);
      const f = instant(b.dataset.fin);
      b.classList.toggle('is-now', now >= d && now < f);
      b.classList.toggle('is-fini', now >= f);
    });
  };
  tic();
  setInterval(tic, 30_000);
}
