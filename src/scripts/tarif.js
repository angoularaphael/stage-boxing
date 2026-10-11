/**
 * Le prix en un geste. 140 € par défaut ; « Adhérent » le fait défiler jusqu'à 80 €.
 * Le lien d'inscription emporte le choix (&tarif=adherent) pour ne rien redemander.
 */
import { reduit } from './ui.js';

const fmt = (n, d = 2) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: d });

export function tarifs() {
  document.querySelectorAll('[data-tarif]').forEach((bloc) => {
    const guest = Number(bloc.dataset.guest);
    const member = Number(bloc.dataset.member);
    const bascule = bloc.querySelector('.bascule');
    const montant = bloc.querySelector('[data-tarif-montant]');
    const libelle = bloc.querySelector('[data-tarif-libelle]');
    const sous = bloc.querySelector('[data-tarif-sous]');
    const cta = bloc.querySelector('[data-tarif-cta]');
    let actuel = guest;
    let anim = 0;

    const peindre = (v) => {
      montant.textContent = String(Math.round(v));
    };
    const vers = (cible) => {
      cancelAnimationFrame(anim);
      if (reduit()) {
        actuel = cible;
        return peindre(cible);
      }
      const depart = actuel;
      const t0 = performance.now();
      const duree = 750;
      const pas = (t) => {
        const k = Math.min(1, (t - t0) / duree);
        const e = 1 - Math.pow(1 - k, 3);
        actuel = depart + (cible - depart) * e;
        peindre(actuel);
        if (k < 1) anim = requestAnimationFrame(pas);
        else actuel = cible;
      };
      anim = requestAnimationFrame(pas);
    };
    const choisir = (etat) => {
      const adh = etat === 'adherent';
      bascule.dataset.etat = etat;
      bascule.querySelectorAll('[data-tarif-choix]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tarifChoix === etat)));
      const p = adh ? member : guest;
      vers(p);
      libelle.textContent = adh ? 'Tarif adhérent Boxing Center · le stage complet' : 'Tarif non-adhérent · le stage complet';
      sous.textContent = `Soit ${fmt(p / 12)} € par séance ou activité · paiement en 4 fois possible avec PayPal (4 × ${fmt(p / 4)} €), si vous y êtes éligible`;
      if (cta && cta.dataset.base) cta.href = `${cta.dataset.base}&tarif=${adh ? 'adherent' : 'non-adherent'}`;
    };
    bascule.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tarif-choix]');
      if (b) choisir(b.dataset.tarifChoix);
    });
  });
}
