import '../lib/load-env.js';
import { cardPhotoUrl, isCloudinaryConfigured, uploadImageBuffer } from '../lib/cloudinary.js';
import { decodeBase64Image, looksLikeAllowedImage } from '../lib/image-bytes.js';
import { json, methodOf, readBody } from '../lib/http.js';
import { getOrderByToken, saveOrder } from '../lib/orders.js';

const MAX_BYTES = Math.floor(1.8 * 1024 * 1024);

export default async function handler(req, res) {
  if (methodOf(req) !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const body = await readBody(req);
  const orderId = String(body.order_id || body.id || '').trim();
  const token = String(body.token || '').trim();
  if (!orderId || !token) {
    return json(res, 400, { ok: false, error: 'order_id et token requis.' });
  }

  const order = await getOrderByToken(orderId, token);
  if (!order) return json(res, 404, { ok: false, error: 'Commande introuvable.' });
  if (order.status === 'complete') {
    return json(res, 409, { ok: false, error: 'Inscription deja finalisee.' });
  }
  const paid = order.payment?.status === 'paid' || ['paid', 'form_pending'].includes(order.status);
  if (!paid) {
    return json(res, 400, { ok: false, error: 'Paiement requis avant la photo.' });
  }

  const decoded = decodeBase64Image(body);
  if (!decoded) {
    return json(res, 400, { ok: false, error: 'photo_required', message: 'Envoyez une photo JPEG, PNG ou WebP.' });
  }
  const { buffer, mime } = decoded;
  if (!looksLikeAllowedImage(buffer, mime)) {
    return json(res, 400, {
      ok: false,
      error: 'invalid_image_type',
      message: 'Envoyez une photo JPEG, PNG ou WebP.',
    });
  }
  if (buffer.length > MAX_BYTES) {
    return json(res, 400, {
      ok: false,
      error: 'photo_too_large',
      message: 'Photo trop lourde (max ~1,5 Mo). Compressez ou choisissez une autre image.',
    });
  }

  if (!isCloudinaryConfigured()) {
    const onVercel = String(process.env.VERCEL || '') === '1';
    if (onVercel) {
      return json(res, 503, {
        ok: false,
        error: 'cloudinary_not_configured',
        message: 'Stockage photo indisponible. Contactez le club.',
      });
    }
    return json(res, 503, {
      ok: false,
      error: 'cloudinary_not_configured',
      message: 'Ajoutez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET.',
    });
  }

  try {
    const uploaded = await uploadImageBuffer({
      buffer,
      mime,
      filename: 'enfant.jpg',
      publicId: `stage-boxeur/photos/${orderId}`,
    });
    const photoUrl = uploaded.url || uploaded.secure_url || cardPhotoUrl(uploaded.public_id);
    order.child = {
      ...(order.child || {}),
      photo_url: photoUrl,
      photo_public_id: uploaded.public_id,
    };
    await saveOrder(order);
    return json(res, 200, {
      ok: true,
      photo_url: photoUrl,
      photo_public_id: uploaded.public_id,
    });
  } catch (err) {
    console.error('[child-photo]', err.message);
    return json(res, 502, {
      ok: false,
      error: 'cloudinary_failed',
      message: 'Impossible d’enregistrer la photo. Réessayez dans un instant.',
    });
  }
}
