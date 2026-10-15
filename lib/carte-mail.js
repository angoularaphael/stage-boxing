/**
 * Carte boxeur pour e-mail (HTML + SVG telechargeable).
 * Meme informations que la carte ecran : prenom, age, niveau, coachs, serie — pas le nom de famille.
 */
import { STAGE } from './config.js';

const CLUBS = {
  portet: {
    id: 'portet',
    court: 'Portet',
    nom: 'Boxing Center Portet-sur-Garonne',
    accent: '#3d6bff',
    coachs: ['Valentin', 'Mourad', 'Marama', 'Anna'],
  },
  minimes: {
    id: 'minimes',
    court: 'Minimes',
    nom: 'Boxing Center Minimes',
    accent: '#7cc64a',
    coachs: ['Mehdi', 'Fayez', 'Lucas', 'Johnson'],
  },
};

const TAMPONS = ['Autorisation', 'Sante', 'Reglement', 'CGV', 'Participation'];

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clubMeta(order) {
  return CLUBS[order?.club === 'portet' ? 'portet' : 'minimes'];
}

function serieOf(order) {
  return String(order?.id || '').slice(-4).toUpperCase() || '····';
}

function pratiqueLabel(years) {
  const y = String(years || '').trim();
  if (!y || /^debutant$/i.test(y) || y === '0') return 'debutant';
  if (/^\d+$/.test(y)) return `${y} an${Number(y) > 1 ? 's' : ''} de pratique`;
  return y;
}

function coachsLine(club) {
  const list = club.coachs || [];
  if (!list.length) return '';
  if (list.length === 1) return `Avec ${list[0]}`;
  return `Avec ${list.slice(0, -1).join(', ')} et ${list[list.length - 1]}`;
}

export function cardDataFromOrder(order) {
  const club = clubMeta(order);
  const child = order?.child || {};
  return {
    prenom: child.first_name || 'Boxeur',
    age: Number.isFinite(child.age) ? child.age : null,
    niveau: child.level || 'Boxeur du stage',
    pratique: pratiqueLabel(child.practice_years),
    photo_url: child.photo_url || '',
    club,
    serie: serieOf(order),
    tampons: TAMPONS,
  };
}

function escAttrUrl(url) {
  return String(url || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;');
}

/** Bloc HTML (clients mail) qui ressemble a la carte validee. */
export function buildCarteHtml(order) {
  const d = cardDataFromOrder(order);
  const accent = d.club.accent;
  const ageTxt = d.age != null ? `${d.age} ans` : '8-16 ans';
  const prat = d.pratique ? ` · ${d.pratique}` : '';
  const coachs = coachsLine(d.club);
  const tampons = (d.tampons || [])
    .map(
      (t) =>
        `<span style="display:inline-block;margin:0 4px 6px 0;padding:4px 10px;border-radius:999px;background:${accent};color:#05060a;font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase">${esc(t)}</span>`
    )
    .join('');
  const photoRow = d.photo_url
    ? `<tr><td style="padding:0;line-height:0"><img src="${escAttrUrl(d.photo_url)}" alt="" width="420" style="display:block;width:100%;max-width:420px;height:auto" /></td></tr>`
    : '';

  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:420px;margin:0 auto 24px;border-collapse:collapse;background:#07080d;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.12)">
  ${photoRow}
  <tr>
    <td style="padding:22px 22px 8px;font-family:Arial,Helvetica,sans-serif;color:#fff">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.85)">Les Vacances<br>des Boxeurs</td>
        <td align="right"><span style="display:inline-block;padding:8px 14px;border-radius:999px;background:${accent};color:#05060a;font-size:12px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase">${esc(d.club.court)}</span></td>
      </tr></table>
      <p style="margin:18px 0 0;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:${accent}">${esc(d.niveau)}</p>
      <p style="margin:4px 0 0;font-size:42px;line-height:1;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;color:#fff">${esc(d.prenom)}</p>
      <p style="margin:12px 0 0;font-size:14px;color:rgba(255,255,255,0.86)">${esc(ageTxt)}${esc(prat)}</p>
      <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.86)">${esc(coachs)}</p>
      <div style="margin:16px 0 8px">${tampons}</div>
      <p style="margin:14px 0 0;padding-top:12px;border-top:1px dashed rgba(255,255,255,0.28);font-size:12px;font-weight:800;letter-spacing:0.08em">
        <span style="color:${accent}">N° ${esc(d.serie)}</span>
        <span style="float:right;color:rgba(255,255,255,0.7);font-weight:600">26-31 OCT. 2026</span>
      </p>
      <p style="margin:10px 0 0;font-size:11px;color:${accent};font-weight:800;letter-spacing:0.14em;text-transform:uppercase">Validee</p>
    </td>
  </tr>
</table>`;
}

/** SVG autonome a joindre au mail (ouvert / imprime facilement). */
export function buildCarteSvg(order) {
  const d = cardDataFromOrder(order);
  const accent = d.club.accent;
  const ageTxt = d.age != null ? `${d.age} ans` : '8-16 ans';
  const prat = d.pratique ? ` · ${d.pratique}` : '';
  const coachs = coachsLine(d.club);
  const ini = `${(d.prenom[0] || 'B').toUpperCase()}`;
  const photoLayer = d.photo_url
    ? `<image href="${escAttrUrl(d.photo_url)}" xlink:href="${escAttrUrl(d.photo_url)}" x="0" y="0" width="1080" height="900" preserveAspectRatio="xMidYMid slice" opacity="0.92"/>`
    : `<text x="540" y="780" text-anchor="middle" fill="${accent}" fill-opacity="0.85" font-family="Arial Black,Arial,sans-serif" font-size="420">${esc(ini)}</text>`;
  const stamps = (d.tampons || [])
    .map((t, i) => {
      const y = 520 + i * 48;
      return `<g transform="translate(920 ${y}) rotate(${i % 2 ? 4 : -6})">
        <rect x="-110" y="-22" width="110" height="36" rx="8" fill="#fff"/>
        <text x="-55" y="2" text-anchor="middle" fill="#05060a" font-family="Arial,Helvetica,sans-serif" font-size="12" font-weight="800">${esc(t.toUpperCase())}</text>
      </g>`;
    })
    .join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1512" viewBox="0 0 1080 1512">
  <defs>
    <radialGradient id="g" cx="50%" cy="0%" r="90%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.75"/>
      <stop offset="55%" stop-color="#07080d"/>
      <stop offset="100%" stop-color="#05060a"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1512" rx="64" fill="url(#g)"/>
  ${photoLayer}
  <rect x="0" y="700" width="1080" height="812" fill="#05060a" fill-opacity="0.88"/>
  <text x="70" y="118" fill="rgba(255,255,255,0.86)" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="800" letter-spacing="6">LES VACANCES</text>
  <text x="70" y="162" fill="rgba(255,255,255,0.86)" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="800" letter-spacing="6">DES BOXEURS</text>
  <rect x="760" y="84" width="250" height="60" rx="30" fill="${accent}"/>
  <text x="885" y="124" text-anchor="middle" fill="#05060a" font-family="Arial,Helvetica,sans-serif" font-size="28" font-weight="800">${esc(d.club.court.toUpperCase())}</text>
  ${stamps}
  <circle cx="255" cy="890" r="122" fill="rgba(255,255,255,0.94)" stroke="#e8001c" stroke-width="7" transform="rotate(-12 255 890)"/>
  <text x="255" y="905" text-anchor="middle" fill="#e8001c" font-family="Arial Black,Arial,sans-serif" font-size="42" transform="rotate(-12 255 890)">VALIDEE</text>
  <text x="70" y="1060" fill="${accent}" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="800" letter-spacing="4">${esc(String(d.niveau).toUpperCase())}</text>
  <text x="70" y="1250" fill="#fff" font-family="Arial Black,Arial,sans-serif" font-size="120">${esc(String(d.prenom).toUpperCase())}</text>
  <text x="70" y="1318" fill="rgba(255,255,255,0.86)" font-family="Arial,Helvetica,sans-serif" font-size="36" font-weight="600">${esc(ageTxt)}${esc(prat)}</text>
  <text x="70" y="1370" fill="rgba(255,255,255,0.86)" font-family="Arial,Helvetica,sans-serif" font-size="34" font-weight="600">${esc(coachs)}</text>
  <line x1="70" y1="1410" x2="1010" y2="1410" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-dasharray="10 10"/>
  <text x="70" y="1460" fill="${accent}" font-family="Arial,Helvetica,sans-serif" font-size="28" font-weight="800">N° ${esc(d.serie)}</text>
  <text x="1010" y="1460" text-anchor="end" fill="rgba(255,255,255,0.7)" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="700">26-31 OCT. 2026 · ${esc(STAGE.name.toUpperCase())}</text>
  <rect x="18" y="18" width="1044" height="1476" rx="50" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
</svg>`;

  const slug = String(d.prenom || 'stage')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return {
    filename: `carte-boxeur-${slug || 'stage'}.svg`,
    content: Buffer.from(svg, 'utf8'),
    svg,
    html: buildCarteHtml(order),
    slug: slug || 'stage',
  };
}

/**
 * PNG pour Brevo (SVG refuse : "Unsupported file format: svg").
 * @returns {Promise<{ filename: string, content: Buffer, html: string } | null>}
 */
async function fetchPhotoBuffer(url) {
  if (!url || !/^https:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 32 || buf.length > 4 * 1024 * 1024) return null;
    return buf;
  } catch {
    return null;
  }
}

/** Portrait type (selfie), pas un scan type Pass Sport pleine page. */
async function photoOkForHero(buf) {
  try {
    const sharp = (await import('sharp')).default;
    const meta = await sharp(buf).metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (!w || !h) return false;
    const ratio = h / w;
    return ratio >= 0.85 && ratio <= 1.35 && w >= 200 && h >= 200;
  } catch {
    return false;
  }
}

function buildCarteHtmlForMail(order) {
  const d = cardDataFromOrder(order);
  if (!d.photo_url) return buildCarteHtml(order);
  return buildCarteHtml({ ...order, child: { ...(order.child || {}), photo_url: '' } });
}

export async function buildCartePng(order) {
  const carte = buildCarteSvg({
    ...order,
    child: { ...(order?.child || {}), photo_url: '' },
  });
  carte.html = buildCarteHtmlForMail(order);
  try {
    const sharp = (await import('sharp')).default;
    let content = await sharp(Buffer.from(carte.svg, 'utf8')).png().toBuffer();
    const raw = await fetchPhotoBuffer(order?.child?.photo_url || '');
    if (raw && (await photoOkForHero(raw))) {
      const overlay = await sharp(raw)
        .resize(1080, 900, { fit: 'cover', position: 'attention' })
        .png()
        .toBuffer();
      content = await sharp(content).composite([{ input: overlay, top: 0, left: 0 }]).png().toBuffer();
    }
    return {
      filename: `carte-boxeur-${carte.slug}.png`,
      content,
      html: carte.html,
    };
  } catch (err) {
    console.error('[carte-png]', err.message);
    return { filename: null, content: null, html: carte.html };
  }
}
