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
  const url = `/api/admin/orders${club ? `?club=${encodeURIComponent(club)}` : ''}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
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
    const euros = ((Number(o.amount_cents) || 0) / 100).toFixed(0);
    tr.innerHTML = `<td>${o.created_at?.slice(0, 10) || ''}</td>
      <td>${o.club}</td>
      <td>${o.status}</td>
      <td>${euros} EUR</td>
      <td>${o.child?.first_name || '—'} ${o.child?.last_name || ''}</td>
      <td>${o.parent?.email || ''}</td>
      <td>${o.payment?.status || ''}</td>`;
    tbody.appendChild(tr);
  }
}

document.querySelector('#admin-load')?.addEventListener('click', () => load().catch(console.error));
document.querySelector('#admin-csv')?.addEventListener('click', async () => {
  const token = document.querySelector('#admin-token')?.value?.trim();
  const club = document.querySelector('#admin-club')?.value || '';
  if (!token) return;
  const url = `/api/admin/orders?format=csv${club ? `&club=${encodeURIComponent(club)}` : ''}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return;
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'stages-inscrits.csv';
  a.click();
  URL.revokeObjectURL(a.href);
});
