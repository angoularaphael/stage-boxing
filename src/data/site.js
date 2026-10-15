/**
 * Adresse publique du site.
 * stages.boxingcenter.fr ne résout pas encore (NXDOMAIN, vérifié le 10/10/2026) : les URL
 * canoniques, le sitemap et les données structurées pointent sur l'adresse qui répond.
 * Le jour où le sous-domaine est branché : PUBLIC_SITE_URL=https://stages.boxingcenter.fr
 * sur Vercel, et les deux fichiers statiques public/robots.txt et public/sitemap.xml.
 */
export const SITE_URL = String(import.meta.env.PUBLIC_SITE_URL || 'https://stage-boxing.vercel.app').replace(/\/+$/, '');

/** Date du dernier changement de contenu (pas la date du build). */
export const MAJ = '2026-10-11';

/**
 * Les pages du site, une question chacune. Sert aux liens « et ensuite » en bas de page,
 * pour que chaque page mène à la suivante au lieu de finir en impasse.
 */
export const PAGES = {
  programme: { href: '/programme', eyebrow: 'Le programme', titre: 'Heure par heure', texte: 'Les 12 séances de la semaine, avec les coachs de chaque salle.' },
  equipe: { href: '/equipe', eyebrow: 'L’équipe', titre: 'Coachs et pros', texte: 'Huit intervenants, leurs titres et leurs créneaux de la semaine.' },
  parents: { href: '/parents', eyebrow: 'Pour les parents', titre: 'Entre de bonnes mains', texte: 'Sécurité, encadrement, journée type, midi et documents.' },
  tarifs: { href: '/tarifs', eyebrow: 'Tarifs', titre: '80 € ou 140 €', texte: 'Tout compris, payé en ligne, en 4 fois si vous y êtes éligible.' },
  questions: { href: '/questions', eyebrow: 'Questions', titre: 'Vos questions', texte: 'Toutes les réponses, classées par thème.' },
  choisir: { href: '/choisir-mon-club', eyebrow: 'Choisir mon club', titre: 'Portet ou Minimes', texte: 'La salle la plus proche de chez vous, en un geste.' },
};
