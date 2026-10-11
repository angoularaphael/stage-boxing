/**
 * L'horloge vraie de la semaine (heure de Paris).
 * Avant le lundi 26 à 10h : un compte à rebours. Pendant : la séance en cours s'allume,
 * les jours passés se marquent. Après : « Stage terminé ». Aucune urgence inventée.
 */
const DEBUT = Date.parse('2026-10-26T10:00:00+01:00');
const FIN = Date.parse('2026-10-31T18:00:00+01:00');

// les créneaux du DOM sont en heure locale de Paris, en UTC+1 pendant toute la semaine
const instant = (iso) => Date.parse(`${iso}:00+01:00`);

export function horloge() {
  const court = document.querySelector('[data-compte-court]');
  const long = document.querySelector('[data-compte]');
  const semaine = document.querySelector('[data-semaine]');
  if (!court && !long && !semaine) return;

  const tic = () => {
    const now = Date.now();
    if (now < DEBUT) {
      const ms = DEBUT - now;
      const j = Math.floor(ms / 86_400_000);
      const h = Math.floor((ms % 86_400_000) / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      if (court) {
        court.hidden = false;
        court.textContent = j >= 1 ? `Début dans ${j} jour${j > 1 ? 's' : ''}` : `Début dans ${h} h ${String(m).padStart(2, '0')}`;
      }
      if (long) {
        long.hidden = false;
        long.innerHTML = `<span class="eyebrow">Début du stage lundi 26 à 10h</span>
          <span class="compte__bloc"><b>${j}</b><span>jours</span></span>
          <span class="compte__bloc"><b>${String(h).padStart(2, '0')}</b><span>heures</span></span>
          <span class="compte__bloc"><b>${String(m).padStart(2, '0')}</b><span>minutes</span></span>`;
      }
    } else if (now <= FIN) {
      if (court) {
        court.hidden = false;
        court.textContent = 'Le stage est en cours';
      }
      if (long) {
        long.hidden = false;
        long.innerHTML = '<span class="eyebrow">Le stage est en cours</span>';
      }
    } else {
      if (court) {
        court.hidden = false;
        court.textContent = 'Stage terminé';
      }
      if (long) {
        long.hidden = false;
        long.innerHTML = '<span class="eyebrow">Le stage est terminé — merci aux boxeurs</span>';
      }
    }
    if (semaine) {
      semaine.querySelectorAll('.seance').forEach((s) => {
        const d = instant(s.dataset.debut);
        const f = instant(s.dataset.fin);
        s.classList.toggle('is-now', now >= d && now < f);
        s.classList.toggle('is-fini', now >= f);
      });
      semaine.querySelectorAll('[data-jour]').forEach((j) => {
        const etat = j.querySelector('[data-jour-etat]');
        if (!etat) return;
        const d0 = Date.parse(`${j.dataset.jour}T00:00:00+01:00`);
        const d1 = d0 + 86_400_000;
        if (now >= d0 && now < d1) {
          etat.hidden = false;
          etat.innerHTML = '<span class="puce__point" aria-hidden="true"></span>Aujourd’hui';
        } else if (now >= d1 && now < FIN + 86_400_000) {
          etat.hidden = false;
          etat.textContent = 'Fait';
        } else {
          etat.hidden = true;
        }
      });
    }
  };
  tic();
  setInterval(tic, 30_000);
}
