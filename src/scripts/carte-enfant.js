/**
 * La carte de l'enfant en image (1080 × 1512, à partager ou imprimer) et l'agenda des
 * 12 séances. Sur l'image : prénom, âge, niveau, club et coachs — jamais le nom de
 * famille ni la date de naissance.
 */

import { CARTE_H, CARTE_W, drawCarte } from '../../lib/carte-draw.js';

function chargerImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('photo_load'));
    img.src = url;
  });
}

export async function carteEnImage(d) {
  try {
    await Promise.all([
      document.fonts.load('400 200px "Bebas Neue"'),
      document.fonts.load('800 40px "Montserrat"'),
      document.fonts.load('600 40px "Montserrat"'),
    ]);
  } catch {
    /* polices système en secours */
  }
  const c = document.createElement('canvas');
  c.width = CARTE_W;
  c.height = CARTE_H;
  const ctx = c.getContext('2d');
  await drawCarte(ctx, d, { loadImage: chargerImage });
  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}

export function telecharger(blob, nom) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** iCalendar : les 12 séances, en UTC (la semaine est entièrement en UTC+1). */
export function agendaIcs(D, clubId, prenom = '') {
  const club = D.clubs[clubId];
  const utc = (date, hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+01:00`);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  const echap = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  const plier = (ligne) => {
    const out = [];
    let reste = ligne;
    while (reste.length > 60) {
      out.push(reste.slice(0, 60));
      reste = ` ${reste.slice(60)}`;
    }
    out.push(reste);
    return out.join('\r\n');
  };
  const maintenant = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ev = [];
  D.semaine.forEach((j) => {
    j.seances.forEach((s) => {
      const titre = s.titreClub ? s.titreClub[clubId] : s.titre;
      const lieu = s.lieu && D.clubs[s.lieu] ? D.clubs[s.lieu] : club;
      const ailleurs = /Activité cohésion/.test(s.titre);
      const lignes = [
        'BEGIN:VEVENT',
        `UID:${j.date}-${s.debut.replace(':', '')}-${clubId}@stages.boxingcenter.fr`,
        `DTSTAMP:${maintenant}`,
        `DTSTART:${utc(j.date, s.debut)}`,
        s.fin ? `DTEND:${utc(j.date, s.fin)}` : null,
        `SUMMARY:${echap(`Stage boxe${prenom ? ` (${prenom})` : ''} — ${titre}`)}`,
        `LOCATION:${echap(ailleurs ? 'Lieu précisé par le club' : `${lieu.nom}, ${lieu.adresse}`)}`,
        `DESCRIPTION:${echap(`Les Vacances des Boxeurs — ${club.nom}. Matériel : gants, protège-dents, casque, tenue, baskets, eau. Repas non fourni.`)}`,
        'END:VEVENT',
      ].filter(Boolean);
      ev.push(lignes.map(plier).join('\r\n'));
    });
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Boxing Center//Les Vacances des Boxeurs//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...ev, 'END:VCALENDAR', ''].join('\r\n');
}
