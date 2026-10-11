/**
 * Zone de signature : doigt, stylet ou souris. Tracé lissé (courbes quadratiques),
 * épaisseur qui varie avec la vitesse, export PNG compact (l'API accepte 200 000 caractères).
 */
export function padSignature(toile, { surTrait = () => {}, surVide = () => {} } = {}) {
  const ctx = toile.getContext('2d');
  let traits = 0;
  let enCours = false;
  let dernier = null;
  let largeur = 2.6;

  const dimensionner = () => {
    const r = toile.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const image = traits ? toile.toDataURL() : null;
    toile.width = Math.round(r.width * dpr);
    toile.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0c1020';
    if (image) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height);
      img.src = image;
    }
  };
  const point = (e) => {
    const r = toile.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
  };
  toile.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try {
      toile.setPointerCapture(e.pointerId);
    } catch {
      /* certains navigateurs refusent la capture : le tracé marche quand même */
    }
    enCours = true;
    dernier = point(e);
    ctx.beginPath();
    ctx.arc(dernier.x, dernier.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#0c1020';
    ctx.fill();
  });
  toile.addEventListener('pointermove', (e) => {
    if (!enCours) return;
    const p = point(e);
    const d = Math.hypot(p.x - dernier.x, p.y - dernier.y);
    const v = d / Math.max(1, p.t - dernier.t);
    largeur = largeur * 0.7 + Math.max(1.2, Math.min(3.6, 3.8 - v * 1.6)) * 0.3;
    ctx.lineWidth = largeur;
    ctx.beginPath();
    ctx.moveTo(dernier.x, dernier.y);
    const mx = (dernier.x + p.x) / 2;
    const my = (dernier.y + p.y) / 2;
    ctx.quadraticCurveTo(dernier.x, dernier.y, mx, my);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (d > 2) {
      if (!traits) surTrait();
      traits += 1;
    }
    dernier = p;
  });
  const fin = () => {
    enCours = false;
  };
  toile.addEventListener('pointerup', fin);
  toile.addEventListener('pointercancel', fin);
  window.addEventListener('resize', dimensionner, { passive: true });
  // le canvas peut être caché au chargement : on le dimensionne quand il devient visible
  const surveille = () => {
    if (toile.getBoundingClientRect().width && toile.width !== Math.round(toile.getBoundingClientRect().width * Math.min(window.devicePixelRatio || 1, 2))) dimensionner();
    requestAnimationFrame(surveille);
  };
  requestAnimationFrame(surveille);

  return {
    vide: () => traits < 3,
    effacer() {
      ctx.clearRect(0, 0, toile.width, toile.height);
      traits = 0;
      surVide();
    },
    image() {
      // export à 600 px de large, fond transparent : quelques kilo-octets
      const r = toile.getBoundingClientRect();
      const w = 600;
      const h = Math.round((r.height / r.width) * w) || 200;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d').drawImage(toile, 0, 0, w, h);
      return c.toDataURL('image/png');
    },
  };
}
