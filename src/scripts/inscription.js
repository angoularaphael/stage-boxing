import { initPriceToggle } from './price-toggle.js';

function params() {
  return new URLSearchParams(window.location.search);
}

function euros(cents) {
  return `${(Number(cents) / 100).toFixed(0)} EUR`;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

function showAlert(el, message, ok = false) {
  if (!el) return;
  el.hidden = !message;
  el.className = `alert ${ok ? 'alert-ok' : 'alert-error'}`;
  el.textContent = message || '';
}

function setStep(name) {
  document.querySelectorAll('[data-panel]').forEach((p) => {
    p.hidden = p.getAttribute('data-panel') !== name;
  });
  document.querySelectorAll('.step').forEach((s) => {
    s.classList.toggle('active', s.dataset.step === name);
  });
}

export async function bootInscription() {
  const clubSelect = document.querySelector('#club');
  const alertEl = document.querySelector('#alert');
  const methodsEl = document.querySelector('#pay-methods');
  const priceEl = document.querySelector('#price-value');
  const labelEl = document.querySelector('#price-label');
  const toggleEl = document.querySelector('#is-member');
  const memberDeclare = document.querySelector('#member-declare');
  const stockEl = document.querySelector('#stock');

  const p = params();
  const presetClub = p.get('club') || '';
  if (presetClub && clubSelect) clubSelect.value = presetClub;

  let prices = { guest_cents: 14000, member_cents: 8000 };
  const priceApi = initPriceToggle({
    priceEl,
    labelEl,
    toggleEl,
    guestCents: prices.guest_cents,
    memberCents: prices.member_cents,
  });

  async function loadClub() {
    const club = clubSelect?.value;
    if (!club) return;
    showAlert(alertEl, '');
    const data = await api(`/api/checkout?club=${encodeURIComponent(club)}`);
    prices = data.prices;
    priceApi.setPrices?.(prices.guest_cents, prices.member_cents);
    if (stockEl) {
      const studioNote = data.studio ? ' · STUDIO (paiements test)' : '';
      stockEl.textContent =
        data.stock.remaining > 0
          ? `${data.stock.remaining} place(s) restante(s)${studioNote}`
          : `Complet pour ce club${studioNote}`;
    }
    methodsEl.innerHTML = '';
    if (!data.methods?.length) {
      methodsEl.innerHTML =
        '<p class="alert alert-error">Aucun moyen de paiement configure pour ce club (cles env).</p>';
      return;
    }
    for (const m of data.methods) {
      const id = `pay_${m.id}`;
      const label = document.createElement('label');
      label.className = 'pay-method';
      label.innerHTML = `<input type="radio" name="method" value="${m.id}" id="${id}" required /> <span>${m.label}</span>`;
      methodsEl.appendChild(label);
    }
    methodsEl.querySelector('input')?.setAttribute('checked', 'checked');
  }

  clubSelect?.addEventListener('change', () => loadClub().catch((e) => showAlert(alertEl, e.message)));
  toggleEl?.addEventListener('change', () => {
    if (memberDeclare) memberDeclare.hidden = !toggleEl.checked;
  });

  await loadClub().catch((e) => showAlert(alertEl, e.message));

  // Retour PSP
  if (p.get('order') && p.get('token') && (p.get('paypal_return') || p.get('payplug_return') || p.get('scalapay_return') || p.get('cawl_return'))) {
    setStep('wait');
    try {
      const confirmed = await api('/api/confirm-payment', {
        method: 'POST',
        body: JSON.stringify({ order_id: p.get('order'), token: p.get('token') }),
      });
      window.__order = confirmed.order;
      window.__token = p.get('token');
      showAlert(alertEl, 'Paiement confirme. Completez le formulaire enfant.', true);
      setStep('child');
      fillParentFromOrder(confirmed.order);
    } catch (e) {
      showAlert(alertEl, e.message);
      setStep('pay');
    }
  } else if (p.get('order') && p.get('token')) {
    try {
      const data = await api(`/api/order?id=${encodeURIComponent(p.get('order'))}&token=${encodeURIComponent(p.get('token'))}`);
      window.__order = data.order;
      window.__token = p.get('token');
      if (data.order.status === 'complete') {
        setStep('done');
      } else if (data.order.payment?.status === 'paid') {
        setStep(data.order.child ? 'docs' : 'child');
        fillParentFromOrder(data.order);
      } else {
        setStep('pay');
      }
    } catch (e) {
      showAlert(alertEl, e.message);
    }
  } else {
    setStep('pay');
  }

  let paying = false;
  document.querySelector('#pay-form')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (paying) return;
    showAlert(alertEl, '');
    const fd = new FormData(ev.target);
    const isMember = Boolean(toggleEl?.checked);
    if (isMember && !fd.get('member_declare')) {
      showAlert(alertEl, 'Cochez la declaration adherent pour beneficier du tarif 80 EUR.');
      return;
    }
    paying = true;
    const submitBtn = ev.target.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      const result = await api('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          club: fd.get('club'),
          method: fd.get('method'),
          is_member: isMember,
          member_declare: isMember ? Boolean(fd.get('member_declare')) : true,
          parent_email: fd.get('parent_email'),
          parent_phone: fd.get('parent_phone'),
          parent_first_name: fd.get('parent_first_name'),
          parent_last_name: fd.get('parent_last_name'),
        }),
      });
      window.location.href = result.redirect_url;
    } catch (e) {
      paying = false;
      if (submitBtn) submitBtn.disabled = false;
      showAlert(alertEl, e.message);
    }
  });

  document.querySelector('#child-form')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    try {
      const data = await api('/api/order', {
        method: 'POST',
        body: JSON.stringify({
          action: 'child',
          order_id: window.__order?.id,
          token: window.__token,
          first_name: fd.get('first_name'),
          last_name: fd.get('last_name'),
          birthdate: fd.get('birthdate'),
          practice_years: fd.get('practice_years'),
          notes: buildChildNotes(fd),
          weight: fd.get('weight'),
          level: fd.get('level'),
          fights_count: fd.get('fights_count'),
          emergency_name: fd.get('emergency_name'),
          emergency_phone: fd.get('emergency_phone'),
          allergies: fd.get('allergies'),
          treatment: fd.get('treatment'),
          injury: fd.get('injury'),
          lunch_break: fd.get('lunch_break'),
          parent_phone: fd.get('parent_phone'),
          parent_phone_2: fd.get('parent_phone_2'),
          parent_email: fd.get('parent_email'),
        }),
      });
      window.__order = data.order;
      setStep('docs');
      showAlert(alertEl, '', true);
    } catch (e) {
      showAlert(alertEl, e.message);
    }
  });

  document.querySelector('#docs-form')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    try {
      const data = await api('/api/order', {
        method: 'POST',
        body: JSON.stringify({
          action: 'documents',
          order_id: window.__order?.id,
          token: window.__token,
          cgv: Boolean(fd.get('cgv')),
          reglement: Boolean(fd.get('reglement')),
          parental: Boolean(fd.get('parental')),
          health: Boolean(fd.get('health')),
          participation: Boolean(fd.get('participation')),
          image_rights: Boolean(fd.get('image_rights')),
        }),
      });
      window.__order = data.order;
      const done = document.querySelector('#done-summary');
      if (done) {
        const c = data.order.child || {};
        done.textContent = `${c.first_name || ''} ${c.last_name || ''} — ${data.order.club_label} — ${euros(data.order.amount_cents)}`;
      }
      setStep('done');
      showAlert(alertEl, 'Inscription complete. Un e-mail de confirmation vous a ete envoye.', true);
    } catch (e) {
      showAlert(alertEl, e.message);
    }
  });
}

function fillParentFromOrder(order) {
  const map = {
    parent_email: order.parent?.email,
    parent_phone: order.parent?.phone,
  };
  for (const [name, value] of Object.entries(map)) {
    const el = document.querySelector(`#child-form [name="${name}"]`);
    if (el && value) el.value = value;
  }
}

function buildChildNotes(fd) {
  const lines = [];
  const pairs = [
    ['Poids (kg)', fd.get('weight')],
    ['Niveau', fd.get('level')],
    ['Assauts / combats', fd.get('fights_count')],
    ['Contact urgence', fd.get('emergency_name')],
    ['Telephone urgence', fd.get('emergency_phone')],
    ['Allergies', fd.get('allergies')],
    ['Traitement', fd.get('treatment')],
    ['Blessure', fd.get('injury')],
    ['Pause midi', fd.get('lunch_break')],
    ['Observations', fd.get('notes')],
  ];
  for (const [label, value] of pairs) {
    const v = String(value || '').trim();
    if (v) lines.push(`${label} : ${v}`);
  }
  return lines.join('\n');
}
