/**
 * Smoke test mode studio en prod (cles TEST).
 * Usage: node scripts/test-studio-checkout.mjs
 */
import './../lib/load-env.js';

const BASE = String(process.env.STUDIO_TEST_BASE || 'https://stage-boxing.vercel.app').replace(
  /\/+$/,
  ''
);
const token = String(process.env.ADMIN_TOKEN || '').trim();
console.log('base=', BASE);

function pickCookie(res) {
  const raw = res.headers.getSetCookie?.() || [];
  const list = raw.length ? raw : [res.headers.get('set-cookie')].filter(Boolean);
  return list
    .map((c) => String(c).split(';')[0])
    .filter(Boolean)
    .join('; ');
}

async function jsonFetch(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data, cookie: pickCookie(res), headers: res.headers };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const results = [];
function ok(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`OK  ${name}${detail ? ' — ' + detail : ''}`);
}
function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`ERR ${name}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  assert(token, 'ADMIN_TOKEN manquant dans .env');

  const status = await jsonFetch('/api/admin/studio');
  assert(status.status === 200, `studio GET ${status.status}`);
  ok('admin studio GET', `configured=${status.data?.studio?.configured}`);

  const on = await jsonFetch('/api/admin/studio', { method: 'POST', body: { token } });
  assert(on.status === 200 && on.data?.studio?.active, `studio ON ${on.status} ${JSON.stringify(on.data)}`);
  const cookie = on.cookie;
  assert(cookie.includes('stg_studio='), 'cookie stg_studio absent');
  ok('studio active + cookie', cookie.split(';')[0].slice(0, 24) + '...');

  for (const club of ['portet', 'minimes']) {
    const stock = await jsonFetch(`/api/checkout?club=${club}`, { cookie });
    assert(stock.status === 200 && stock.data?.ok, `${club} stock HTTP`);
    assert(stock.data.studio === true, `${club} studio flag`);
    ok(`${club} GET checkout studio`, `methods=${(stock.data.methods || []).map((m) => m.id).join(',') || '(aucun)'} remaining=${stock.data.stock?.remaining}`);
  }

  const cases = [
    { club: 'portet', method: 'paypal_once', label: 'Portet PayPal sandbox' },
    { club: 'portet', method: 'cawl_card', label: 'Portet CAWL test' },
    { club: 'minimes', method: 'payplug_card', label: 'Minimes PayPlug test' },
    { club: 'minimes', method: 'paypal_once', label: 'Minimes PayPal sandbox' },
  ];

  for (const c of cases) {
    const r = await jsonFetch('/api/checkout', {
      method: 'POST',
      cookie,
      body: {
        club: c.club,
        method: c.method,
        is_member: false,
        member_declare: true,
        parent_email: `stage-studio+${c.club}-${c.method}@boxingcenter.fr`,
        parent_phone: '0612345678',
        parent_first_name: 'Studio',
        parent_last_name: 'Test',
      },
    });
    if (r.status === 200 && r.data?.ok && r.data.redirect_url) {
      const url = String(r.data.redirect_url);
      const looksTest =
        /sandbox\.paypal\.com|paypal\.com\/.*sandbox|payplug\.com\/pay\/test|preprod|ogone|worldline|cawl|checkout/i.test(
          url
        ) || url.includes('test');
      ok(c.label, `order=${r.data.order?.id || r.data.order_id || '?'} testish=${looksTest} url=${url.slice(0, 90)}`);
    } else {
      fail(c.label, `${r.status} ${r.data?.error || JSON.stringify(r.data)}`);
    }
  }

  // confirm sans paiement reel doit rester 402/404, pas 500 table
  const confirm = await jsonFetch('/api/confirm-payment', {
    method: 'POST',
    cookie,
    body: { order_id: 'stg_inexistant', token: 'x' },
  });
  if (confirm.status === 404 || confirm.status === 402) ok('confirm idempotent absent', String(confirm.status));
  else fail('confirm absent', `${confirm.status} ${JSON.stringify(confirm.data)}`);

  const failed = results.filter((r) => !r.ok);
  console.log('\n--- resume ---');
  console.log(`pass=${results.filter((r) => r.ok).length} fail=${failed.length}`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
