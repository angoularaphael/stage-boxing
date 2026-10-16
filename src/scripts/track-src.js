/**
 * ?src=mail|sms|ig — memorise pour la session et enregistre une visite.
 */
const KEY = 'bc-stage-src';
const PV = 'bc-stage-pv';

function readUtm() {
  const p = new URLSearchParams(location.search);
  return (p.get('src') || p.get('utm_source') || '').toLowerCase().trim();
}

function readSource() {
  const raw = readUtm();
  if (raw) {
    try {
      sessionStorage.setItem(KEY, raw);
    } catch {
      /* ignore */
    }
    return raw;
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
  const body = JSON.stringify({
    src: readSource(),
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
