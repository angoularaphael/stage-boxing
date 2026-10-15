/**
 * Les places restantes. Un vrai chiffre ou rien : si l'API ne répond pas, la ligne reste vide.
 *
 * Le compte est réglé par le club, comme l'offre de rentrée de la boutique box-plus (lib/merch.js,
 * placesRestantes) : le patron dit combien de places il reste — inscriptions faites au club comprises, que
 * l'API ne voit pas — et chaque inscription en ligne payée ENSUITE en retire une toute seule. `ancre` : les
 * inscriptions en ligne que l'API comptait déjà au moment du réglage (GET /api/checkout?club=…, stock.used).
 * Pour réajuster : nouveaux chiffres, et l'ancre à la valeur de stock.used du jour.
 */
const CACHE = 'vdb-places';
const DUREE = 60_000;
const REGLAGE = {
  // 15/10/2026, le patron : 16 places restantes sur 20 à Portet, 13 sur 20 aux Minimes
  portet: { max: 20, restantes: 16, ancre: 0 },
  minimes: { max: 20, restantes: 13, ancre: 1 },
};

export async function lirePlaces(club) {
  try {
    const memo = JSON.parse(sessionStorage.getItem(`${CACHE}-${club}`) || 'null');
    if (memo && Date.now() - memo.t < DUREE) return memo.v;
  } catch {
    /* pas de mémoire de session : on interroge l'API */
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
  return `Places restantes : ${v.restantes}/${v.max}`;
}

export function places() {
  const cibles = [...document.querySelectorAll('[data-places]')];
  const clubs = [...new Set(cibles.map((el) => el.dataset.places))];
  clubs.forEach((club) => {
    lirePlaces(club)
      .then((v) => {
        // un moyen de paiement que l'API ne propose pas (ou plus) disparaît de la liste
        if (v.methodes.length) {
          document.querySelectorAll(`[data-methode-club="${club}"]`).forEach((li) => {
            li.hidden = !v.methodes.some((m) => m.id === li.dataset.methode);
          });
        }
        const t = textePlaces(v);
        if (!t) return;
        cibles.filter((el) => el.dataset.places === club).forEach((el) => {
          el.textContent = t;
          el.hidden = false;
          el.classList.toggle('is-complet', v.restantes <= 0);
        });
      })
      .catch(() => {
        /* API muette : on n'affiche rien plutôt qu'un chiffre faux */
      });
  });
}
