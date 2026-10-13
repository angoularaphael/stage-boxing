/**
 * La carte de l'enfant en image (1080 × 1512, à partager ou imprimer) et l'agenda des
 * 12 séances. Sur l'image : prénom, âge, niveau, club et coachs — jamais le nom de
 * famille ni la date de naissance.
 */

const W = 1080;
const H = 1512;

function rond(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function mix(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const f = (c) => Math.round(c * k + 5 * (1 - k));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

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
    await Promise.all([document.fonts.load('400 200px "Bebas Neue"'), document.fonts.load('800 40px "Montserrat"'), document.fonts.load('600 40px "Montserrat"')]);
  } catch {
    /* polices système en secours */
  }
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const accent = d.club?.accent || '#e8001c';

  // fond : la lumière de la salle descend du haut
  rond(ctx, 0, 0, W, H, 64);
  ctx.save();
  ctx.clip();
  const g = ctx.createRadialGradient(W / 2, -120, 60, W / 2, 200, 1250);
  g.addColorStop(0, mix(accent, 0.75));
  g.addColorStop(0.55, '#07080d');
  g.addColorStop(1, '#05060a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  let photoOk = false;
  if (d.photo_url) {
    try {
      const img = await chargerImage(d.photo_url);
      const hPhoto = 900;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, hPhoto);
      ctx.clip();
      const scale = Math.max(W / img.width, hPhoto / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (W - dw) / 2, (hPhoto - dh) / 2, dw, dh);
      ctx.restore();
      photoOk = true;
    } catch {
      photoOk = false;
    }
  }
  if (!photoOk) {
    const ini = `${(d.prenom[0] || '').toUpperCase()}${(d.nom[0] || '').toUpperCase()}` || 'VB';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '400 560px "Bebas Neue", "Arial Narrow", sans-serif';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 120;
    ctx.fillStyle = mix(accent, 0.95);
    ctx.fillText(ini, W / 2 - 80, 760);
    ctx.shadowBlur = 0;
  }

  // dégradé de lecture en bas
  const bas = ctx.createLinearGradient(0, 760, 0, H);
  bas.addColorStop(0, 'rgba(5,6,10,0)');
  bas.addColorStop(0.45, 'rgba(5,6,10,0.92)');
  bas.addColorStop(1, '#05060a');
  ctx.fillStyle = bas;
  ctx.fillRect(0, 700, W, H - 700);

  // en-tête
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.font = '800 34px "Montserrat", sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('LES VACANCES', 70, 118);
  ctx.fillText('DES BOXEURS', 70, 162);
  const club = (d.club?.court || '').toUpperCase();
  ctx.font = '800 32px "Montserrat", sans-serif';
  const lw = ctx.measureText(club).width + 56;
  rond(ctx, W - 70 - lw, 84, lw, 60, 30);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.fillStyle = '#05060a';
  ctx.fillText(club, W - 70 - lw + 28, 126);

  // tampons
  ctx.font = '800 26px "Montserrat", sans-serif';
  ctx.textAlign = 'right';
  (d.tampons || []).forEach((t, i) => {
    const y = 560 + i * 62;
    ctx.save();
    ctx.translate(W - 70, y);
    ctx.rotate((i % 2 ? 4 : -6) * (Math.PI / 180));
    const tw = ctx.measureText(t.toUpperCase()).width + 34;
    rond(ctx, -tw, -38, tw, 50, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.fillStyle = '#05060a';
    ctx.fillText(t.toUpperCase(), -17, -4);
    ctx.restore();
  });

  // bas de carte
  ctx.textAlign = 'left';
  ctx.letterSpacing = '5px';
  ctx.fillStyle = accent;
  ctx.font = '800 34px "Montserrat", sans-serif';
  ctx.fillText((d.niveau || 'Boxeur du stage').toUpperCase(), 70, 1060);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = '#ffffff';
  let taille = 210;
  ctx.font = `400 ${taille}px "Bebas Neue", "Arial Narrow", sans-serif`;
  const prenom = (d.prenom || 'Boxeur').toUpperCase();
  while (ctx.measureText(prenom).width > W - 140 && taille > 90) {
    taille -= 8;
    ctx.font = `400 ${taille}px "Bebas Neue", "Arial Narrow", sans-serif`;
  }
  ctx.fillText(prenom, 66, 1250);
  ctx.font = '600 38px "Montserrat", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  const ageTxt = Number.isFinite(d.age) ? `${d.age} ans` : '8–16 ans';
  const prat = d.pratique ? (d.pratique === 'Débutant' ? ' · débutant' : ` · ${d.pratique} de pratique`) : '';
  ctx.fillText(`${ageTxt}${prat}`, 70, 1318);
  const coachs = d.club?.coachs || [];
  ctx.fillText(coachs.length ? `Avec ${coachs.slice(0, -1).join(', ')} et ${coachs[coachs.length - 1]}` : '', 70, 1370);

  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(70, 1410);
  ctx.lineTo(W - 70, 1410);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '800 28px "Montserrat", sans-serif';
  ctx.letterSpacing = '4px';
  ctx.fillStyle = accent;
  ctx.fillText(d.serie ? `N° ${d.serie}` : 'N°', 70, 1460);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('26–31 OCT. 2026 · BOXING CENTER', W - 70, 1460);

  // sceau
  ctx.save();
  // dans la bande libre entre les initiales et le prénom, à gauche des tampons
  ctx.translate(255, 890);
  ctx.rotate(-12 * (Math.PI / 180));
  ctx.beginPath();
  ctx.arc(0, 0, 122, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#e8001c';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 106, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#e8001c';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '5px';
  ctx.font = '400 70px "Bebas Neue", sans-serif';
  ctx.fillText('VALIDÉE', 4, 24);
  ctx.restore();

  ctx.restore();
  // cadre
  rond(ctx, 18, 18, W - 36, H - 36, 50);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3;
  ctx.stroke();

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
    // 60 caractères : sous la limite de 75 octets même avec des lettres accentuées
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
      // l'interclub a lieu au Boxing Center des Minimes pour les deux stages ; le lieu de l'activité de cohésion n'est pas encore donné
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
