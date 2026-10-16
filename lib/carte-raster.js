import { createCanvas, loadImage } from '@napi-rs/canvas';
import { CARTE_H, CARTE_W, drawCarte } from './carte-draw.js';

export async function rasterCartePng(data) {
  const canvas = createCanvas(CARTE_W, CARTE_H);
  const ctx = canvas.getContext('2d');
  await drawCarte(ctx, data, {
    loadImage: (url) => loadImage(url),
  });
  return canvas.toBuffer('image/png');
}
