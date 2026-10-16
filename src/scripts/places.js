/**
 * Les places restantes. Un vrai chiffre ou rien : si l'API ne répond pas, la ligne reste vide.
 *
 * Le compte est réglé par le club, comme l'offre de rentrée de la boutique box-plus (lib/merch.js,
 * placesRestantes) : le patron dit combien de places il reste — inscriptions faites au club comprises, que
 * l'API ne voit pas — et chaque inscription en ligne payée ENSUITE en retire une toute seule. `ancre` : les
 * inscriptions en ligne que l'API comptait déjà au moment du réglage (GET /api/checkout?club=…, stock.used).
 * Pour réajuster : nouveaux chiffres, et l'ancre à la valeur de stock.used du jour.
 *
 * À l'écran (le patron, 16/10 : « une animation qui lui donne vie ») : la première fois qu'une ligne entre à
 * l'écran, elle descend de 20 au vrai chiffre, une place après l'autre, et la jauge de 20 s'éteint d'autant. Le
 * compte est ensuite relu toutes les 90 s tant que la page est ouverte : une place prise pendant la visite
 * s'éteint sous les yeux du visiteur. Rien ne descend sans inscription : pas de courbe inventée par visiteur.
 */
import { reduit } from './ui.js';

const CACHE = 'vdb-places';
const DUREE = 60_000;
const RELECTURE = 90_000;
const RELECTURES_MAX = 10; // un quart d'heure de visite
const REGLAGE = {
  // 15/10/2026, le patron : 16 places restantes sur 20 à Portet, 13 sur 20 aux Minimes
  portet: { max: 20, restantes: 16, ancre: 0 },
  minimes: { max: 20, restantes: 13, ancre: 1 },
};

/** Le dernier compte connu de chaque salle, que lit aussi l'encart du défilement (encart.js). */
export const etatPlaces = {};

export async function lirePlaces(club, { frais = false } = {}) {
  if (!frais) {
    try {
      const memo = JSON.parse(sessionStorage.getItem(`${CACHE}-${club}`) || 'null');
      if (memo && Date.now() - memo.t < DUREE) return memo.v;
    } catch {
      /* pas de mémoire de session : on interroge l'API */
    }
  }
  const res = await fetch(`/api/checkout?club=${encodeURIComponent(club)}`, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`places ${res.status}`);
  const data = await res.json();
  const r = REGLAGE[club];
  const enLigne = Number(data?.stock?.max) - Number(data?.stock?.remaining);
  const restantes = r ? Math.max(0, r.restantes - Math.max(0, enLigne - r.ancre)) : NaN;
  const v = { restantes, max: r ? r.max : NaN, methodes: data.methods || [], prix: data.prices || null, studio: !!data.studio };
  try {
    sessionStorage.setItem(`${CACHE}-${club}`, JSON.stringify({ t: Date.now(), v }));
  } catch {
    /* idem */
  }
  return v;
}

/** « Places restantes : 16/20 » (le patron, 15/10), puis « Dernière place » et « Complet ». */
export function textePlaces(v) {
  if (!Number.isFinite(v.restantes) || !Number.isFinite(v.max) || v.max <= 0) return '';
  if (v.restantes <= 0) return 'Complet';
  if (v.restantes === 1) return 'Dernière place';
  return `Places restantes : ${v.restantes}/${v.max}`;
}

/** Ce que lit un lecteur d'écran : « 13 sur 20 » plutôt que « 13 barre oblique 20 ». */
const texteLu = (v) => (v.restantes > 1 ? `Places restantes : ${v.restantes} sur ${v.max}` : textePlaces(v));

/** La jauge : une barre par place du stage. */
export function jauge(el, max) {
  if (el.childElementCount !== max) {
    el.replaceChildren(...Array.from({ length: max }, (_, i) => {
      const b = document.createElement('i');
      b.style.setProperty('--i', String(i)); // l'ordre d'allumage
      return b;
    }));
  }
  return [...el.children];
}

/**
 * Descend de `de` à `a`, une place après l'autre : le chiffre bat à chaque pas et la barre de la place prise
 * s'éteint ; les derniers pas ralentissent, le compte se pose. Sans animation (réglage de l'appareil) : le vrai
 * chiffre tout de suite.
 */
export function descendre(chiffre, barres, de, a, { pas = 75, delai = 250 } = {}) {
  const poser = (n) => {
    if (chiffre) chiffre.textContent = String(n);
    barres.forEach((b, i) => b.classList.toggle('is-prise', i >= n));
  };
  if (reduit() || !(de > a)) {
    poser(a);
    return Promise.resolve();
  }
  poser(de);
  const total = de - a;
  return new Promise((fin) => {
    let k = de;
    const tic = () => {
      k -= 1;
      if (chiffre) {
        chiffre.textContent = String(k);
        chiffre.classList.remove('is-tic');
        void chiffre.offsetWidth; // relance le battement
        chiffre.classList.add('is-tic');
      }
      if (barres[k]) barres[k].classList.add('is-prise');
      if (k > a) setTimeout(tic, pas + pas * 1.6 * ((de - k) / total) ** 2);
      else fin();
    };
    setTimeout(tic, delai);
  });
}

/** Une ligne vivante : le point qui bat, « Places restantes : 13/20 » dont le chiffre descend, la jauge. */
function poserLigne(el, club, v) {
  el.classList.add('places');
  el.classList.toggle('is-complet', v.restantes <= 0);
  el.style.setProperty('--c', `var(--${club})`);
  el.style.setProperty('--c-clair', `var(--${club}-clair)`);
  const lu = document.createElement('span');
  lu.className = 'sr-only';
  lu.textContent = texteLu(v);
  const vu = document.createElement('span');
  vu.className = 'places__vu';
  vu.setAttribute('aria-hidden', 'true');
  const point = document.createElement('span');
  point.className = 'places__point';
  const txt = document.createElement('span');
  txt.className = 'places__txt';
  if (v.restantes > 1) {
    const n = document.createElement('b');
    n.className = 'places__n';
    n.textContent = String(v.restantes);
    const frac = document.createElement('span');
    frac.className = 'places__frac'; // « 13/20 » ne se coupe jamais en deux
    frac.append(n, `/${v.max}`);
    txt.append('Places restantes : ', frac);
  } else {
    txt.textContent = textePlaces(v);
  }
  const j = document.createElement('span');
  j.className = 'places__jauge';
  vu.append(point, txt, j);
  el.replaceChildren(lu, vu);
  el.hidden = false;
  jauge(j, v.max).forEach((b, i) => b.classList.toggle('is-prise', i >= v.restantes));
}

/** La descente de 20 au vrai chiffre, la première fois que la ligne se montre. */
function animerLigne(el, v, de = v.max, options) {
  const n = el.querySelector('.places__n');
  const barres = [...el.querySelectorAll('.places__jauge i')];
  return descendre(n, barres, de, v.restantes, options);
}

export function places() {
  const cibles = [...document.querySelectorAll('[data-places]')];
  // l'encart du défilement a besoin des deux salles, même sur une page qui n'a pas de ligne de places
  const encart = !!document.querySelector('[data-encart]');
  const clubs = [...new Set([...cibles.map((el) => el.dataset.places), ...(encart ? ['minimes', 'portet'] : [])])];
  if (!clubs.length) return;
  const vues = 'IntersectionObserver' in window
    ? new IntersectionObserver((entrees) => {
        entrees.forEach((e) => {
          if (!e.isIntersecting) return;
          vues.unobserve(e.target);
          const v = etatPlaces[e.target.dataset.places];
          if (v) animerLigne(e.target, v);
        });
      }, { threshold: 0.6 })
    : null;

  const appliquer = (club, v) => {
    const avant = etatPlaces[club]?.restantes;
    etatPlaces[club] = v;
    if (v.methodes.length) {
      // un moyen de paiement que l'API ne propose pas (ou plus) disparaît de la liste
      document.querySelectorAll(`[data-methode-club="${club}"]`).forEach((li) => {
        li.hidden = !v.methodes.some((m) => m.id === li.dataset.methode);
      });
    }
    if (!textePlaces(v)) return;
    cibles.filter((el) => el.dataset.places === club).forEach((el) => {
      if (avant == null) {
        poserLigne(el, club, v);
        if (vues) vues.observe(el);
      } else if (v.restantes !== avant) {
        poserLigne(el, club, v);
        // une place prise pendant la visite : elle s'éteint sous les yeux, plus lentement
        if (v.restantes < avant) {
          animerLigne(el, v, avant, { pas: 260, delai: 120 });
          el.classList.remove('is-vient');
          void el.offsetWidth;
          el.classList.add('is-vient');
        }
      }
    });
    window.dispatchEvent(new CustomEvent('vdb:places', { detail: { club, v, avant: avant ?? null } }));
  };

  const lire = (frais) => clubs.forEach((club) => {
    lirePlaces(club, { frais })
      .then((v) => appliquer(club, v))
      .catch(() => {
        /* API muette : on n'affiche rien plutôt qu'un chiffre faux */
      });
  });
  lire(false);
  let relectures = 0;
  const minuteur = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    relectures += 1;
    if (relectures > RELECTURES_MAX) {
      clearInterval(minuteur);
      return;
    }
    lire(true);
  }, RELECTURE);
}
