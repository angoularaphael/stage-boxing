import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../lib/load-env.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.API_PORT || 5621);

const routes = {
  '/api/checkout': () => import('../api/checkout.js'),
  '/api/order': () => import('../api/order.js'),
  '/api/confirm-payment': () => import('../api/confirm-payment.js'),
  '/api/admin/orders': () => import('../api/admin/orders.js'),
  '/api/admin/studio': () => import('../api/admin/studio.js'),
  '/api/auth/login': () => import('../api/auth/login.js'),
  '/api/auth/logout': () => import('../api/auth/logout.js'),
  '/api/auth/me': () => import('../api/auth/me.js'),
  '/api/cron-relances': () => import('../api/cron-relances.js'),
  '/api/webhooks/payplug': () => import('../api/webhooks/payplug.js'),
  '/api/webhooks/paypal': () => import('../api/webhooks/paypal.js'),
  '/api/webhooks/cawl': () => import('../api/webhooks/cawl.js'),
};

function matchRoute(urlPath) {
  const clean = urlPath.split('?')[0].replace(/\/+$/, '') || '/';
  if (routes[clean]) return routes[clean];
  return null;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
    const loader = matchRoute(url.pathname);
    if (!loader) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'Not found' }));
      return;
    }
    const mod = await loader();
    const handler = mod.default;
    await handler(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: err.message || 'Server error' }));
    }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[stage-boxeur api] http://127.0.0.1:${PORT}`);
});

if (process.argv.includes('--astro') || process.argv.includes('--vite')) {
  const astroBin = path.join(root, 'node_modules', 'astro', 'astro.js');
  const child = spawn(process.execPath, [astroBin, 'dev', '--port', '5620', '--host', '127.0.0.1'], {
    cwd: root,
    stdio: 'inherit',
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

void pathToFileURL;
