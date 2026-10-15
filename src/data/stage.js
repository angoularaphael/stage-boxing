/**
 * Les faits du stage — source unique pour les pages, le tunnel et les données structurées.
 * Sources : flyers PDF Portet et Minimes + cahier des charges (reçus le 10/10/2026).
 * Registre détaillé, avec sources : .research/02-faits.md (hors dépôt).
 * Rien n'est écrit ici qui ne vienne de ces documents.
 */

export const STAGE = {
  id: 'vacances-boxeurs-2026-10',
  nom: 'Les Vacances des Boxeurs',
  discipline: 'boxe anglaise',
  debut: '2026-10-26',
  fin: '2026-10-31',
  // le 25/10/2026 la France passe à l'heure d'hiver : le stage se déroule en UTC+1
  debutISO: '2026-10-26T10:00:00+01:00',
  finISO: '2026-10-31T18:00:00+01:00',
  dates: 'du lundi 26 au samedi 31 octobre 2026',
  datesCourt: '26–31 octobre 2026',
  vacances: 'deuxième semaine des vacances de la Toussaint',
  ageMin: 8,
  ageMax: 16,
  // l'âge se calcule au premier jour du stage, comme le fait l'API
  ageAu: '2026-10-26',
  jours: 6,
  activitesParJour: 2,
  activites: 12,
  prix: { adherent: 80, nonAdherent: 140 },
  niveaux: ['Débutant', 'Loisir', 'Boxe éducative', 'Amateur / compétiteur'],
  inclus: 'Le tarif comprend l’intégralité du stage : 6 jours et 2 séances ou activités par jour.',
  repas:
    'Le repas n’est pas pris en charge : chaque participant prévoit le sien. Les enfants peuvent rester à la salle sous surveillance pendant la pause du midi et manger sur place avant la séance de l’après-midi.',
  public:
    'Ouvert aux filles et garçons de 8 à 16 ans : débutants, loisirs, boxe éducative et compétiteurs. Les groupes sont faits selon l’âge, le poids, le niveau et l’expérience de chaque enfant.',
  accroche: 'Pour progresser, se dépasser et partager une expérience sportive en groupe.',
  sousTitre:
    'Une semaine 100 % boxe pour progresser, se dépasser et vivre une vraie expérience sportive encadrée par l’équipe Boxing Center.',
  programme:
    'Ateliers techniques, préparation physique, travail tactique, mises en situation, analyse vidéo, échanges avec nos boxeurs professionnels, cohésion de groupe et interclub.',
};

/** Les quatre piliers, mot pour mot depuis les flyers. */
export const PILIERS = [
  {
    id: 'technique',
    titre: 'Perfectionnement technique',
    texte: 'Ateliers techniques, déplacements, enchaînements, défense et contre-attaque.',
    photo: { portet: 'portet-educative', minimes: 'minimes-coaching' },
  },
  {
    id: 'intensite',
    titre: 'Préparation physique',
    texte: 'Renforcement, coordination, fractionné sur piste, travail au sac et ateliers physiques.',
    photo: { portet: 'portet-pads', minimes: 'minimes-jumps' },
  },
  {
    id: 'haut-niveau',
    titre: 'Travail tactique & échanges',
    texte: 'Analyse vidéo, rencontre et échange avec nos boxeurs professionnels, mise en situation.',
    photo: { portet: 'portet-anna', minimes: 'minimes-graff' },
  },
  {
    id: 'cohesion',
    titre: 'Cohésion de groupe',
    texte: 'Défis collectifs, activité de cohésion et interclub pour finir la semaine ensemble.',
    photo: { portet: 'portet-ecole-nb', minimes: 'minimes-cercle' },
  },
];

/** Matériel nécessaire (flyers). */
export const MATERIEL = [
  { id: 'gants', nom: 'Gants de boxe' },
  { id: 'dents', nom: 'Protège-dents' },
  { id: 'casque', nom: 'Casque de boxe' },
  { id: 'tenue', nom: 'Tenue de sport' },
  { id: 'baskets', nom: 'Chaussures de sport type baskets' },
  { id: 'eau', nom: 'Bouteille d’eau' },
  { id: 'rechange', nom: 'Tenue de rechange', note: 'pour les journées complètes' },
  { id: 'serviette', nom: 'Serviette', note: 'si possible' },
  { id: 'repas', nom: 'Son repas du midi', note: 'non fourni' },
];

/**
 * La semaine. Mêmes horaires et même programme dans les deux clubs ;
 * seuls les coachs changent (correspondance du cahier §6, vérifiée sur les deux PDF).
 * `coachs` : identifiants des intervenants (voir clubs.js). Un créneau sans coach
 * nommé dans les PDF n'en reçoit pas.
 */
export const SEMAINE = [
  {
    date: '2026-10-26',
    jour: 'Lundi',
    court: 'Lun',
    num: '26',
    seances: [
      {
        debut: '10:00',
        fin: '12:00',
        titre: 'Atelier technique',
        contenu: ['Fondamentaux', 'Déplacements et placements', 'Enchaînements', 'Travail technico-tactique'],
        objectif: 'Perfectionner les bases et améliorer la qualité technique.',
        coachs: { portet: ['valentin'], minimes: ['mehdi'] },
        piliers: ['technique'],
      },
      {
        debut: '14:00',
        fin: '16:00',
        titre: 'Préparation physique',
        contenu: ['Ateliers physiques', 'Défis individuels et collectifs', 'Travail en équipe', 'Dépassement de soi', 'Jeux de cohésion'],
        objectif: 'Développer l’esprit d’équipe, la condition physique et le dépassement de soi.',
        coachs: { portet: ['marama', 'mourad'], minimes: ['lucas', 'fayez'] },
        piliers: ['intensite', 'cohesion'],
      },
    ],
  },
  {
    date: '2026-10-27',
    jour: 'Mardi',
    court: 'Mar',
    num: '27',
    seances: [
      {
        debut: '10:00',
        fin: '12:00',
        titre: 'Atelier technique',
        contenu: ['Travail technique', 'Déplacements', 'Attaques et défenses', 'Enchaînements et mises en situation'],
        objectif: 'Développer les qualités techniques et apprendre à les utiliser en situation de boxe.',
        coachs: { portet: ['mourad'], minimes: ['fayez'] },
        piliers: ['technique'],
      },
      {
        debut: '14:00',
        fin: '16:00',
        titre: 'Mise en situation et perfectionnement technique',
        contenu: ['Mises en situation avec consignes', 'Travail tactique', 'Gestion de la distance', 'Travail au sac', 'Répétition des gestes'],
        objectif: 'Appliquer la technique en situation, face à un partenaire du même niveau.',
        coachs: { portet: ['marama'], minimes: ['lucas'] },
        piliers: ['technique', 'intensite'],
      },
    ],
  },
  {
    date: '2026-10-28',
    jour: 'Mercredi',
    court: 'Mer',
    num: '28',
    seances: [
      {
        debut: '11:00',
        fin: '13:00',
        titre: 'Échange avec les boxeurs pros',
        contenu: ['Rencontre avec nos boxeurs professionnels', 'Analyse vidéo', 'Lecture tactique', 'Questions / réponses', 'Leur parcours et la compétition'],
        objectif: 'Découvrir le parcours de nos boxeurs professionnels, leur poser ses questions et apprendre à analyser la boxe en vidéo.',
        coachs: { portet: ['mourad', 'marama', 'anna'], minimes: ['fayez', 'lucas', 'johnson'] },
        temps: 'fort',
        piliers: ['haut-niveau'],
      },
      {
        debut: '16:00',
        fin: '18:00',
        titre: 'Mise en situation / mise de gants',
        contenu: ['Mise en situation réelle', 'Mises de gants adaptées au niveau et au poids', 'Observation technique et tactique', 'Gestion de l’effort et des émotions'],
        objectif: 'Mettre en pratique les acquis du début de semaine, avec gants, casque et protège-dents, sous le regard des coachs.',
        coachs: { portet: [], minimes: [] },
        temps: 'fort',
        piliers: ['haut-niveau'],
      },
    ],
  },
  {
    date: '2026-10-29',
    jour: 'Jeudi',
    court: 'Jeu',
    num: '29',
    seances: [
      {
        debut: '10:00',
        fin: '12:00',
        titre: 'Perfectionnement technique',
        contenu: ['Précision des gestes', 'Enchaînements', 'Défense et contre-attaque', 'Situations technico-tactiques'],
        objectif: 'Améliorer la maîtrise technique et la prise de décision.',
        coachs: { portet: ['marama'], minimes: ['lucas'] },
        piliers: ['technique'],
      },
      {
        debut: '14:00',
        fin: '16:00',
        titre: 'Préparation physique / fractionné piste',
        contenu: ['Course', 'Vitesse', 'Endurance', 'Fractionné', 'Explosivité'],
        objectif: 'Développer les qualités physiques spécifiques nécessaires au boxeur.',
        coachs: { portet: ['mourad'], minimes: ['fayez'] },
        piliers: ['intensite'],
      },
    ],
  },
  {
    date: '2026-10-30',
    jour: 'Vendredi',
    court: 'Ven',
    num: '30',
    seances: [
      {
        debut: '10:00',
        fin: '12:00',
        titre: 'Ateliers de coordination / déplacements',
        contenu: ['Coordination spécifique', 'Appuis et déplacements', 'Renforcement musculaire', 'École de boxe', 'Précision gestuelle'],
        objectif: 'Améliorer la coordination, les appuis, les déplacements et les qualités physiques du boxeur.',
        coachs: { portet: ['mourad', 'marama'], minimes: ['fayez', 'lucas'] },
        piliers: ['intensite'],
      },
      {
        debut: '14:00',
        fin: '16:00',
        titre: 'Perfectionnement technique individualisé + mise en situation',
        contenu: ['Rappel technique', 'Conseils individuels', 'Situations tactiques', 'Mises en situation dirigées', 'Travail au sac'],
        objectif: 'Réinvestir l’ensemble du travail de la semaine, avec des conseils pour chaque enfant.',
        coachs: { portet: ['valentin'], minimes: ['mehdi'] },
        piliers: ['technique', 'intensite'],
      },
    ],
  },
  {
    date: '2026-10-31',
    jour: 'Samedi',
    court: 'Sam',
    num: '31',
    seances: [
      {
        debut: '10:00',
        fin: '12:00',
        titre: 'Activité cohésion de groupe',
        contenu: ['Une matinée plus détendue pour terminer la semaine ensemble autour d’une activité collective'],
        objectif: 'Renforcer la cohésion du groupe et partager un moment ensemble.',
        coachs: { portet: [], minimes: [] },
        piliers: ['cohesion'],
      },
      {
        debut: '14:00',
        fin: null,
        titre: 'Interclub',
        // le club, 13/10/2026 : le nom reste « Interclub Portet × Minimes » et les deux stages se retrouvent au Boxing Center des Minimes
        titreClub: { portet: 'Interclub Portet × Minimes', minimes: 'Interclub Portet × Minimes' },
        lieu: 'minimes',
        contenu: ['Rencontres avec d’autres boxeurs', 'Mise en situation', 'Mises de gants adaptées aux niveaux', 'Application du travail effectué pendant le stage'],
        objectif: 'Terminer la semaine par une expérience concrète et valoriser les progrès réalisés.',
        coachs: { portet: [], minimes: [] },
        temps: 'final',
        piliers: ['cohesion'],
      },
    ],
  },
];

/** Le nom court de chaque pilier, pour les étiquettes des séances. */
export const PILIER_COURT = {
  technique: 'Technique',
  intensite: 'Physique',
  'haut-niveau': 'Tactique',
  cohesion: 'Cohésion',
};

/** Titres courts pour la vue d'ensemble de la semaine (là où le titre entier ne tient pas). */
export const TITRE_COURT = {
  '2026-10-26-10-00': 'Atelier technique',
  '2026-10-26-14-00': 'Prépa physique',
  '2026-10-27-10-00': 'Atelier technique',
  '2026-10-27-14-00': 'Mise en situation',
  '2026-10-28-11-00': 'Bo\u00ADxeurs pros', // à 320 px, « Boxeurs » dépasse de 3 px d'un bloc de deux heures
  '2026-10-28-16-00': 'Mise de gants',
  '2026-10-29-10-00': 'Per\u00ADfec\u00ADtion\u00ADne\u00ADment',
  '2026-10-29-14-00': 'Prépa physique',
  '2026-10-30-10-00': 'Coor\u00ADdi\u00ADna\u00ADtion', // césures explicites : les mots longs ne tiennent pas d'un bloc à 320–375 px
  '2026-10-30-14-00': 'Per\u00ADfec\u00ADtion\u00ADne\u00ADment',
  '2026-10-31-10-00': 'Cohésion',
  '2026-10-31-14-00': 'Interclub',
};

/** « 14:30 » → 14.5 : la position d'un créneau sur l'échelle de la semaine. */
export function heures(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h + m / 60;
}

/** Identifiant stable d'une séance : « 2026-10-28-11-00 ». */
export function seanceId(jour, s) {
  return `${jour.date}-${s.debut.replace(':', '-')}`;
}

/** Les séances qui travaillent un pilier, dans l'ordre de la semaine. */
export function seancesPilier(pilier) {
  return SEMAINE.flatMap((j) => j.seances.filter((s) => (s.piliers || []).includes(pilier)).map((s) => ({ jour: j, seance: s })));
}

/**
 * Les créneaux d'un intervenant, lus dans SEMAINE (donc dans les PDF) : ce que l'enfant
 * fera avec lui, et quand. Un intervenant ne travaille que dans son club.
 */
export function seancesDe(personne) {
  const liste = [];
  SEMAINE.forEach((j) =>
    j.seances.forEach((s) => {
      Object.entries(s.coachs).forEach(([club, ids]) => {
        if (ids.includes(personne)) liste.push({ jour: j, seance: s, club, titre: s.titreClub ? s.titreClub[club] : s.titre });
      });
    }),
  );
  return liste;
}

/** Prix lisibles. */
export function euros(n) {
  return `${Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;
}

/** « 10:00 » → « 10h ». */
export function heure(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

export function creneau(s) {
  return s.fin ? `${heure(s.debut)} – ${heure(s.fin)}` : `à partir de ${heure(s.debut)}`;
}
