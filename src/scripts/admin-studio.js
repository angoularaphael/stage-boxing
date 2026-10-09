const alertEl = () => document.querySelector('#alert');
const stateEl = () => document.querySelector('#studio-state');
const detailEl = () => document.querySelector('#studio-detail');
const tokenEl = () => document.querySelector('#admin-token');

function showAlert(message, ok = false) {
  const el = alertEl();
  if (!el) return;
  el.hidden = !message;
  el.className = `alert ${ok ? 'alert-ok' : 'alert-error'}`;
  el.textContent = message || '';
}

function token() {
  return String(tokenEl()?.value || '').trim();
}

function paint(studio) {
  const active = Boolean(studio?.active);
  if (stateEl()) {
    stateEl().textContent = active ? 'Statut : STUDIO ACTIF' : 'Statut : LIVE';
    stateEl().style.color = active ? '#7dffb0' : '';
  }
  if (detailEl()) {
    detailEl().textContent = active
      ? 'Les paiements utilisent PayPal sandbox / PayPlug test / CAWL preprod.'
      : 'Les paiements utilisent les cles live de production.';
  }
}

async function call(method) {
  showAlert('');
  const t = token();
  if (!t) {
    showAlert('Saisissez le ADMIN_TOKEN.');
    return;
  }
  const res = await fetch('/api/admin/studio', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${t}`,
    },
    credentials: 'include',
    body: method === 'GET' ? undefined : JSON.stringify({ token: t }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    showAlert(data.error || `Erreur ${res.status}`);
    return;
  }
  paint(data.studio);
  showAlert(data.studio?.message || 'OK', true);
}

document.querySelector('#studio-on')?.addEventListener('click', () => call('POST').catch(console.error));
document.querySelector('#studio-off')?.addEventListener('click', () => call('DELETE').catch(console.error));
document.querySelector('#studio-refresh')?.addEventListener('click', () => call('GET').catch(console.error));

const saved = sessionStorage.getItem('stg_admin_token');
if (saved && tokenEl()) tokenEl().value = saved;
tokenEl()?.addEventListener('change', () => {
  sessionStorage.setItem('stg_admin_token', token());
});
