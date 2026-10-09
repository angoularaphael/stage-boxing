import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './load-env.js';
import { resolveAmountCents, STAGE, stockForClub } from './config.js';
import { getClub } from './clubs.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const dataFile = path.join(dataDir, 'orders.json');

function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function ensureFile() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(dataFile)) writeFileSync(dataFile, '[]', 'utf8');
}

function readLocal() {
  ensureFile();
  try {
    const raw = readFileSync(dataFile, 'utf8');
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeLocal(list) {
  ensureFile();
  writeFileSync(dataFile, JSON.stringify(list, null, 2), 'utf8');
}

async function supabaseFetch(pathname, { method = 'GET', body = null, prefer } = {}) {
  const base = String(process.env.SUPABASE_URL).replace(/\/+$/, '');
  const headers = {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${base}/rest/v1/${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(typeof data === 'object' ? data.message || JSON.stringify(data) : text);
    err.status = res.status;
    throw err;
  }
  return data;
}

export function newAccessToken() {
  return randomBytes(24).toString('hex');
}

export function createOrderDraft({
  club,
  is_member = false,
  parent_email = '',
  parent_phone = '',
  parent_first_name = '',
  parent_last_name = '',
}) {
  const clubObj = getClub(club);
  if (!clubObj) throw new Error('Club invalide');
  const member = Boolean(is_member);
  const amount_cents = resolveAmountCents(member);
  const now = new Date().toISOString();
  return {
    id: `stg_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
    access_token: newAccessToken(),
    created_at: now,
    updated_at: now,
    stage_id: STAGE.id,
    club: clubObj.id,
    club_label: clubObj.label,
    is_member: member,
    amount_cents,
    currency: 'EUR',
    status: 'draft',
    payment: {
      status: 'pending',
      method: null,
      provider: null,
      provider_id: null,
      paid_at: null,
    },
    parent: {
      email: String(parent_email || '').trim().toLowerCase(),
      phone: String(parent_phone || '').trim(),
      first_name: String(parent_first_name || '').trim(),
      last_name: String(parent_last_name || '').trim(),
    },
    child: null,
    documents: null,
    reminders_sent: 0,
    last_reminder_at: null,
  };
}

export async function saveOrder(order) {
  order.updated_at = new Date().toISOString();
  if (supabaseConfigured()) {
    await supabaseFetch('stage_orders?on_conflict=id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: order,
    });
    return order;
  }
  const list = readLocal();
  const idx = list.findIndex((o) => o.id === order.id);
  if (idx >= 0) list[idx] = order;
  else list.unshift(order);
  writeLocal(list);
  return order;
}

export async function getOrder(id) {
  const oid = String(id || '').trim();
  if (!oid) return null;
  if (supabaseConfigured()) {
    const rows = await supabaseFetch(`stage_orders?id=eq.${encodeURIComponent(oid)}&select=*`);
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  }
  return readLocal().find((o) => o.id === oid) || null;
}

export async function getOrderByToken(id, token) {
  const order = await getOrder(id);
  if (!order) return null;
  if (String(order.access_token) !== String(token || '')) return null;
  return order;
}

export async function listOrders({ club = null, limit = 200 } = {}) {
  if (supabaseConfigured()) {
    let path = `stage_orders?select=*&order=created_at.desc&limit=${Math.min(500, Number(limit) || 200)}`;
    if (club) path += `&club=eq.${encodeURIComponent(club)}`;
    const rows = await supabaseFetch(path);
    return Array.isArray(rows) ? rows : [];
  }
  let list = readLocal();
  if (club) list = list.filter((o) => o.club === club);
  return list.slice(0, Math.min(500, Number(limit) || 200));
}

export async function countPaidOrReserved(club) {
  const list = await listOrders({ club, limit: 500 });
  return list.filter((o) =>
    ['paid', 'form_pending', 'complete', 'checkout'].includes(o.status)
  ).length;
}

export async function assertStockAvailable(club) {
  const max = stockForClub(club);
  const used = await countPaidOrReserved(club);
  if (used >= max) {
    const err = new Error('Plus de places disponibles pour ce club.');
    err.code = 'sold_out';
    throw err;
  }
  return { max, used, remaining: max - used };
}

export function markPaid(order, { method, provider, provider_id }) {
  order.status = 'form_pending';
  order.payment = {
    ...(order.payment || {}),
    status: 'paid',
    method,
    provider,
    provider_id: provider_id || null,
    paid_at: new Date().toISOString(),
  };
  return order;
}

export function publicOrderView(order) {
  if (!order) return null;
  return {
    id: order.id,
    status: order.status,
    club: order.club,
    club_label: order.club_label,
    is_member: order.is_member,
    amount_cents: order.amount_cents,
    currency: order.currency,
    payment: {
      status: order.payment?.status || 'pending',
      method: order.payment?.method || null,
    },
    parent: {
      email: order.parent?.email || '',
      phone: order.parent?.phone || '',
      first_name: order.parent?.first_name || '',
      last_name: order.parent?.last_name || '',
    },
    child: order.child || null,
    documents: order.documents
      ? { accepted_at: order.documents.accepted_at, image_rights: order.documents.image_rights }
      : null,
    stage: STAGE,
  };
}
