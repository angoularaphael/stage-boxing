/**
 * « Envoie le stage à tes parents ». Le lien ouvre la même page côté parent (?vue=parent).
 * Partage natif du téléphone quand il existe ; sinon une feuille : le lien à copier, WhatsApp,
 * SMS, e-mail. Rien ne passe par nos serveurs.
 */
const TITRE = 'Les Vacances des Boxeurs — stage de boxe 8–16 ans';
const TEXTE = 'Regarde ce stage de boxe pour les 8–16 ans, du 26 au 31 octobre. Je peux y aller ?';

function lien() {
  const u = new URL(window.location.href);
  u.searchParams.set('vue', 'parent');
  u.hash = '';
  return u.toString();
}

function feuille() {
  let f = document.getElementById('feuille-partage');
  if (f) return f;
  f = document.createElement('dialog');
  f.id = 'feuille-partage';
  f.className = 'feuille feuille--partage';
  f.setAttribute('aria-labelledby', 'partage-titre');
  f.innerHTML = `
    <form method="dialog" class="feuille__haut"><button class="feuille__fermer" aria-label="Fermer">×</button></form>
    <div class="feuille__corps partage">
      <p class="eyebrow">Pour tes parents</p>
      <h2 class="partage__titre" id="partage-titre">Envoie-leur le stage</h2>
      <p class="partage__texte">Le lien ouvre le site côté parents : la sécurité, les horaires, le prix et l’inscription.</p>
      <div class="partage__lien">
        <input type="text" readonly aria-label="Lien à envoyer" data-partage-url />
        <button type="button" class="btn btn--blanc" data-partage-copier>Copier</button>
      </div>
      <div class="partage__apps">
        <a class="btn btn--ghost" data-partage-wa target="_blank" rel="noopener">WhatsApp</a>
        <a class="btn btn--ghost" data-partage-sms>SMS</a>
        <a class="btn btn--ghost" data-partage-mail>E-mail</a>
      </div>
      <p class="partage__statut" aria-live="polite" data-partage-statut></p>
    </div>`;
  document.body.append(f);
  f.addEventListener('click', (e) => {
    if (e.target === f) f.close();
  });
  f.querySelector('[data-partage-copier]').addEventListener('click', async () => {
    const champ = f.querySelector('[data-partage-url]');
    const statut = f.querySelector('[data-partage-statut]');
    try {
      await navigator.clipboard.writeText(champ.value);
      statut.textContent = 'Lien copié. Colle-le dans un message à tes parents.';
    } catch {
      champ.select();
      statut.textContent = 'Sélectionne le lien et copie-le.';
    }
  });
  return f;
}

export function partage() {
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-partager]');
    if (!b) return;
    const url = lien();
    const donnees = { title: TITRE, text: TEXTE, url };
    if (navigator.share && (!navigator.canShare || navigator.canShare(donnees))) {
      try {
        await navigator.share(donnees);
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    const f = feuille();
    const corps = `${TEXTE} ${url}`;
    f.querySelector('[data-partage-url]').value = url;
    f.querySelector('[data-partage-wa]').href = `https://wa.me/?text=${encodeURIComponent(corps)}`;
    f.querySelector('[data-partage-sms]').href = `sms:?&body=${encodeURIComponent(corps)}`;
    f.querySelector('[data-partage-mail]').href = `mailto:?subject=${encodeURIComponent(TITRE)}&body=${encodeURIComponent(corps)}`;
    f.querySelector('[data-partage-statut]').textContent = '';
    f.showModal();
  });
}
