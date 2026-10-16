/** Sources courtes : ?src=mail | sms | ig | flyer — ou UTM flyer (affiche / QR). */

export const STAGE_FLYER_TRACKING_URL =
  'https://stage.boxingcenter.fr/?utm_source=poster_a3&utm_medium=qr&utm_campaign=vacances_boxeurs_2026&utm_content=print';

export function normalizeAttributionSrc(raw) {
  const s = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '');
  if (!s || s === 'direct') return 'direct';
  if (s === 'mail' || s === 'email' || s === 'newsletter') return 'mail';
  if (s === 'sms' || s === 'texto') return 'sms';
  if (s === 'ig' || s === 'insta' || s === 'instagram' || s === 'story') return 'ig';
  if (
    s === 'flyer' ||
    s === 'poster' ||
    s === 'affiche' ||
    s === 'qr' ||
    s === 'print' ||
    s.startsWith('poster_') ||
    s.includes('poster') ||
    s.includes('flyer')
  ) {
    return 'flyer';
  }
  return s.slice(0, 24);
}

function toSearchParams(input) {
  if (!input) return new URLSearchParams();
  if (input instanceof URLSearchParams) return input;
  const raw = String(input).trim();
  if (!raw) return new URLSearchParams();
  const q = raw.includes('?') ? raw.split('?').slice(1).join('?') : raw;
  return new URLSearchParams(q.startsWith('?') ? q.slice(1) : q);
}

/** Lit ?src= ou UTM (ex. poster_a3 + qr) depuis une query ou un path. */
export function resolveAttributionFromQuery(input) {
  const p = toSearchParams(input);
  const src = p.get('src');
  if (src) return normalizeAttributionSrc(src);

  const utmSource = String(p.get('utm_source') || '').toLowerCase().trim();
  const utmMedium = String(p.get('utm_medium') || '').toLowerCase().trim();
  const utmCampaign = String(p.get('utm_campaign') || '').toLowerCase().trim();
  const utmContent = String(p.get('utm_content') || '').toLowerCase().trim();

  if (utmMedium === 'qr' || utmContent === 'print') return 'flyer';
  if (utmSource && normalizeAttributionSrc(utmSource) === 'flyer') return 'flyer';
  if (utmCampaign.includes('vacances_boxeurs')) return 'flyer';

  if (utmSource) return normalizeAttributionSrc(utmSource);
  return 'direct';
}

export function resolveAttributionFromVisit({ src, path, search } = {}) {
  const fromPath = path ? resolveAttributionFromQuery(path) : 'direct';
  if (fromPath !== 'direct') return fromPath;
  const fromSearch = search ? resolveAttributionFromQuery(search) : 'direct';
  if (fromSearch !== 'direct') return fromSearch;
  return normalizeAttributionSrc(src);
}

export function stageLinkWithSrc(baseUrl, src) {
  const base = String(baseUrl || 'https://stage.boxingcenter.fr').replace(/\/+$/, '');
  const code = normalizeAttributionSrc(src);
  if (!code || code === 'direct') return `${base}/`;
  return `${base}/?src=${encodeURIComponent(code)}`;
}
