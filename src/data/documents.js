/**
 * Les documents du stage (cahier §10), adaptés aux 8–16 ans.
 * Une seule source : les pages /cgv et /reglement et l'étape « Documents » du tunnel
 * affichent ces mêmes textes. À faire valider par la direction (cahier §10) avant toute
 * diffusion hors du site ; version datée ci-dessous.
 *
 * `cle` = nom du champ attendu par l'API (POST /api/order, action « documents »).
 */
import { STAGE, euros } from './stage.js';
import { VENDEURS } from './clubs.js';

export const VERSION_DOCUMENTS = '13 octobre 2026';

export const DOCUMENTS = [
  {
    id: 'autorisation',
    cle: 'parental',
    titre: 'Autorisation parentale',
    accord: 'J’autorise mon enfant à participer au stage.',
    tampon: 'Autorisation',
    sections: [
      {
        p: [
          'Je soussigné(e), responsable légal de l’enfant inscrit, autorise mon enfant à participer au stage de boxe anglaise « Les Vacances des Boxeurs », organisé du lundi 26 au samedi 31 octobre 2026 par Boxing Center, dans le club choisi lors de l’inscription.',
          'J’autorise mon enfant à prendre part à l’ensemble des activités du programme : ateliers techniques, préparation physique, mises en situation et mises de gants adaptées à son âge, son poids et son niveau, fractionné sur piste, activité de cohésion et interclub.',
        ],
      },
    ],
  },
  {
    id: 'sante',
    cle: 'health',
    titre: 'Déclaration sur l’état de santé',
    accord: 'Je déclare avoir communiqué l’état de santé et l’aptitude de mon enfant.',
    tampon: 'Santé',
    sections: [
      {
        p: [
          'Je certifie avoir communiqué aux organisateurs toutes les informations utiles concernant l’état de santé de mon enfant et son aptitude à la pratique sportive : allergies, traitement en cours, blessure ou problème médical.',
          'Je m’engage à prévenir le club de tout changement survenu avant ou pendant le stage.',
          'En cas d’urgence, j’autorise l’encadrement à prendre les mesures nécessaires, notamment à faire appel aux services de secours, et je serai prévenu(e) sans délai au numéro indiqué dans la fiche.',
        ],
      },
    ],
  },
  {
    id: 'reglement',
    cle: 'reglement',
    titre: 'Règlement intérieur du stage',
    accord: 'J’accepte le règlement intérieur du stage.',
    tampon: 'Règlement',
    lien: '/reglement',
    sections: [
      {
        h: 'Respect',
        p: ['Chaque enfant respecte ses coachs, les autres participants, la salle et le matériel. Les consignes des coachs s’appliquent à tout moment, sur le ring comme en dehors.'],
      },
      {
        h: 'Sécurité',
        p: [
          'Le port du matériel de protection est obligatoire pendant les mises en situation et les mises de gants : gants, casque et protège-dents.',
          'Les oppositions sont organisées par les coachs et adaptées à l’âge, au poids, au niveau et à l’expérience de chacun.',
          'Toute douleur, blessure ou malaise se signale tout de suite à un coach.',
        ],
      },
      {
        h: 'Horaires',
        p: ['Les enfants arrivent à l’heure indiquée pour chaque séance. En cas de retard ou d’absence, la famille prévient le club.'],
      },
      {
        h: 'Pause du midi',
        p: ['Le repas n’est pas fourni. Les enfants qui restent à la salle pendant la pause du midi y sont sous surveillance et mangent sur place ; les autres quittent la structure selon le choix indiqué par la famille dans la fiche d’inscription.'],
      },
      {
        h: 'Tenue et hygiène',
        p: ['Tenue de sport, baskets, bouteille d’eau. Pour les journées complètes, une tenue de rechange et, si possible, une serviette.'],
      },
    ],
  },
  {
    id: 'cgv',
    cle: 'cgv',
    titre: 'Conditions générales de vente',
    accord: 'J’accepte les conditions générales de vente du stage.',
    tampon: 'CGV',
    lien: '/cgv',
    sections: [
      {
        h: '1. Organisateur et vendeur',
        p: [
          'Le stage est organisé dans deux salles du réseau Boxing Center. Le vendeur est le club choisi à l’inscription : c’est lui qui encaisse le paiement et émet la facture.',
          `À Portet-sur-Garonne : ${VENDEURS.portet}.`,
          `Aux Minimes : ${VENDEURS.minimes}.`,
        ],
      },
      {
        h: '2. Objet',
        p: [`Les présentes conditions régissent la vente en ligne du stage de boxe anglaise « ${STAGE.nom} », ${STAGE.dates}, au Boxing Center Portet-sur-Garonne ou au Boxing Center Minimes, selon le club choisi.`],
      },
      {
        h: '3. Public',
        p: ['Le stage est ouvert aux filles et garçons de 8 à 16 ans, tous niveaux. L’âge retenu est celui du premier jour du stage.'],
      },
      {
        h: '4. Prix',
        p: [
          `${euros(STAGE.prix.nonAdherent)} pour un non-adhérent, ${euros(STAGE.prix.adherent)} pour un adhérent Boxing Center (sur déclaration du responsable légal). ${STAGE.inclus} Le repas n’est pas inclus.`,
        ],
      },
      {
        h: '5. Paiement',
        p: ['Le paiement se fait en ligne, avant le formulaire d’inscription, par carte bancaire (comptant ou en plusieurs fois aux Minimes), ou par PayPal (comptant, ou en plusieurs fois si le parent y est éligible).'],
      },
      {
        h: '6. Inscription complète',
        p: ['L’inscription n’est complète qu’après le paiement, le formulaire enfant rempli et les documents validés. Après le paiement, un e-mail permet de reprendre l’inscription à tout moment.'],
      },
      {
        h: '7. Places',
        p: ['Le nombre de places est limité dans chaque club. La place est réservée au paiement.'],
      },
      {
        h: '8. Annulation',
        p: [
          'Conformément à l’article L221-28, 12° du Code de la consommation, le droit de rétractation ne s’applique pas aux activités de loisirs fournies à une date déterminée.',
          'Si le stage est annulé par Boxing Center, le montant payé est intégralement remboursé. Pour toute autre demande, contactez le club choisi.',
        ],
      },
      {
        h: '9. Données personnelles',
        p: ['Les informations saisies servent uniquement à l’inscription et au bon déroulement du stage (encadrement, sécurité, contact des familles). Vous pouvez demander leur consultation, leur correction ou leur suppression auprès du club choisi.'],
      },
    ],
  },
  {
    id: 'participation',
    cle: 'participation',
    titre: 'Conditions de participation et pause du midi',
    accord: 'J’accepte les conditions de participation et l’organisation de la pause du midi.',
    tampon: 'Participation',
    sections: [
      {
        p: [
          'Mon enfant participe au stage dans le groupe et selon le programme définis par les coachs.',
          'Le repas n’est pas pris en charge : mon enfant apporte le sien. S’il reste à la salle pendant la pause du midi, il y est sous surveillance ; sinon, il quitte la structure selon le choix que j’ai indiqué dans la fiche.',
          'Mon enfant vient avec le matériel nécessaire : gants de boxe, protège-dents, casque, tenue de sport, baskets et bouteille d’eau.',
        ],
      },
    ],
  },
];

/** Le droit à l'image n'est pas un accord obligatoire : c'est un choix oui / non. */
export const DROIT_IMAGE = {
  cle: 'image_rights',
  titre: 'Droit à l’image',
  oui: 'J’autorise la prise et l’utilisation de photos et de vidéos de mon enfant dans le cadre de la communication du stage et du club.',
  non: 'Je n’autorise pas l’utilisation de l’image de mon enfant.',
};

export const DOCS_OBLIGATOIRES = DOCUMENTS.map((d) => d.cle);
