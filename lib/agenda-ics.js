/**
 * Calendrier iCal des 12 seances du stage (serveur / e-mails).
 * Source : meme grille que src/data/stage.js (dates fixes 26-31 oct 2026).
 */
import { STAGE } from './config.js';

const SEMAINE = [
  {
    date: '2026-10-26',
    seances: [
      { debut: '10:00', fin: '12:00', titre: 'Lecon collective technique' },
      { debut: '14:00', fin: '16:00', titre: 'Boot Camp & cohesion' },
    ],
  },
  {
    date: '2026-10-27',
    seances: [
      { debut: '10:00', fin: '12:00', titre: 'Lecon collective' },
      { debut: '14:00', fin: '16:00', titre: 'Assauts a theme + sac' },
    ],
  },
  {
    date: '2026-10-28',
    seances: [
      { debut: '11:00', fin: '13:00', titre: 'Immersion haut niveau' },
      { debut: '16:00', fin: '18:00', titre: 'Combats tests' },
    ],
  },
  {
    date: '2026-10-29',
    seances: [
      { debut: '10:00', fin: '12:00', titre: 'Lecon collective technique' },
      { debut: '14:00', fin: '16:00', titre: 'Piste' },
    ],
  },
  {
    date: '2026-10-30',
    seances: [
      { debut: '10:00', fin: '12:00', titre: 'Coordination' },
      { debut: '14:00', fin: '16:00', titre: 'Lecon + assauts' },
    ],
  },
  {
    date: '2026-10-31',
    seances: [
      { debut: '10:00', fin: '12:00', titre: 'Bowling' },
      { debut: '14:00', fin: '18:00', titre: 'Interclub Portet x Minimes' },
    ],
  },
];

const CLUB_META = {
  portet: {
    nom: 'Boxing Center Portet-sur-Garonne',
    adresse: '61 Route d\'Espagne, 31120 Portet-sur-Garonne',
  },
  minimes: {
    nom: 'Boxing Center Minimes',
    adresse: '12 rue de Fenouillet, 31200 Toulouse',
  },
};

function utcStamp(date, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(
    `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+01:00`
  );
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcs(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function fold(line) {
  const out = [];
  let reste = line;
  while (reste.length > 60) {
    out.push(reste.slice(0, 60));
    reste = ` ${reste.slice(60)}`;
  }
  out.push(reste);
  return out.join('\r\n');
}

export function buildStageAgendaIcs(order) {
  const clubId = order?.club === 'portet' ? 'portet' : 'minimes';
  const club = CLUB_META[clubId];
  const prenom = order?.child?.first_name || '';
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const events = [];

  for (const jour of SEMAINE) {
    for (const s of jour.seances) {
      const ailleurs = /Bowling|Interclub/i.test(s.titre);
      const lines = [
        'BEGIN:VEVENT',
        `UID:${jour.date}-${s.debut.replace(':', '')}-${clubId}-${order?.id || 'stage'}@stage-boxing.vercel.app`,
        `DTSTAMP:${now}`,
        `DTSTART:${utcStamp(jour.date, s.debut)}`,
        s.fin ? `DTEND:${utcStamp(jour.date, s.fin)}` : null,
        `SUMMARY:${escapeIcs(`Stage boxe${prenom ? ` (${prenom})` : ''} — ${s.titre}`)}`,
        `LOCATION:${escapeIcs(ailleurs ? 'Lieu precise par le club' : `${club.nom}, ${club.adresse}`)}`,
        `DESCRIPTION:${escapeIcs(
          `${STAGE.name} — ${club.nom}. Materiel : gants, protege-dents, casque, tenue, baskets, eau. Repas non fourni.`
        )}`,
        'END:VEVENT',
      ].filter(Boolean);
      events.push(lines.map(fold).join('\r\n'));
    }
  }

  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Boxing Center//Les Vacances des Boxeurs//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n');

  const filename = `agenda-stage-${prenom ? prenom.toLowerCase().replace(/[^a-z0-9]+/gi, '-') + '-' : ''}${clubId}.ics`;
  return { filename, content: Buffer.from(body, 'utf8'), text: body };
}

/** Lien Google Calendar (premiere seance + description de la semaine). */
export function googleCalendarUrl(order) {
  const clubId = order?.club === 'portet' ? 'portet' : 'minimes';
  const club = CLUB_META[clubId];
  const prenom = order?.child?.first_name || 'enfant';
  const start = utcStamp('2026-10-26', '10:00').replace(/Z$/, '');
  const end = utcStamp('2026-10-31', '18:00').replace(/Z$/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${STAGE.name} — ${prenom}`,
    dates: `${start}/${end}`,
    details: `${STAGE.name} (${STAGE.dates_label}) a ${club.nom}. 12 seances. Voir le fichier .ics joint pour chaque creneau.`,
    location: club.adresse,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
