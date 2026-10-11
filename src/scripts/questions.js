/**
 * La page des questions : un thème à la fois, ou une recherche dans tout (sans se soucier
 * des accents ni des majuscules). Quand il reste peu de réponses, elles s'ouvrent seules.
 */
const plat = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function questions() {
  const racine = document.querySelector('[data-questions]');
  if (!racine) return;
  const saisie = racine.querySelector('[data-q-saisie]');
  const puces = [...racine.querySelectorAll('[data-q-theme]')];
  const groupes = [...racine.querySelectorAll('[data-q-groupe]')];
  const vide = racine.querySelector('[data-q-vide]');
  const compte = racine.querySelector('[data-q-compte]');
  // le nom du thème fait partie du texte cherché : « sécurité » trouve les questions sur les coups
  const items = [...racine.querySelectorAll('[data-q-item]')].map((el) => {
    const nomTheme = el.closest('[data-q-groupe]')?.querySelector('h2')?.textContent || '';
    return { el, txt: plat(`${el.textContent} ${nomTheme}`) };
  });
  let theme = 'tout';

  const appliquer = () => {
    const mots = plat(saisie.value).split(/\s+/).filter(Boolean);
    let total = 0;
    const visibles = [];
    groupes.forEach((g) => {
      const bonTheme = theme === 'tout' || g.dataset.qGroupe === theme;
      let n = 0;
      g.querySelectorAll('[data-q-item]').forEach((el) => {
        const it = items.find((x) => x.el === el);
        const ok = bonTheme && mots.every((m) => it.txt.includes(m));
        el.hidden = !ok;
        if (ok) {
          n += 1;
          visibles.push(el);
        }
      });
      g.hidden = n === 0;
      total += n;
    });
    vide.hidden = total > 0;
    if (mots.length && total <= 3) visibles.forEach((el) => (el.open = true));
    compte.textContent = !mots.length && theme === 'tout' ? '' : total === 0 ? 'Aucune réponse' : `${total} réponse${total > 1 ? 's' : ''}`;
  };

  puces.forEach((p) =>
    p.addEventListener('click', () => {
      theme = p.dataset.qTheme;
      puces.forEach((x) => x.setAttribute('aria-pressed', String(x === p)));
      appliquer();
    }),
  );
  saisie.addEventListener('input', appliquer);
  appliquer();
}
