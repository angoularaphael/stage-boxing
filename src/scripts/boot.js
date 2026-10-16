/**
 * Point d'entrée unique, chargé par Base.astro.
 * Chaque page démarre UNE fois : l'ancien tunnel démarrait deux fois, et chaque clic
 * « Payer » créait deux commandes. Le verrou ci-dessous rend la faute impossible.
 * Sur les pages de contenu, chaque module cherche ses propres éléments et ne fait rien
 * s'il n'en trouve pas : une nouvelle page n'a rien à déclarer ici.
 */
import { enTete, menu, barre, allumage, suivi, magnetique } from './ui.js';
import { revelations } from './reveal.js';
import { tarifs } from './tarif.js';
import { places } from './places.js';
import { encartPlaces } from './encart.js';
import { horloge } from './horloge.js';
import { cartes } from './cartes.js';
import { echelle, semaineVivante } from './echelle.js';
import { agenda } from './agenda.js';
import { trouveur } from './trouveur.js';
import { questions } from './questions.js';
import { apercuCarte } from './apercu.js';
import { partage } from './partage.js';

const VERROU = '__vdbDemarre';

async function demarrer() {
  const page = document.documentElement.dataset.page || '';
  enTete();
  menu();
  allumage();
  magnetique();
  revelations();
  if (page === 'inscription') {
    const { inscription } = await import('./inscription.js');
    await inscription();
    return;
  }
  if (page === 'admin') {
    const { admin } = await import('./admin.js');
    admin();
    return;
  }
  partage();
  suivi();
  barre();
  tarifs();
  places();
  encartPlaces();
  horloge();
  cartes();
  echelle();
  semaineVivante();
  agenda();
  trouveur();
  questions();
  apercuCarte();
}

const lancer = () => {
  if (window[VERROU]) return;
  window[VERROU] = true;
  demarrer().catch((err) => console.error('[stage]', err));
};

// une page préchargée au survol attend d'être vraiment affichée : sinon ses animations
// d'entrée et ses appels à l'API se joueraient dans le vide, avant la visite
if (document.prerendering) document.addEventListener('prerenderingchange', lancer, { once: true });
else lancer();
