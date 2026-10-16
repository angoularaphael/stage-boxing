/**
 * Attribution visite : ?src=mail|sms|ig|flyer ou UTM flyer (QR affiche).
 */
import { resolveAttributionFromQuery } from '../../lib/attribution.js';

const KEY = 'bc-stage-src';
const PV = 'bc-stage-pv';

function readSource() {
  const normalized = resolveAttributionFromQuery(
    typeof location !== 'undefined' ? location.search : ''
  );
  if (normalized && normalized !== 'direct') {
    try {
      sessionStorage.setItem(KEY, normalized);
    } catch {
      /* ignore */
    }
    return normalized;
  }
  try {
    return sessionStorage.getItem(KEY) || 'direct';
  } catch {
    return 'direct';
  }
}

export function stageAttributionSrc() {
  return readSource();
}

function sendPageview() {
  try {
    if (sessionStorage.getItem(PV)) return;
    sessionStorage.setItem(PV, '1');
  } catch {
    /* ignore */
  }
  const src = readSource();
  const body = JSON.stringify({
    src,
    path: location.pathname + location.search,
  });
  try {
    navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }));
  } catch {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sendPageview, { once: true });
  } else {
    sendPageview();
  }
}
