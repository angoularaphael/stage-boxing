/**
 * Données structurées (schema.org) construites depuis les mêmes faits que la page :
 * ce qu'un moteur lit est exactement ce qu'un parent voit.
 * Event : name, startDate, location (requis par Google) + offers, eventStatus, organizer.
 */
import { SITE_URL } from './site.js';
import { STAGE } from './stage.js';
import { CLUBS, CLUB_IDS, INTERVENANTS, EDITEUR } from './clubs.js';

const ORG_ID = 'https://boxingcenter.fr/#organization';

export function organisation() {
  return {
    '@type': 'SportsOrganization',
    '@id': ORG_ID,
    name: 'Boxing Center',
    legalName: EDITEUR.nom,
    url: 'https://boxingcenter.fr/',
    logo: `${SITE_URL}/img/logo/bc-logo-couleur-800.png`,
    sport: 'Boxe anglaise',
    sameAs: ['https://boxingcenter.fr/', 'https://boxing-center-portet.fr/', 'https://boxe-toulouse.com/'],
  };
}

export function lieu(id) {
  const c = CLUBS[id];
  return {
    '@type': 'SportsActivityLocation',
    '@id': `${SITE_URL}${c.path}#lieu`,
    name: c.nom,
    telephone: c.telHref,
    email: c.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: c.adresse.rue,
      postalCode: c.adresse.cp,
      addressLocality: c.adresse.ville,
      addressRegion: 'Occitanie',
      addressCountry: 'FR',
    },
    geo: { '@type': 'GeoCoordinates', latitude: c.geo.lat, longitude: c.geo.lng },
  };
}

export function evenement(id) {
  const c = CLUBS[id];
  const url = `${SITE_URL}${c.path}`;
  const offre = (nom, prix) => ({
    '@type': 'Offer',
    name: `Stage enfant — ${nom}`,
    price: String(prix),
    priceCurrency: 'EUR',
    availability: 'https://schema.org/InStock',
    validFrom: '2026-10-09T00:00:00+02:00',
    url: `${SITE_URL}/inscription?club=${c.id}`,
  });
  return {
    '@type': 'SportsEvent',
    '@id': `${url}#stage`,
    name: `${STAGE.nom} — stage de boxe enfants ${c.court === 'Portet' ? 'Portet-sur-Garonne' : 'Toulouse Minimes'}`,
    description: `Stage de boxe anglaise pour les 8–16 ans, ${STAGE.dates}, au ${c.nom} : 6 jours, 2 séances ou activités par jour, tous niveaux, filles et garçons. ${STAGE.programme}`,
    url,
    image: [`${SITE_URL}/img/og/${c.id}.jpg`],
    startDate: STAGE.debutISO,
    endDate: STAGE.finISO,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    inLanguage: 'fr-FR',
    sport: 'Boxe anglaise',
    typicalAgeRange: '8-16',
    location: lieu(id),
    organizer: { '@id': ORG_ID },
    performer: c.equipe.map((pid) => ({ '@type': 'Person', name: INTERVENANTS[pid].nom, description: INTERVENANTS[pid].vedette || INTERVENANTS[pid].role })),
    offers: [offre('adhérent Boxing Center', STAGE.prix.adherent), offre('non-adhérent', STAGE.prix.nonAdherent)],
  };
}

export function faq(items) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.r },
    })),
  };
}

export function fil(etapes) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: etapes.map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: `${SITE_URL}${path}`,
    })),
  };
}

export function siteWeb() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#site`,
    url: `${SITE_URL}/`,
    name: 'Les Vacances des Boxeurs — stages enfants Boxing Center',
    inLanguage: 'fr-FR',
    publisher: { '@id': ORG_ID },
  };
}

/** Les intervenants du stage, tels que la page équipe les présente (titres sourcés, sans récompense balisée). */
export function personnes() {
  return CLUB_IDS.flatMap((id) =>
    CLUBS[id].equipe.map((pid) => {
      const p = INTERVENANTS[pid];
      return {
        '@type': 'Person',
        '@id': `${SITE_URL}/equipe#fiche-${pid}`,
        name: p.nom,
        jobTitle: p.role,
        description: p.vedette ? `${p.vedette}. ${p.texte}` : p.texte,
        worksFor: { '@id': ORG_ID },
        workLocation: { '@id': `${SITE_URL}${CLUBS[id].path}#lieu` },
        url: `${SITE_URL}/equipe#fiche-${pid}`,
      };
    }),
  );
}

export function graphe(...noeuds) {
  return { '@context': 'https://schema.org', '@graph': noeuds };
}
