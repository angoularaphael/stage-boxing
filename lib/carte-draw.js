/** Dessin carte 1080x1512 — partagé navigateur (canvas) et serveur (@napi-rs/canvas). */

export const CARTE_W = 1080;
export const CARTE_H = 1512;

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

function niveauCarteLabel(niveau) {
  const s = String(niveau || '').trim();
  if (/^debutant$/i.test(s)) return 'DÉBUTANT';
  return (s || 'Boxeur du stage').toUpperCase();
}

function puceDiamant(ctx, x, y, accent) {
  const s = 7;
  ctx.save();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x, y + s);
  ctx.lineTo(x - s, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function ligneAvecPuce(ctx, y, texte, accent) {
  if (!texte) return;
  puceDiamant(ctx, 82, y - 10, accent);
  ctx.fillText(texte, 104, y);
}

function estDebutant(s) {
  const n = String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return !n || n === '0' || n === 'debutant';
}

function drawTampons(ctx, tampons, accent, W) {
  ctx.font = '800 20px "Montserrat", Arial, sans-serif';
  ctx.textAlign = 'left';
  if (typeof ctx.letterSpacing === 'string') ctx.letterSpacing = '1px';
  const gap = 12;
  const pillH = 40;
  const maxX = W - 70;
  let x = 70;
  let y = 1348;
  (tampons || []).forEach((t) => {
    const label = String(t).toUpperCase();
    const tw = Math.min(ctx.measureText(label).width + 28, 260);
    if (x > 70 && x + tw > maxX) {
      x = 70;
      y += pillH + 10;
    }
    rond(ctx, x, y - 28, tw, pillH, 10);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.fillStyle = '#05060a';
    ctx.fillText(label, x + 14, y);
    x += tw + gap;
  });
  return y + 22;
}

export function portraitPourCarte(w, h) {
  if (!w || !h) return false;
  if (w < 200 || h < 200) return false;
  const ratio = h / w;
  if (ratio < 0.65 || ratio > 2.4) return false;
  // Scan type Pass Sport / A4 : petit et plus haut qu'une photo telephone.
  if (w < 700 && ratio > 1.35) return false;
  return true;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} d — prenom, nom, age, niveau, pratique, photo_url, club, serie, tampons
 * @param {{ loadImage: (url: string) => Promise<{ width: number, height: number }> }} io
 */
export async function drawCarte(ctx, d, { loadImage }) {
  const W = CARTE_W;
  const H = CARTE_H;
  const accent = d.club?.accent || '#e8001c';

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
      const img = await loadImage(d.photo_url);
      if (!portraitPourCarte(img.width, img.height)) throw new Error('not_portrait');
      const hPhoto = 800;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, hPhoto);
      ctx.clip();
      const scale = Math.max(W / img.width, hPhoto / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      // Haut de l'image (visage) : ne pas centrer verticalement.
      ctx.drawImage(img, (W - dw) / 2, 0, dw, dh);
      // La photo se fond dans le noir avant sa limite, voile en haut pour le titre.
      const fondu = ctx.createLinearGradient(0, hPhoto - 340, 0, hPhoto);
      fondu.addColorStop(0, 'rgba(5,6,10,0)');
      fondu.addColorStop(0.6, 'rgba(5,6,10,0.75)');
      fondu.addColorStop(1, 'rgba(5,6,10,1)');
      ctx.fillStyle = fondu;
      ctx.fillRect(0, hPhoto - 340, W, 340);
      const voile = ctx.createLinearGradient(0, 0, 0, 280);
      voile.addColorStop(0, 'rgba(5,6,10,0.62)');
      voile.addColorStop(1, 'rgba(5,6,10,0)');
      ctx.fillStyle = voile;
      ctx.fillRect(0, 0, W, 280);
      ctx.restore();
      photoOk = true;
    } catch {
      photoOk = false;
    }
  }
  if (!photoOk) {
    const ini = `${(d.prenom?.[0] || '').toUpperCase()}${(d.nom?.[0] || '').toUpperCase()}` || 'VB';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '400 560px "Bebas Neue", "Arial Narrow", sans-serif';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 120;
    ctx.fillStyle = mix(accent, 0.95);
    ctx.fillText(ini, W / 2 - 80, 760);
    ctx.shadowBlur = 0;
  }

  const bas = ctx.createLinearGradient(0, 760, 0, H);
  bas.addColorStop(0, 'rgba(5,6,10,0)');
  bas.addColorStop(0.45, 'rgba(5,6,10,0.92)');
  bas.addColorStop(1, '#05060a');
  ctx.fillStyle = bas;
  ctx.fillRect(0, 700, W, H - 700);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.font = '800 34px "Montserrat", Arial, sans-serif';
  if (typeof ctx.letterSpacing === 'string') ctx.letterSpacing = '6px';
  ctx.fillText('LES VACANCES', 70, 118);
  ctx.fillText('DES BOXEURS', 70, 162);
  const club = (d.club?.court || '').toUpperCase();
  ctx.font = '800 32px "Montserrat", Arial, sans-serif';
  const lw = ctx.measureText(club).width + 56;
  rond(ctx, W - 70 - lw, 84, lw, 60, 30);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.fillStyle = '#05060a';
  ctx.fillText(club, W - 70 - lw + 28, 126);

  ctx.textAlign = 'left';
  if (typeof ctx.letterSpacing === 'string') ctx.letterSpacing = '5px';
  ctx.fillStyle = accent;
  ctx.font = '800 32px "Montserrat", Arial, sans-serif';
  ctx.fillText(niveauCarteLabel(d.niveau), 70, 990);
  if (typeof ctx.letterSpacing === 'string') ctx.letterSpacing = '0px';
  ctx.fillStyle = '#ffffff';
  let taille = 150;
  ctx.font = `400 ${taille}px "Bebas Neue", "Arial Narrow", sans-serif`;
  const prenom = (d.prenom || 'Boxeur').toUpperCase();
  while (ctx.measureText(prenom).width > W - 140 && taille > 90) {
    taille -= 8;
    ctx.font = `400 ${taille}px "Bebas Neue", "Arial Narrow", sans-serif`;
  }
  ctx.fillText(prenom, 66, 1155);
  ctx.font = '600 32px "Montserrat", Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  const ageTxt = Number.isFinite(d.age) ? `${d.age} ans` : '8–16 ans';
  const pratRaw = String(d.pratique || '').trim();
  const prat = pratRaw && !estDebutant(pratRaw) ? ` · ${pratRaw}` : '';
  ligneAvecPuce(ctx, 1228, `${ageTxt}${prat}`, accent);
  const coachs = d.club?.coachs || [];
  const coachsTxt = coachs.length
    ? `Avec ${coachs.slice(0, -1).join(', ')} et ${coachs[coachs.length - 1]}`
    : '';
  ligneAvecPuce(ctx, 1288, coachsTxt, accent);

  const tamponBas = drawTampons(ctx, d.tampons, accent, W);
  const traitY = Math.max(1418, tamponBas + 18);
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(70, traitY);
  ctx.lineTo(W - 70, traitY);
  ctx.stroke();
  ctx.setLineDash([]);
  const piedY = Math.min(H - 42, traitY + 48);
  ctx.font = '800 26px "Montserrat", Arial, sans-serif';
  if (typeof ctx.letterSpacing === 'string') ctx.letterSpacing = '4px';
  ctx.textAlign = 'left';
  ctx.fillStyle = accent;
  ctx.fillText(d.serie ? `N° ${d.serie}` : 'N°', 70, piedY);
  if (photoOk) {
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.fillText('VALIDÉE', W / 2, piedY);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.fillText('26–31 OCT. 2026', W - 70, piedY);

  if (!photoOk) {
    ctx.save();
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
    if (typeof ctx.letterSpacing === 'string') ctx.letterSpacing = '5px';
    ctx.font = '400 70px "Bebas Neue", Arial, sans-serif';
    ctx.fillText('VALIDÉE', 4, 24);
    ctx.restore();
  }

  ctx.restore();
  rond(ctx, 18, 18, W - 36, H - 36, 50);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3;
  ctx.stroke();
}
