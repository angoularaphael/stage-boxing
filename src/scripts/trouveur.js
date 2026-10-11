/**
 * Le trouveur de club. La liste des communes (geo.api.gouv.fr, servie par le site) n'est
 * chargée qu'au premier geste ; la distance se calcule ici, à vol d'oiseau (haversine), et
 * ne quitte pas l'appareil. La position du téléphone, si on la donne, non plus.
 */
const plat = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[-'’]/g, ' ')
    .replace(/\bste\b/g, 'sainte')
    .replace(/\bst\b/g, 'saint')
    .replace(/\s+/g, ' ')
    .trim();

let communes = null;
async function charger() {
  if (communes) return communes;
  const r = await fetch('/data/communes.json');
  if (!r.ok) throw new Error(`communes ${r.status}`);
  const d = await r.json();
  communes = d.communes.map(([nom, cp, lat, lng]) => ({ nom, cp, lat, lng, cle: plat(nom) }));
  return communes;
}

function km(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const fmt = (d) => (d < 10 ? d.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : String(Math.round(d)));

/** Les communes dont le nom (ou un mot du nom) commence par la saisie ; ou par code postal. */
function chercher(liste, q) {
  const p = plat(q.replace(/\(.*$/, ''));
  if (p.length < 2) return [];
  if (/^\d+$/.test(p)) return liste.filter((c) => c.cp.startsWith(p)).slice(0, 7);
  const debut = [];
  const mot = [];
  for (const c of liste) {
    if (c.cle.startsWith(p)) debut.push(c);
    else if (mot.length < 7 && c.cle.includes(` ${p}`)) mot.push(c);
    if (debut.length >= 7) break;
  }
  return [...debut, ...mot].slice(0, 7);
}

export function trouveur() {
  document.querySelectorAll('[data-trouveur]').forEach(monter);
}

function monter(racine) {
  const salles = JSON.parse(racine.dataset.salles);
  const saisie = racine.querySelector('[data-trouve-saisie]');
  const liste = racine.querySelector('[data-trouve-liste]');
  const geo = racine.querySelector('[data-trouve-geo]');
  const verdict = racine.querySelector('[data-trouve-verdict]');
  const nom = { portet: { de: 'de Portet', pour: 'pour Portet' }, minimes: { de: 'des Minimes', pour: 'pour les Minimes' } };
  let options = [];
  let actif = -1;

  const fermer = () => {
    liste.hidden = true;
    actif = -1;
    saisie.setAttribute('aria-expanded', 'false');
    saisie.removeAttribute('aria-activedescendant');
  };

  const comparer = (point, depuis, suite = '') => {
    const d = Object.fromEntries(Object.keys(salles).map((id) => [id, km(point, salles[id])]));
    const [proche, loin] = Object.keys(d).sort((a, b) => d[a] - d[b]);
    const net = d[loin] - d[proche] >= 1.5;
    const max = Math.max(...Object.values(d));
    Object.keys(d).forEach((id) => {
      const bloc = racine.querySelector(`[data-salle="${id}"]`);
      bloc.querySelector('[data-km]').textContent = fmt(d[id]);
      bloc.querySelector('[data-jauge]').style.transform = `scaleX(${Math.max(0.04, d[id] / max)})`;
      bloc.classList.toggle('is-proche', net && id === proche);
      bloc.querySelector('[data-proche]').hidden = !(net && id === proche);
    });
    racine.classList.add('is-calcule');
    verdict.textContent = net
      ? `${depuis}, la salle la plus proche est celle ${nom[proche].de} : ${fmt(d[proche])} km à vol d’oiseau, contre ${fmt(d[loin])} km ${nom[loin].pour}.${suite}`
      : `${depuis}, les deux salles sont presque à la même distance (${fmt(d.portet)} et ${fmt(d.minimes)} km à vol d’oiseau) : choisissez selon vos trajets.${suite}`;
  };

  const choisir = (c) => {
    saisie.value = `${c.nom} (${c.cp})`;
    fermer();
    if (c.nom === 'Toulouse') comparer(c, 'Depuis le centre de Toulouse', ' Toulouse est grande : pour comparer depuis chez vous, utilisez « Ma position ».');
    else comparer(c, `Depuis ${c.nom}`);
  };

  const peindre = () => {
    liste.replaceChildren(
      ...options.map((c, i) => {
        const li = document.createElement('li');
        li.id = `${liste.id}-${i}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === actif));
        const b = document.createElement('b');
        b.textContent = c.nom;
        const s = document.createElement('span');
        s.textContent = c.cp;
        li.append(b, s);
        // pointerdown : le choix passe avant que le champ perde le focus
        li.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          choisir(c);
        });
        return li;
      }),
    );
    liste.hidden = options.length === 0;
    saisie.setAttribute('aria-expanded', String(!liste.hidden));
    if (actif >= 0) saisie.setAttribute('aria-activedescendant', `${liste.id}-${actif}`);
    else saisie.removeAttribute('aria-activedescendant');
  };

  saisie.addEventListener('focus', () => charger().catch(() => {}), { once: true });
  saisie.addEventListener('input', async () => {
    try {
      await charger();
    } catch {
      verdict.textContent = 'La liste des communes ne s’est pas chargée : essayez « Ma position ».';
      return;
    }
    options = chercher(communes, saisie.value);
    actif = options.length ? 0 : -1;
    peindre();
  });
  saisie.addEventListener('keydown', (e) => {
    if (liste.hidden) {
      if (e.key === 'Enter') e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      actif = (actif + 1) % options.length;
      peindre();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      actif = (actif - 1 + options.length) % options.length;
      peindre();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[actif]) choisir(options[actif]);
    } else if (e.key === 'Escape') {
      fermer();
    }
  });
  saisie.addEventListener('blur', () => setTimeout(fermer, 150));

  geo.addEventListener('click', () => {
    if (!('geolocation' in navigator)) {
      verdict.textContent = 'Ce navigateur ne donne pas de position : tapez votre commune.';
      return;
    }
    geo.disabled = true;
    verdict.textContent = 'Recherche de votre position…';
    navigator.geolocation.getCurrentPosition(
      (p) => {
        geo.disabled = false;
        comparer({ lat: p.coords.latitude, lng: p.coords.longitude }, 'Depuis votre position');
      },
      (err) => {
        geo.disabled = false;
        verdict.textContent = err.code === 1 ? 'Position refusée : tapez plutôt votre commune.' : 'Position introuvable pour le moment : tapez votre commune.';
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 },
    );
  });
}
