/**
 * Les places restantes, lues sur l'API du stage (GET /api/checkout?club=…).
 * Un vrai chiffre ou rien : si l'API ne répond pas, la ligne reste vide.
 */
const CACHE = 'vdb-places';
const DUREE = 60_000;

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
  const v = { restantes: Number(data?.stock?.remaining), max: Number(data?.stock?.max), methodes: data.methods || [], prix: data.prices || null, studio: !!data.studio };
  try {
    sessionStorage.setItem(`${CACHE}-${club}`, JSON.stringify({ t: Date.now(), v }));
  } catch {
    /* idem */
  }
  return v;
}

/**
 * Tant que plus de la moitié des places est libre, on dit ce qui est vrai ET utile
 * (« places limitées : 40 ») plutôt que « 40 sur 40 », qui annonce une salle vide.
 * Sous la moitié, le compte exact devient l'information.
 */
export function textePlaces(v) {
  if (!Number.isFinite(v.restantes) || !Number.isFinite(v.max) || v.max <= 0) return '';
  if (v.restantes <= 0) return 'Complet';
  if (v.restantes === 1) return 'Dernière place';
  if (v.restantes > v.max / 2) return `Places limitées : ${v.max} enfants par salle`;
  return `Plus que ${v.restantes} places`;
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
