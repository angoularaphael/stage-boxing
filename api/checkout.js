import '../lib/load-env.js';
import { availableMethodsForClub, startCheckout } from '../lib/checkout.js';
import { priceGuestCents, priceMemberCents, STAGE, stockForClub } from '../lib/config.js';
import { getClub } from '../lib/clubs.js';
import { json, methodOf, readBody } from '../lib/http.js';
import { assertStockAvailable, countPaidOrReserved } from '../lib/orders.js';
import { isStudioRequest, withStudioContext } from '../lib/studio.js';

export default async function handler(req, res) {
  return withStudioContext(req, async () => {
    const method = methodOf(req);

    if (method === 'GET') {
      const club = String(new URL(req.url || '/', 'http://x').searchParams.get('club') || '').toLowerCase();
      const clubObj = getClub(club);
      if (!clubObj) {
        return json(res, 400, { ok: false, error: 'Club invalide (portet|minimes).' });
      }
      let stock = { max: stockForClub(club), used: 0, remaining: stockForClub(club) };
      try {
        const used = await countPaidOrReserved(club);
        stock = { max: stockForClub(club), used, remaining: Math.max(0, stockForClub(club) - used) };
      } catch {
        /* ignore */
      }
      return json(res, 200, {
        ok: true,
        club: clubObj.id,
        stage: STAGE,
        studio: isStudioRequest(req),
        prices: {
          guest_cents: priceGuestCents(),
          member_cents: priceMemberCents(),
        },
        methods: availableMethodsForClub(club),
        stock,
      });
    }

    if (method !== 'POST') {
      return json(res, 405, { ok: false, error: 'Method not allowed' });
    }

    try {
      const body = await readBody(req);
      await assertStockAvailable(String(body.club || '').toLowerCase());
      const result = await startCheckout(body);
      return json(res, 200, { ok: true, studio: isStudioRequest(req), ...result });
    } catch (err) {
      const status =
        err.code === 'sold_out'
          ? 409
          : err.code === 'method_forbidden' || err.code === 'validation'
            ? 400
            : 500;
      return json(res, status, {
        ok: false,
        error: err.message || 'Erreur checkout',
        code: err.code || null,
      });
    }
  });
}
