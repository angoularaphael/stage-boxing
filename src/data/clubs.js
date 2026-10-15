/**
 * Les deux salles du stage et leurs intervenants.
 * Faits : flyers + cahier (staff, adresses), boxing-center-portet.fr (/boxeurs, coachs),
 * boxe-toulouse.com (mentions légales, accès, historique) — relevés le 10/10/2026.
 * Même stage, même programme : ce qui change ici, c'est la salle, l'équipe et l'accès.
 */

export const INTERVENANTS = {
  valentin: {
    nom: 'Valentin Tapia',
    court: 'Valentin',
    role: 'Head coach du Boxing Center Portet',
    titres: ['DEJEPS mention Boxe', '9 champions de France formés avec le club', '10 ans d’expérience et plus'],
    texte: 'Il entraîne depuis plus de dix ans, des enfants aux boxeurs de l’Équipe de France.',
    photo: 'valentin',
  },
  mourad: {
    nom: 'Mourad Berraho',
    court: 'Mourad',
    role: 'Coach enfants et ados',
    titres: ['Triple champion de France', 'Membre de l’Équipe de France'],
    texte: 'Formé au club par Valentin Tapia, il transmet aujourd’hui son expérience aux plus jeunes.',
    photo: 'mourad',
  },
  marama: {
    nom: 'Marama Mercier',
    court: 'Marama',
    role: 'Coach',
    titres: ['Double champion de France', 'Ancien membre de l’Équipe de France'],
    texte: 'Plus de 30 combats amateurs : l’un des boxeurs les plus expérimentés de l’équipe de Portet.',
    photo: 'marama',
  },
  anna: {
    nom: 'Anna Boullez',
    court: 'Anna',
    role: 'Boxeuse professionnelle',
    vedette: 'Challenger au titre de championne de France professionnelle',
    titres: ['Professionnelle : 2 victoires, 0 défaite', 'Près de 30 combats amateurs'],
    // le même palmarès, en chiffres, pour le bilan affiché sur sa fiche
    bilan: [[2, 'victoires'], [0, 'défaite']],
    texte: 'Considérée comme l’un des grands espoirs de la boxe professionnelle française, elle vient échanger avec les enfants le mercredi.',
    photo: 'anna',
  },
  // le club, 13/10/2026 : DEJEPS, nom de famille, et sa vraie photo (séance du club, Axel Derewiany) ;
  // « Boutlelis » : le nom du fichier de sa photo sur le site officiel des Minimes, l'affiche écrit « MEHDI B »
  mehdi: {
    nom: 'Mehdi Boutlelis',
    court: 'Mehdi',
    role: 'Head coach des Minimes',
    titres: ['Responsable sportif du club', 'DEJEPS', 'BPJEPS boxe anglaise', 'BPJEPS sports de contact'],
    texte: 'Pur produit de l’école Boxing Center, il accompagne chaque boxeur avec exigence et pédagogie, du loisir à la compétition.',
    photo: 'mehdi',
  },
  // le club, 13/10/2026 : leur palmarès remplace les phrases ; 15/10 : leurs vraies photos (Fayez : photo d'Eddy ;
  // Lucas : vidéo Instagram du club), « maîtrise la boxe anglaise » (Eddy) et la partie du stage qu'ils encadrent
  // (lue dans le programme : Fayez les deux préparations physiques, Lucas les deux perfectionnements techniques)
  fayez: {
    nom: 'Fayez Draoui',
    court: 'Fayez',
    role: 'Coach Boxing Center',
    titres: ['12 combats amateurs', 'Maîtrise la boxe anglaise', 'Encadre la préparation physique du stage'],
    // le palmarès, en chiffres, comme celui des boxeurs pros
    bilan: [[12, 'combats']],
    bilanTitre: 'Palmarès chez les amateurs',
    texte: '',
    photo: 'fayez',
  },
  lucas: {
    nom: 'Lucas Kouyate',
    court: 'Lucas',
    role: 'Coach Boxing Center',
    titres: ['21 combats amateurs, 17 victoires', 'Maîtrise la boxe anglaise', 'Encadre le perfectionnement technique du stage'],
    bilan: [[21, 'combats'], [17, 'victoires']],
    bilanTitre: 'Palmarès chez les amateurs',
    texte: '',
    photo: 'lucas',
  },
  johnson: {
    nom: 'Johnson Suffo',
    court: 'Johnson',
    role: 'Boxeur professionnel',
    vedette: 'Classé dans le top 100 mondial chez les poids moyens',
    // palmarès inscrit sur sa carte officielle de coach (saison 2026/2027)
    titres: ['Professionnel : 10 victoires, 1 défaite, 1 nul', 'Passé professionnel aux Minimes en 2018'],
    bilan: [[10, 'victoires'], [1, 'défaite'], [1, 'nul']],
    texte: 'Il vient échanger avec les enfants le mercredi.',
    photo: 'johnson',
  },
};

export const CLUBS = {
  portet: {
    id: 'portet',
    nom: 'Boxing Center Portet-sur-Garonne',
    court: 'Portet',
    ville: 'Portet-sur-Garonne',
    bloc: 'Stage enfants — Boxing Center Portet-sur-Garonne',
    cta: 'Voir le stage à Portet',
    inscrire: 'Inscrire mon enfant à Portet',
    a: 'à Portet',
    // les pages club ont été retirées le 13/10/2026 : le lien d'une salle mène à sa semaine
    programme: '/programme?club=portet',
    adresse: { rue: '61 Route d’Espagne', cp: '31120', ville: 'Portet-sur-Garonne' },
    // point de l'adresse, base adresse nationale (api-adresse.data.gouv.fr, relevé le 12/10/2026)
    geo: { lat: 43.52167, lng: 1.39429 },
    acces: 'Au sud de Toulouse, sur la route d’Espagne.',
    tel: '06 87 90 02 16',
    telHref: '+33687900216',
    email: 'boxingcenterportet@gmail.com',
    accent: 'portet',
    hero: 'portet-walkout',
    photos: ['portet-educative', 'portet-ecole-nb', 'portet-podium', 'portet-pads'],
    equipe: ['valentin', 'mourad', 'marama', 'anna'],
    vedette: 'anna',
    autre: 'minimes',
    intro:
      'À Portet-sur-Garonne, la semaine se passe dans la salle où Valentin Tapia a formé neuf champions de France. Les enfants y travaillent avec Mourad Berraho et Marama Mercier, champions de France, et rencontrent Anna Boullez, boxeuse professionnelle.',
    mapsQuery: 'Boxing+Center+Portet,+61+Route+d%27Espagne,+31120+Portet-sur-Garonne',
  },
  minimes: {
    id: 'minimes',
    nom: 'Boxing Center Minimes',
    court: 'Minimes',
    ville: 'Toulouse',
    quartier: 'Minimes — Barrière de Paris',
    bloc: 'Stage enfants — Boxing Center Minimes',
    cta: 'Voir le stage aux Minimes',
    inscrire: 'Inscrire mon enfant aux Minimes',
    a: 'aux Minimes',
    programme: '/programme?club=minimes',
    adresse: { rue: '12 rue de Fenouillet', cp: '31200', ville: 'Toulouse' },
    // point de l'adresse, base adresse nationale (api-adresse.data.gouv.fr, relevé le 12/10/2026)
    geo: { lat: 43.6265, lng: 1.4306 },
    acces: 'Métro ligne B, station Barrière de Paris, à trois minutes à pied.',
    // le club, 13/10/2026
    tel: '07 72 25 41 17',
    telHref: '+33772254117',
    email: 'boxingcenter31@gmail.com',
    accent: 'minimes',
    hero: 'minimes-ados',
    photos: ['minimes-coaching', 'minimes-jumps', 'minimes-graff', 'minimes-cercle'],
    equipe: ['mehdi', 'fayez', 'lucas', 'johnson'],
    vedette: 'johnson',
    autre: 'portet',
    intro:
      'Aux Minimes, la semaine se passe dans la première salle Boxing Center, ouverte en 2016 : trois rings, des fresques sur les murs, et le berceau de boxeurs devenus professionnels, comme Johnson Suffo. Mehdi Boutlelis, Fayez Draoui et Lucas Kouyate encadrent les enfants toute la semaine.',
    mapsQuery: 'Boxing+Center+Minimes,+12+rue+de+Fenouillet,+31200+Toulouse',
  },
};

export const CLUB_IDS = ['portet', 'minimes'];

export function adresseLigne(club) {
  const a = club.adresse;
  return `${a.rue}, ${a.cp} ${a.ville}`;
}

export function equipe(club) {
  return club.equipe.map((id) => ({ id, ...INTERVENANTS[id] }));
}

/** « Valentin », « Marama et Mourad », « Mourad, Marama et Anna » */
export function listeNoms(ids, longs = false) {
  const noms = ids.map((id) => (longs ? INTERVENANTS[id].nom : INTERVENANTS[id].court));
  if (noms.length < 2) return noms.join('');
  return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;
}

export const EDITEUR = {
  nom: 'SAS BOXING CENTER',
  forme: 'société par actions simplifiée au capital de 1 500 €',
  rcs: 'RCS Toulouse 821 817 889',
  siege: '12 rue de Fenouillet, 31200 Toulouse',
  directeur: 'Sébastien Dutilh',
  hebergeur: 'Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis',
  credits: 'B.M Photographie et Axel Derewiany',
};

/**
 * Le vendeur du stage dans chaque club : celui qui encaisse le paiement et émet la facture.
 * Aligné sur la facture du back (lib/invoice-pdf.js, commit b77e1a2 de Raphaël, 12/10/2026).
 */
export const VENDEURS = {
  portet: 'Noble Art Portésien, association loi 1901, SIRET 444 152 482 00022, 61 route d’Espagne, 31120 Portet-sur-Garonne',
  minimes: `${EDITEUR.nom}, ${EDITEUR.forme}, ${EDITEUR.rcs}, ${EDITEUR.siege}`,
};
