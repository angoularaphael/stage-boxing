import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { CARTE_H, CARTE_W, drawCarte } from './carte-draw.js';

// Les serveurs Vercel n'ont aucune police : sans celles-ci, tout le texte de la carte sortait vide (17/10).
// Montserrat est en instances fixes 600 et 800 (le canvas serveur ne lit pas l'axe de graisse d'une police variable).
let polices = false;
function enregistrerPolices() {
  if (polices) return;
  polices = true;
  const f = (nom) => fileURLToPath(new URL(`./fonts/${nom}`, import.meta.url));
  GlobalFonts.registerFromPath(f('bebas-neue-400.woff2'), 'Bebas Neue');
  GlobalFonts.registerFromPath(f('montserrat-600.ttf'), 'Montserrat');
  GlobalFonts.registerFromPath(f('montserrat-800.ttf'), 'Montserrat');
}

export async function rasterCartePng(data) {
  enregistrerPolices();
  const canvas = createCanvas(CARTE_W, CARTE_H);
  const ctx = canvas.getContext('2d');
  await drawCarte(ctx, data, {
    loadImage: (url) => loadImage(url),
  });
  return canvas.toBuffer('image/png');
}
