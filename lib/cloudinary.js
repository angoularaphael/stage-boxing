import crypto from 'node:crypto';

const CARD_PHOTO_TRANSFORM = 'f_jpg,q_auto,w_1080,h_1200,c_fill,g_auto:face';

function cloudinaryCredentials() {
  const fromUrl = String(process.env.CLOUDINARY_URL || '').trim();
  if (fromUrl) {
    try {
      const parsed = new URL(fromUrl);
      if (parsed.protocol === 'cloudinary:') {
        const cloud = String(parsed.hostname || '').trim();
        const apiKey = decodeURIComponent(parsed.username || '').trim();
        const apiSecret = decodeURIComponent(parsed.password || '').trim();
        if (cloud && apiKey && apiSecret) return { cloud, apiKey, apiSecret };
      }
    } catch {
      /* ignore */
    }
  }
  return {
    cloud: String(process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
    apiKey: String(process.env.CLOUDINARY_API_KEY || '').trim(),
    apiSecret: String(process.env.CLOUDINARY_API_SECRET || '').trim(),
  };
}

function cloudName() {
  return cloudinaryCredentials().cloud;
}

export function isCloudinaryConfigured() {
  const { cloud, apiKey, apiSecret } = cloudinaryCredentials();
  return Boolean(cloud && apiKey && apiSecret);
}

function signParams(params, apiSecret) {
  const filtered = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return crypto.createHash('sha1').update(filtered + apiSecret).digest('hex');
}

/** Recadre une URL Cloudinary deja servie pour privilegier le visage. */
export function facePhotoUrl(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  return s
    .replace(/,g_auto:face/, ',g_face_tmp')
    .replace(/,g_auto(?![:\w])/, ',g_auto:face')
    .replace(/,g_face_tmp/, ',g_auto:face');
}

export function cardPhotoUrl(publicId, { transform = CARD_PHOTO_TRANSFORM } = {}) {
  const cloud = cloudName();
  if (!cloud || !publicId) return null;
  const id = String(publicId).replace(/^\/+/, '');
  const t = transform ? `${transform}/` : '';
  return `https://res.cloudinary.com/${cloud}/image/upload/${t}${id}`;
}

export async function uploadImageBuffer({
  buffer,
  mime = 'image/jpeg',
  filename = 'photo.jpg',
  folder = 'stage-boxeur/photos',
  publicId,
} = {}) {
  const { cloud, apiKey, apiSecret } = cloudinaryCredentials();
  if (!cloud || !apiKey || !apiSecret) {
    throw new Error('cloudinary_not_configured');
  }
  if (!buffer || !buffer.length) throw new Error('empty_image');

  const timestamp = Math.floor(Date.now() / 1000);
  const id = publicId || `${folder}/${Date.now()}`;
  const toSign = {
    overwrite: 'true',
    public_id: id,
    timestamp,
  };
  const signature = signParams(toSign, apiSecret);

  const form = new FormData();
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  form.append('file', new Blob([bytes], { type: mime }), filename);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('public_id', id);
  form.append('overwrite', 'true');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const message = data.error?.message || `cloudinary_http_${res.status}`;
    throw new Error(message);
  }
  return {
    public_id: data.public_id,
    url: cardPhotoUrl(data.public_id),
    secure_url: data.secure_url || cardPhotoUrl(data.public_id),
  };
}
