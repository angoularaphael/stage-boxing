/** Sources courtes dans l'URL : ?src=mail | sms | ig */

export function normalizeAttributionSrc(raw) {
  const s = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '');
  if (!s || s === 'direct') return 'direct';
  if (s === 'mail' || s === 'email' || s === 'newsletter') return 'mail';
  if (s === 'sms' || s === 'texto') return 'sms';
  if (s === 'ig' || s === 'insta' || s === 'instagram' || s === 'story') return 'ig';
  return s.slice(0, 24);
}

export function stageLinkWithSrc(baseUrl, src) {
  const base = String(baseUrl || 'https://stage.boxingcenter.fr').replace(/\/+$/, '');
  const code = normalizeAttributionSrc(src);
  if (!code || code === 'direct') return `${base}/`;
  return `${base}/?src=${encodeURIComponent(code)}`;
}
