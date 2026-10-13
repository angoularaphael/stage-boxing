/**
 * Tableau des inscriptions (cahier §17) sur l'API existante GET /api/admin/orders.
 * Relit les informations rangées dans « notes » par le tunnel (poids, urgence, santé, midi),
 * exporte en CSV (Excel FR : point-virgule + BOM), en vrai .xlsx et en PDF (impression).
 */
const $ = (s, r = document) => r.querySelector(s);
const STOCK_DEFAUT = 40;
const CLUBS = { portet: 'Portet-sur-Garonne', minimes: 'Minimes' };

function alerte(msg, ok = false) {
  const el = $('#alert');
  if (!el) return;
  el.hidden = !msg;
  el.className = ok ? 'alert-ok' : '';
  el.textContent = msg || '';
}
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** « Poids : 38 kg » → { Poids: '38 kg' } */
export function lireNotes(notes) {
  const out = {};
  String(notes || '')
    .split('\n')
    .forEach((l) => {
      const i = l.indexOf(' : ');
      if (i > 0) out[l.slice(0, i).trim()] = l.slice(i + 3).trim();
    });
  return out;
}

const dateFr = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) ? iso.split('-').reverse().join('/') : iso || '');

function statut(o) {
  if (o.status === 'complete') return ['complete', 'Complète'];
  if (o.payment?.status === 'paid' && o.child) return ['docs', 'Documents à valider'];
  if (o.payment?.status === 'paid') return ['fiche', 'Fiche à remplir'];
  return ['paiement', 'Paiement en attente'];
}

/** Les champs structurés de l'API d'abord (depuis le commit 5c3cc24), les lignes de « notes » en secours. */
function fiche(o) {
  const c = o.child || {};
  const n = lireNotes(c.notes);
  const urgence = c.emergency_name ? `${c.emergency_name}${c.emergency_phone ? ` — ${c.emergency_phone}` : ''}` : n['Contact d’urgence'] || n['Contact urgence'] || '';
  return {
    Poids: c.weight ? `${c.weight} kg`.replace(/ kg kg$/, ' kg') : n.Poids || n['Poids (kg)'] || '',
    Niveau: c.level || n.Niveau || '',
    'Assauts ou combats disputés': c.fights_count || n['Assauts ou combats disputés'] || n['Assauts / combats'] || '',
    'Contact d’urgence': urgence,
    Allergies: c.allergies || n.Allergies || '',
    'Traitement médical': c.treatment || n['Traitement médical'] || n.Traitement || '',
    'Blessure ou problème médical': c.injury || n['Blessure ou problème médical'] || n.Blessure || '',
    'Pause du midi': c.lunch_break || n['Pause du midi'] || n['Pause midi'] || '',
    Observations: n.Observations || '',
  };
}

function ligneExport(o) {
  const n = fiche(o);
  const [, s] = statut(o);
  return {
    Statut: s,
    Club: CLUBS[o.club] || o.club,
    'Prénom enfant': o.child?.first_name || '',
    'Nom enfant': o.child?.last_name || '',
    'Date de naissance': dateFr(o.child?.birthdate),
    Âge: o.child?.age ?? '',
    Poids: n.Poids || '',
    Niveau: n.Niveau || '',
    'Années de pratique': o.child?.practice_years || '',
    'Assauts / combats': n['Assauts ou combats disputés'] || '',
    'Responsable légal': [o.parent?.first_name, o.parent?.last_name].filter(Boolean).join(' '),
    'E-mail': o.parent?.email || '',
    'Téléphone 1': o.parent?.phone || '',
    'Téléphone 2': o.child?.parent_phone_2 || '',
    'Contact d’urgence': n['Contact d’urgence'] || '',
    Allergies: n.Allergies || '',
    Traitement: n['Traitement médical'] || '',
    'Blessure / problème médical': n['Blessure ou problème médical'] || '',
    'Pause du midi': n['Pause du midi'] || '',
    'Droit à l’image': o.documents ? (o.documents.image_rights ? 'Oui' : 'Non') : '',
    Observations: n.Observations || '',
    Tarif: o.is_member ? 'Adhérent' : 'Non-adhérent',
    Montant: o.amount_cents ? (o.amount_cents / 100).toFixed(2).replace('.', ',') : '',
    'Payé le': o.payment?.paid_at ? new Date(o.payment.paid_at).toLocaleString('fr-FR') : '',
    'Documents validés le': o.documents?.accepted_at ? new Date(o.documents.accepted_at).toLocaleString('fr-FR') : '',
    'Créée le': o.created_at ? new Date(o.created_at).toLocaleString('fr-FR') : '',
    Référence: o.id,
  };
}

/* ---------- export .xlsx minimal (zip « stocké », sans dépendance) ---------- */
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zip(fichiers) {
  const enc = new TextEncoder();
  const morceaux = [];
  const central = [];
  let decalage = 0;
  fichiers.forEach(({ nom, contenu }) => {
    const n = enc.encode(nom);
    const d = enc.encode(contenu);
    const crc = crc32(d);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, d.length, true);
    local.setUint32(22, d.length, true);
    local.setUint16(26, n.length, true);
    morceaux.push(new Uint8Array(local.buffer), n, d);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, d.length, true);
    cd.setUint32(24, d.length, true);
    cd.setUint16(28, n.length, true);
    cd.setUint32(42, decalage, true);
    central.push(new Uint8Array(cd.buffer), n);
    decalage += 30 + n.length + d.length;
  });
  const tailleCentral = central.reduce((s, b) => s + b.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, fichiers.length, true);
  fin.setUint16(10, fichiers.length, true);
  fin.setUint32(12, tailleCentral, true);
  fin.setUint32(16, decalage, true);
  return new Blob([...morceaux, ...central, new Uint8Array(fin.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
export function xlsx(lignes) {
  const cols = Object.keys(lignes[0] || { Vide: '' });
  const x = (s) => esc(s).replace(/'/g, '&apos;');
  const lettre = (i) => {
    let s = '';
    let n = i + 1;
    while (n) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };
  const cellule = (v, ri, ci, style = '') => `<c r="${lettre(ci)}${ri}" t="inlineStr"${style}><is><t xml:space="preserve">${x(v)}</t></is></c>`;
  const rows = [
    `<row r="1">${cols.map((c, ci) => cellule(c, 1, ci, ' s="1"')).join('')}</row>`,
    ...lignes.map((l, ri) => `<row r="${ri + 2}">${cols.map((c, ci) => cellule(l[c], ri + 2, ci)).join('')}</row>`),
  ];
  const feuille = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols.map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="22" customWidth="1"/>`).join('')}</cols><sheetData>${rows.join('')}</sheetData></worksheet>`;
  return zip([
    { nom: '[Content_Types].xml', contenu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { nom: '_rels/.rels', contenu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { nom: 'xl/workbook.xml', contenu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Inscrits" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { nom: 'xl/_rels/workbook.xml.rels', contenu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { nom: 'xl/styles.xml', contenu: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf xfId="0"/><xf xfId="0" fontId="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' },
    { nom: 'xl/worksheets/sheet1.xml', contenu: feuille },
  ]);
}
export function csv(lignes) {
  const cols = Object.keys(lignes[0] || { Vide: '' });
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return `﻿${[cols.map(q).join(';'), ...lignes.map((l) => cols.map((c) => q(l[c])).join(';'))].join('\r\n')}`;
}
function telecharger(blob, nom) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function admin() {
  let commandes = [];
  const lignes = $('[data-lignes]');
  const filtreClub = $('[data-filtre-club]');
  const filtreStatut = $('[data-filtre-statut]');
  const recherche = $('[data-recherche]');
  const root = $('#contenu');

  async function ensureAuth() {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) {
      location.replace('/admin/login?next=/admin');
      throw new Error('unauthorized');
    }
    const data = await res.json();
    const sess = $('#admin-session');
    if (sess && data.user) {
      sess.hidden = false;
      sess.textContent = `Connecte : ${data.user.email || data.user.name || 'admin'}`;
    }
    if (root) root.hidden = false;
    return data.user;
  }

  const filtrees = () => {
    const club = filtreClub.value;
    const st = filtreStatut.value;
    const q = recherche.value.trim().toLowerCase();
    return commandes.filter((o) => {
      if (club && o.club !== club) return false;
      if (st && statut(o)[0] !== st) return false;
      if (q) {
        const texte = [o.child?.first_name, o.child?.last_name, o.parent?.email, o.parent?.phone, o.parent?.first_name, o.parent?.last_name].join(' ').toLowerCase();
        if (!texte.includes(q)) return false;
      }
      return true;
    });
  };

  async function stats() {
    const zone = $('[data-stats]');
    const blocs = await Promise.all(
      Object.keys(CLUBS).map(async (club) => {
        let max = STOCK_DEFAUT;
        try {
          const r = await fetch(`/api/checkout?club=${club}`).then((x) => x.json());
          if (r?.stock?.max) max = r.stock.max;
        } catch {
          /* on garde la valeur par défaut */
        }
        const liste = commandes.filter((o) => o.club === club);
        const n = (k) => liste.filter((o) => statut(o)[0] === k).length;
        const reservees = liste.filter((o) => ['paid', 'form_pending', 'complete', 'checkout'].includes(o.status)).length;
        return `<div class="adm__stat"><h3>${CLUBS[club]}</h3>
          <div class="adm__chiffres">
            <p><b>${n('complete')}</b>complètes</p>
            <p><b>${n('fiche')}</b>fiche à remplir</p>
            <p><b>${n('docs')}</b>documents à valider</p>
            <p><b>${n('paiement')}</b>paiement en attente</p>
            <p><b>${reservees}/${max}</b>places comptées</p>
          </div>
          <div class="adm__jauge" aria-hidden="true"><span style="width:${Math.min(100, (reservees / max) * 100)}%"></span></div></div>`;
      }),
    );
    zone.innerHTML = blocs.join('');
  }

  function rendre() {
    const liste = filtrees();
    $('[data-vide]').hidden = liste.length > 0;
    lignes.innerHTML = liste
      .map((o) => {
        const [cle, s] = statut(o);
        const n = fiche(o);
        const photo = o.child?.photo_url
          ? `<img class="adm__photo" src="${esc(o.child.photo_url)}" alt="" width="48" height="48" />`
          : '';
        const enfant = o.child
          ? `<span class="adm__enfant">${photo}<span>${esc(o.child.first_name)} ${esc(o.child.last_name)}<small>né(e) le ${esc(dateFr(o.child.birthdate))}</small></span></span>`
          : '<small>fiche non remplie</small>';
        const profil = o.child ? `${esc(o.child.age)} ans · ${esc(n.Poids || '—')}<small>${esc(n.Niveau || '')} · ${esc(o.child.practice_years || '')}</small>` : '—';
        const resp = `${esc([o.parent?.first_name, o.parent?.last_name].filter(Boolean).join(' '))}<small>${esc(o.parent?.email)}</small><small>${esc(o.parent?.phone)}${o.child?.parent_phone_2 ? ` · ${esc(o.child.parent_phone_2)}` : ''}</small>`;
        const sante = o.child ? `${esc(n['Contact d’urgence'] || '—')}<small>Allergies : ${esc(n.Allergies || '—')}</small><small>Traitement : ${esc(n['Traitement médical'] || '—')}</small><small>${esc(n['Blessure ou problème médical'] && n['Blessure ou problème médical'] !== '—' ? n['Blessure ou problème médical'] : '')}</small>` : '—';
        const midi = `${esc(n['Pause du midi'] || '—')}<small>Image : ${o.documents ? (o.documents.image_rights ? 'oui' : 'non') : '—'}</small>`;
        const lien = o.access_token ? `${location.origin}/inscription?order=${encodeURIComponent(o.id)}&token=${encodeURIComponent(o.access_token)}` : '';
        const paye = o.payment?.status === 'paid';
        const actions = [
          lien && cle !== 'complete' && cle !== 'paiement'
            ? `<button class="adm__copier" type="button" data-copier="${esc(lien)}">Copier le lien</button>`
            : '',
          paye
            ? `<a class="adm__copier" href="/api/admin/orders?invoice=${encodeURIComponent(o.id)}" target="_blank" rel="noopener">Facture</a>`
            : '',
          `<button class="adm__suppr" type="button" data-suppr="${esc(o.id)}" data-label="${esc([o.parent?.email, o.child?.first_name, o.child?.last_name].filter(Boolean).join(' — ') || o.id)}">Supprimer</button>`,
        ]
          .filter(Boolean)
          .join(' ');
        return `<tr data-order-id="${esc(o.id)}">
          <td><span class="badge badge--${cle}">${s}</span></td>
          <td><span class="badge badge--${esc(o.club)}">${esc(CLUBS[o.club] || o.club)}</span></td>
          <td>${enfant}</td><td>${profil}</td><td>${resp}</td><td>${sante}</td><td>${midi}</td>
          <td>${o.is_member ? 'Adhérent' : 'Non-adhérent'}<small>${o.amount_cents ? `${(o.amount_cents / 100).toFixed(0)} €` : ''}</small></td>
          <td>${o.created_at ? new Date(o.created_at).toLocaleDateString('fr-FR') : ''}<small>${o.payment?.paid_at ? `payé le ${new Date(o.payment.paid_at).toLocaleDateString('fr-FR')}` : ''}</small></td>
          <td class="adm__actions">${actions}</td>
        </tr>`;
      })
      .join('');
  }

  async function charger() {
    alerte('');
    const res = await fetch('/api/admin/orders', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (res.status === 401) {
      location.replace('/admin/login?next=/admin');
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alerte(data.error || `Erreur ${res.status}`);
    commandes = data.orders || [];
    $('[data-tableau]').hidden = false;
    rendre();
    stats();
  }

  $('#admin-logout')?.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => null);
    location.replace('/admin/login');
  });

  [filtreClub, filtreStatut].forEach((s) => s?.addEventListener('change', rendre));
  recherche?.addEventListener('input', rendre);
  lignes.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-suppr]');
    if (del) {
      const id = del.dataset.suppr;
      const label = del.dataset.label || id;
      if (!window.confirm(`Supprimer cette inscription ?\n${label}\n\nCette action est definitive.`)) return;
      del.disabled = true;
      try {
        const res = await fetch('/api/admin/orders', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ id }),
        });
        if (res.status === 401) {
          location.replace('/admin/login?next=/admin');
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alerte(data.error || `Erreur ${res.status}`);
          del.disabled = false;
          return;
        }
        commandes = commandes.filter((o) => o.id !== id);
        rendre();
        stats();
        alerte('Inscription supprimee.', true);
      } catch (err) {
        alerte(err.message || 'Erreur suppression');
        del.disabled = false;
      }
      return;
    }
    const b = e.target.closest('[data-copier]');
    if (!b || b.tagName === 'A') return;
    try {
      await navigator.clipboard.writeText(b.dataset.copier);
      b.textContent = 'Lien copie';
    } catch {
      window.prompt('Lien de reprise a envoyer au parent :', b.dataset.copier);
    }
  });
  document.querySelectorAll('[data-export]').forEach((b) =>
    b.addEventListener('click', () => {
      const liste = filtrees().map(ligneExport);
      const date = new Date().toISOString().slice(0, 10);
      const suffixe = filtreClub.value ? `-${filtreClub.value}` : '';
      if (b.dataset.export === 'csv') telecharger(new Blob([csv(liste)], { type: 'text/csv;charset=utf-8' }), `stage-inscrits${suffixe}-${date}.csv`);
      if (b.dataset.export === 'xlsx') telecharger(xlsx(liste), `stage-inscrits${suffixe}-${date}.xlsx`);
      if (b.dataset.export === 'pdf') window.print();
    }),
  );

  ensureAuth()
    .then(() => charger())
    .catch((e) => {
      if (e.message !== 'unauthorized') alerte(e.message);
    });
}
