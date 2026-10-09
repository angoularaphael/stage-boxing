async function load() {
  const token = document.querySelector('#admin-token')?.value?.trim();
  const club = document.querySelector('#admin-club')?.value || '';
  const alertEl = document.querySelector('#alert');
  const tbody = document.querySelector('#orders-body');
  if (!token) {
    alertEl.hidden = false;
    alertEl.textContent = 'Saisissez le ADMIN_TOKEN.';
    return;
  }
  const url = `/api/admin/orders?token=${encodeURIComponent(token)}${club ? `&club=${encodeURIComponent(club)}` : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    alertEl.hidden = false;
    alertEl.className = 'alert alert-error';
    alertEl.textContent = data.error || 'Erreur';
    return;
  }
  alertEl.hidden = true;
  tbody.innerHTML = '';
  for (const o of data.orders || []) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${o.created_at?.slice(0, 10) || ''}</td>
      <td>${o.club}</td>
      <td>${o.status}</td>
      <td>${o.is_member ? '80' : '140'} EUR</td>
      <td>${o.child?.first_name || '—'} ${o.child?.last_name || ''}</td>
      <td>${o.parent?.email || ''}</td>
      <td>${o.payment?.status || ''}</td>`;
    tbody.appendChild(tr);
  }
}

document.querySelector('#admin-load')?.addEventListener('click', () => load().catch(console.error));
document.querySelector('#admin-csv')?.addEventListener('click', () => {
  const token = document.querySelector('#admin-token')?.value?.trim();
  const club = document.querySelector('#admin-club')?.value || '';
  if (!token) return;
  window.location.href = `/api/admin/orders?format=csv&token=${encodeURIComponent(token)}${club ? `&club=${encodeURIComponent(club)}` : ''}`;
});
