import './load-env.js';

/** Domaine custom pas encore en DNS (NXDOMAIN) — ne jamais l'utiliser pour les retours PSP. */
const BROKEN_PUBLIC = new Set([
  'https://stages.boxingcenter.fr',
  'http://stages.boxingcenter.fr',
]);

export function publicUrl() {
  const onVercel = String(process.env.VERCEL || '') === '1';
  const raw = String(process.env.PUBLIC_URL || '').trim().replace(/\/+$/, '');
  if (raw && !BROKEN_PUBLIC.has(raw)) return raw;
  if (onVercel || BROKEN_PUBLIC.has(raw)) return 'https://stage-boxing.vercel.app';
  return 'http://127.0.0.1:5620';
}

export function priceGuestCents() {
  const n = Number(process.env.PRICE_GUEST_CENTS);
  return Number.isFinite(n) && n > 0 ? n : 14000;
}

export function priceMemberCents() {
  const n = Number(process.env.PRICE_MEMBER_CENTS);
  return Number.isFinite(n) && n > 0 ? n : 8000;
}

export function resolveAmountCents(isMember) {
  return isMember ? priceMemberCents() : priceGuestCents();
}

export function stockForClub(club) {
  const key = club === 'portet' ? 'STOCK_PORTET' : 'STOCK_MINIMES';
  const n = Number(process.env[key]);
  return Number.isFinite(n) && n >= 0 ? n : 40;
}

export const STAGE = {
  id: 'vacances-boxeurs-2026-10',
  name: 'Les Vacances des Boxeurs',
  dates_label: 'du 26 au 31 octobre 2026',
  start: '2026-10-26',
  end: '2026-10-31',
  age_min: 8,
  age_max: 16,
  days: 6,
  sessions_per_day: 2,
};
