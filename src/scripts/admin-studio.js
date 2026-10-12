const alertEl = () => document.querySelector('#alert');
const stateEl = () => document.querySelector('#studio-state');
const detailEl = () => document.querySelector('#studio-detail');

function showAlert(message, ok = false) {
  const el = alertEl();
  if (!el) return;
  el.hidden = !message;
  el.className = `alert ${ok ? 'alert-ok' : 'alert-error'}`;
  el.textContent = message || '';
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
  const res = await fetch('/api/admin/studio', {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: method === 'GET' ? undefined : JSON.stringify({}),
  });
  if (res.status === 401) {
    location.replace('/admin/login?next=/admin');
    return;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    showAlert(data.error || `Erreur ${res.status}`);
    return;
  }
  paint(data.studio);
  if (method !== 'GET') showAlert(data.studio?.message || 'OK', true);
}

document.querySelector('#studio-on')?.addEventListener('click', () => call('POST').catch(console.error));
document.querySelector('#studio-off')?.addEventListener('click', () => call('DELETE').catch(console.error));
document.querySelector('#studio-refresh')?.addEventListener('click', () => call('GET').catch(console.error));
call('GET').catch(() => null);
