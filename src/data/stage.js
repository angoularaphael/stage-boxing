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
    'Ouvert aux filles et garçons de 8 à 16 ans : débutants, loisirs, boxe éducative et compétiteurs. Les groupes et les oppositions sont adaptés selon l’âge, le poids, le niveau et l’expérience.',
  accroche: 'Pour progresser, se dépasser et partager une expérience sportive en groupe.',
  sousTitre:
    'Une semaine 100 % boxe pour progresser, se dépasser et vivre une vraie expérience sportive encadrée par l’équipe Boxing Center.',
  programme:
    'Technique, tactique, préparation physique, assauts, sac, cohésion, analyse vidéo, découverte du haut niveau, bowling et interclub.',
};

/** Les quatre piliers, mot pour mot depuis les flyers. */
export const PILIERS = [
  {
    id: 'technique',
    titre: 'Technique & Tactique',
    texte: 'Leçons collectives, déplacements, enchaînements, défense et contre-attaque.',
    photo: { portet: 'portet-educative', minimes: 'minimes-coaching' },
  },
  {
    id: 'intensite',
    titre: 'Intensité & Physique',
    texte: 'Sac, renforcement, coordination, piste, explosivité et Boot Camp.',
    photo: { portet: 'portet-pads', minimes: 'minimes-jumps' },
  },
  {
    id: 'haut-niveau',
    titre: 'Haut niveau',
    texte: 'Analyse vidéo, échanges avec des boxeurs expérimentés et combats tests.',
    photo: { portet: 'portet-anna', minimes: 'minimes-graff' },
  },
  {
    id: 'cohesion',
    titre: 'Cohésion',
    texte: 'Défis collectifs, bowling et interclub pour finir la semaine ensemble.',
    photo: { portet: 'portet-ecole-nb', minimes: 'minimes-cercle' },
  },
];

/** Matériel nécessaire (flyers). `id` sert à la liste à cocher. */
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
        titre: 'Leçon collective technique',
        contenu: ['Fondamentaux', 'Déplacements et placements', 'Enchaînements', 'Travail technico-tactique'],
        objectif: 'Perfectionner les bases et améliorer la qualité technique.',
        coachs: { portet: ['valentin'], minimes: ['mehdi'] },
        piliers: ['technique'],
      },
      {
        debut: '14:00',
        fin: '16:00',
        titre: 'Boot Camp & cohésion',
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
        titre: 'Leçon collective',
        contenu: ['Travail technique', 'Déplacements', 'Attaques et défenses', 'Enchaînements et mises en situation'],
        objectif: 'Développer les qualités techniques et apprendre à les utiliser en situation de boxe.',
        coachs: { portet: ['mourad'], minimes: ['fayez'] },
        piliers: ['technique'],
      },
      {
        debut: '14:00',
        fin: '16:00',
        titre: 'Assauts à thème + sac spécifique',
        contenu: ['Assauts avec consignes', 'Travail tactique', 'Gestion de la distance', 'Sac spécifique', 'Intensité et répétition'],
        objectif: 'Mettre la technique en application face à un adversaire.',
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
        titre: 'Immersion dans le haut niveau',
        contenu: ['Analyse vidéo', 'Lecture tactique', 'Questions / réponses', 'Échanges compétition et haut niveau'],
        objectif: 'Découvrir les exigences du haut niveau et apprendre à analyser un combat.',
        coachs: { portet: ['mourad', 'marama', 'anna'], minimes: ['fayez', 'lucas', 'johnson'] },
        temps: 'fort',
        piliers: ['haut-niveau'],
      },
      {
        debut: '16:00',
        fin: '18:00',
        titre: 'Combats tests',
        contenu: ['Mise en situation réelle', 'Oppositions adaptées au niveau et au poids', 'Observation technique et tactique', 'Gestion de l’effort et des émotions'],
        objectif: 'Mettre en pratique les acquis du début de semaine.',
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
        titre: 'Leçon collective technique',
        contenu: ['Perfectionnement', 'Enchaînements', 'Défense et contre-attaque', 'Situations technico-tactiques'],
        objectif: 'Améliorer la maîtrise technique et la prise de décision.',
        coachs: { portet: ['marama'], minimes: ['lucas'] },
        piliers: ['technique'],
      },
      {
        debut: '14:00',
        fin: '16:00',
        titre: 'Séance piste',
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
        titre: 'Coordination + renforcement + école de boxe',
        contenu: ['Coordination spécifique', 'Appuis', 'Renforcement musculaire', 'École de boxe', 'Précision gestuelle'],
        objectif: 'Améliorer la coordination, les appuis et les qualités physiques du boxeur.',
        coachs: { portet: ['mourad', 'marama'], minimes: ['fayez', 'lucas'] },
        piliers: ['intensite'],
      },
      {
        debut: '14:00',
        fin: '16:00',
        titre: 'Leçon collective + assauts à thème + sac',
        contenu: ['Rappel technique', 'Situations tactiques', 'Assauts dirigés', 'Sac spécifique', 'Mise en application avec intensité'],
        objectif: 'Réinvestir l’ensemble du travail effectué durant la semaine.',
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
        titre: 'Bowling — activité cohésion',
        contenu: ['Une matinée plus détendue pour terminer la semaine ensemble autour d’une activité collective'],
        objectif: 'Renforcer la cohésion et partager un moment en dehors de la salle.',
        coachs: { portet: [], minimes: [] },
        piliers: ['cohesion'],
      },
      {
        debut: '14:00',
        fin: null,
        titre: 'Interclub',
        // chaque flyer nomme l'autre club : c'est la rencontre des deux stages
        titreClub: { portet: 'Interclub avec Boxing Center Minimes', minimes: 'Interclub avec Boxing Center Portet-sur-Garonne' },
        contenu: ['Rencontres avec d’autres boxeurs', 'Mise en situation', 'Assauts adaptés aux niveaux', 'Application du travail effectué pendant le stage'],
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
  'haut-niveau': 'Haut niveau',
  cohesion: 'Cohésion',
};

/** Titres courts pour la vue d'ensemble de la semaine (là où le titre entier ne tient pas). */
export const TITRE_COURT = {
  '2026-10-26-10-00': 'Leçon technique',
  '2026-10-26-14-00': 'Boot Camp',
  '2026-10-27-10-00': 'Leçon collective',
  '2026-10-27-14-00': 'Assauts + sac',
  '2026-10-28-11-00': 'Haut niveau',
  '2026-10-28-16-00': 'Combats tests',
  '2026-10-29-10-00': 'Leçon technique',
  '2026-10-29-14-00': 'Piste',
  '2026-10-30-10-00': 'Coordination',
  '2026-10-30-14-00': 'Leçon + assauts',
  '2026-10-31-10-00': 'Bowling',
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
