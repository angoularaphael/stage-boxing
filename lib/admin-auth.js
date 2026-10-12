import { createHmac, timingSafeEqual } from 'node:crypto';
import './load-env.js';

function secretsEqual(provided, expected) {
  const b = Buffer.from(String(expected || ''), 'utf8');
  if (!b.length) return false;
  const a = Buffer.from(String(provided || ''), 'utf8');
  const ha = createHmac('sha256', b).update(a).digest();
  const hb = createHmac('sha256', b).update(b).digest();
  return timingSafeEqual(ha, hb);
}

function dbRole(role) {
  return role === 'super_admin' ? 'admin' : role || 'admin';
}

async function fetchAppUser(email) {
  const base = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!base || !key) return null;
  const res = await fetch(
    `${base}/rest/v1/app_users?email=eq.${encodeURIComponent(email)}&select=*&limit=1`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
    }
  );
  if (!res.ok) return null;
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

/**
 * Memes identifiants que BOXPLUS : SUPER_ADMIN_* puis table Supabase app_users (bcrypt).
 */
export async function verifyAdminLogin(email, password) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !password) return null;

  const superEmail = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const superPass = process.env.SUPER_ADMIN_PASSWORD || '';
  if (superEmail && secretsEqual(normalized, superEmail)) {
    if (superPass && secretsEqual(password, superPass)) {
      return { email: normalized, role: 'super_admin', name: 'Super administrateur' };
    }
    return null;
  }

  try {
    const data = await fetchAppUser(normalized);
    if (!data?.password_hash) return null;
    const bcrypt = await import('bcryptjs');
    const compare = bcrypt.compareSync || bcrypt.default?.compareSync;
    if (!compare?.(password, data.password_hash)) return null;
    return {
      email: data.email,
      role: dbRole(data.role),
      name: data.name || data.email,
    };
  } catch {
    return null;
  }
}

export { secretsEqual };
