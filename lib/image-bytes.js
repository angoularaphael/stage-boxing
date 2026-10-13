const PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function looksLikeAllowedImage(buf, mime) {
  if (!buf || buf.length < 12) return false;
  const kind = String(mime || '').toLowerCase();
  if (kind === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (kind === 'image/png') {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (kind === 'image/webp') {
    return buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
}

/** JSON { mime, data: base64 } ou data URL. */
export function decodeBase64Image(body) {
  const raw = String(body?.data || body?.image_base64 || '').trim();
  if (!raw) return null;
  let mime = String(body?.mime || 'image/jpeg').toLowerCase();
  let b64 = raw;
  const m = /^data:([^;]+);base64,(.+)$/i.exec(raw);
  if (m) {
    mime = m[1].toLowerCase();
    b64 = m[2];
  }
  if (!PHOTO_MIMES.has(mime)) return null;
  try {
    const buffer = Buffer.from(b64, 'base64');
    if (!buffer.length) return null;
    return { buffer, mime };
  } catch {
    return null;
  }
}
