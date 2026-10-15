/**
 * Questions fréquentes — visibles sur la page ET balisées FAQPage.
 * Chaque réponse s'appuie sur un fait du registre (stage.js, clubs.js, documents.js) ;
 * aucune promesse que les documents sources ne font pas.
 * `theme` range la question sur la page /questions.
 */
import { STAGE, euros } from './stage.js';
import { CLUBS, adresseLigne } from './clubs.js';

const P = STAGE.prix;

export const THEMES = [
  { id: 'stage', nom: 'Le stage' },
  { id: 'securite', nom: 'Sécurité' },
  { id: 'journee', nom: 'Horaires, repas, sac' },
  { id: 'inscription', nom: 'Inscription et paiement' },
  { id: 'salles', nom: 'Portet ou Minimes' },
];

export const FAQ_COMMUNE = [
  {
    theme: 'stage',
    q: 'Mon enfant n’a jamais boxé : peut-il venir ?',
    r: 'Oui. Le stage est ouvert à tous les niveaux et les débutants sont les bienvenus. Les groupes sont faits selon l’âge, le poids, le niveau et l’expérience : votre enfant travaille avec des enfants de son niveau.',
  },
  {
    theme: 'stage',
    q: 'Pour quel âge ?',
    r: 'De 8 à 16 ans, filles et garçons. L’âge retenu est celui du premier jour du stage, le lundi 26 octobre 2026.',
  },
  {
    theme: 'journee',
    q: 'Quels sont les horaires ?',
    r: 'Deux séances par jour, de 10h à 12h et de 14h à 16h. Le mercredi, l’échange avec les boxeurs pros a lieu de 11h à 13h et la mise de gants de 16h à 18h. Le samedi, activité de cohésion de 10h à 12h puis interclub au Boxing Center des Minimes à partir de 14h.',
  },
  {
    theme: 'journee',
    q: 'Le repas est-il compris ?',
    r: 'Non. Chaque enfant prévoit son repas. Les enfants peuvent rester à la salle sous surveillance pendant la pause du midi et manger sur place avant la séance de l’après-midi. Vous indiquez votre choix dans la fiche d’inscription.',
  },
  {
    theme: 'journee',
    q: 'Que faut-il apporter ?',
    r: 'Gants de boxe, protège-dents, casque de boxe, tenue de sport, baskets et bouteille d’eau. Pour les journées complètes : une tenue de rechange et, si possible, une serviette. Et son repas du midi.',
  },
  {
    theme: 'inscription',
    q: 'Combien coûte le stage ?',
    r: `${euros(P.adherent)} pour un adhérent Boxing Center, ${euros(P.nonAdherent)} sinon, pour les 6 jours et les 12 séances ou activités. Le paiement se fait en ligne, comptant, ou en 4 fois avec PayPal si vous y êtes éligible.`,
  },
  {
    theme: 'inscription',
    q: 'Comment se passe l’inscription ?',
    r: 'En trois temps, en ligne : vous payez, vous remplissez la fiche de votre enfant, puis vous validez les documents (autorisation parentale, santé, règlement, droit à l’image). L’inscription n’est complète qu’après ces trois étapes. Si vous vous arrêtez après le paiement, un e-mail vous permet de reprendre.',
  },
  {
    theme: 'securite',
    q: 'La boxe, est-ce sans risque pour mon enfant ?',
    r: 'La sécurité passe avant tout. En boxe éducative, on apprend à toucher avec contrôle, sans puissance : c’est la règle de la Fédération française de boxe. Les mises en situation et les mises de gants se font avec gants, casque et protège-dents, entre enfants d’âge, de poids et de niveau proches, toujours sous le regard des coachs.',
  },
  {
    theme: 'stage',
    q: 'C’est quoi, l’interclub du samedi ?',
    r: 'Le samedi après-midi, à partir de 14h, les deux stages se retrouvent au Boxing Center des Minimes, 12 rue de Fenouillet à Toulouse : les enfants de Portet et ceux des Minimes font des mises de gants adaptées à leur niveau, pour montrer leurs progrès de la semaine. Le club vous précisera l’organisation pendant le stage.',
  },
  {
    theme: 'inscription',
    q: 'Faut-il être adhérent Boxing Center ?',
    r: `Non. Le stage est ouvert à tous : ${euros(P.nonAdherent)} pour un non-adhérent, ${euros(P.adherent)} pour un adhérent.`,
  },
  {
    theme: 'inscription',
    q: 'J’ai deux enfants à inscrire.',
    r: 'Une inscription par enfant. Une fois la première terminée, un bouton relance l’inscription avec vos coordonnées déjà remplies.',
  },
  {
    theme: 'securite',
    q: 'Mon enfant sera-t-il avec des enfants de son âge ?',
    r: 'Oui. Les groupes sont faits selon l’âge, le poids, le niveau et l’expérience. Les mises de gants se font toujours entre enfants d’âge, de poids et de niveau proches.',
  },
];

/** Questions que seule la page /questions affiche en entier (faits des CGV). */
export const FAQ_PLUS = [
  {
    theme: 'inscription',
    q: 'Les places sont-elles limitées ?',
    r: 'Oui. Le nombre de places est limité dans chaque salle, et la place est réservée au moment du paiement. Les places restantes s’affichent sur le site.',
  },
  {
    theme: 'inscription',
    q: 'Et si le stage est annulé ?',
    r: 'Si Boxing Center annule le stage, le montant payé est intégralement remboursé. Pour toute autre demande, contactez le club choisi : ses coordonnées sont en bas de chaque page du site et dans l’e-mail de confirmation.',
  },
  {
    theme: 'securite',
    q: 'Quels documents faut-il valider ?',
    r: 'Après le paiement et la fiche de l’enfant : l’autorisation parentale, la déclaration sur l’état de santé, le règlement intérieur du stage, les conditions générales de vente et les conditions de participation, plus votre choix sur le droit à l’image. Tous les textes sont lisibles avant l’inscription, sur la page Règlement et documents.',
  },
];

const PORTET_OU_MINIMES = {
  theme: 'salles',
  q: 'Portet ou Minimes : quelle différence ?',
  r: 'Aucune sur le programme, les dates, les horaires et les tarifs. Choisissez la salle la plus pratique : Portet-sur-Garonne au sud de Toulouse, ou les Minimes au nord, à trois minutes du métro B Barrière de Paris. Les deux groupes se retrouvent le samedi pour l’interclub.',
};

function locales(id) {
  const c = CLUBS[id];
  const autre = CLUBS[c.autre];
  return [
    {
      theme: 'salles',
      q: `Où se passe le stage ${c.a} ?`,
      r: `Au ${c.nom}, ${adresseLigne(c)}. ${c.acces}`,
    },
    {
      theme: 'salles',
      q: `Qui encadre les enfants ${c.a} ?`,
      r:
        id === 'portet'
          ? 'Valentin Tapia, head coach du Boxing Center Portet, avec Mourad Berraho, triple champion de France, et Marama Mercier, double champion de France. Anna Boullez, boxeuse professionnelle et challenger au titre de championne de France, vient échanger avec les enfants le mercredi.'
          : 'Mehdi Boutlelis, head coach des Minimes, avec Fayez Draoui et Lucas Kouyate. Johnson Suffo, boxeur professionnel classé dans le top 100 mondial chez les poids moyens, vient échanger avec les enfants le mercredi.',
    },
    {
      theme: 'salles',
      q: `Le programme est-il le même qu’${id === 'portet' ? 'aux Minimes' : 'à Portet'} ?`,
      r: `Oui : mêmes dates, mêmes horaires, même programme et mêmes tarifs. Seule l’équipe change, et les deux groupes se retrouvent le samedi pour l’interclub avec ${autre.nom}.`,
    },
  ];
}

export const FAQ_ACCUEIL = [PORTET_OU_MINIMES, ...FAQ_COMMUNE];

/** Les quatre questions que l'accueil garde : le reste vit sur /questions. */
export const FAQ_COURTE = [PORTET_OU_MINIMES, FAQ_COMMUNE[0], FAQ_COMMUNE[7], FAQ_COMMUNE[3]];

/** Toutes les questions, sans doublon, pour /questions (et son FAQPage). */
export function toutesQuestions() {
  const portet = locales('portet');
  const minimes = locales('minimes');
  // « le programme est-il le même » ne se pose qu'une fois : la version neutre suffit
  return [PORTET_OU_MINIMES, ...FAQ_COMMUNE, ...FAQ_PLUS, portet[0], minimes[0], portet[1], minimes[1]];
}
