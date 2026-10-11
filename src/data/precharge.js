/** Préchargement d'une photo du héros avec exactement le même srcset que son <img>. */
import manifest from './photos.json';

export function precharge(nom, sizes) {
  const m = manifest.photos[nom];
  const srcset = m.widths.map((w) => `/img/photos/${nom}-${w}.webp ${w}w`).join(', ');
  const w = m.widths.find((x) => x >= 1024) ?? m.widths[m.widths.length - 1];
  return { srcset, sizes, src: `/img/photos/${nom}-${w}.webp` };
}
