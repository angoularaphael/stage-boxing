/**
 * Typographie française, appliquée au build sur le HTML livré.
 * Une espace fine insécable (U+202F) avant ? ! ; et à l'intérieur des « guillemets », une espace
 * insécable (U+00A0) avant les deux-points : un signe ne tombe plus jamais seul en début de ligne.
 * Seul le texte est touché : jamais les balises, les attributs, les scripts (dont le JSON-LD), les
 * styles, les zones de saisie ni le code.
 * Et ce qui ne se sépare pas en fin de ligne : le nombre et son unité (80 €, 16 ans, 40 enfants), le jour et
 * son mois (26 octobre), le jour de la semaine et sa date (samedi 31), « métro B », et le
 * prénom et le nom de chaque intervenant (repris de src/data/clubs.js).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INTERVENANTS } from '../data/clubs.js';

const FINE = ' ';
const INSECABLE = ' ';
// un bloc à laisser tel quel, ou une balise : tout ce qui n'est pas du texte
const PAS_DU_TEXTE = /(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<textarea[\s\S]*?<\/textarea>|<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<!--[\s\S]*?-->|<[^>]+>)/i;

const MOIS = 'janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre';
const JOURS = 'lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche';
const UNITES = '€|ans?|kg|km|min|jours?|séances?|places?|enfants?|activités?|mois|semaines?|combats?|victoires?|défaites?';
const INSEPARABLES = [
  ...new Set(Object.values(INTERVENANTS).map((p) => p.nom).filter((n) => n.includes(' '))),
  'métro B',
];

export function corriger(texte) {
  let t = texte
    .replace(/ ([?!;])/g, `${FINE}$1`)
    .replace(/ :(?=[\s<]|$)/g, `${INSECABLE}:`)
    .replace(/« /g, `«${FINE}`)
    .replace(/ »/g, `${FINE}»`)
    .replace(new RegExp(`(\\d) (${UNITES})(?![\\p{L}])`, 'gu'), `$1${INSECABLE}$2`)
    .replace(/(\d) × (\d)/g, `$1${INSECABLE}×${INSECABLE}$2`)
    .replace(new RegExp(`(\\d{1,2}) (${MOIS})(?![\\p{L}])`, 'giu'), `$1${INSECABLE}$2`)
    .replace(new RegExp(`(?<![\\p{L}])(${JOURS}) (\\d{1,2})(?!\\d)`, 'giu'), `$1${INSECABLE}$2`)
    // « <b>80</b> € » : le symbole arrive seul dans son nœud de texte
    .replace(/^ €/, `${INSECABLE}€`);
  for (const n of INSEPARABLES) t = t.split(n).join(n.replace(/ /g, INSECABLE));
  return t;
}

export function typoHtml(html) {
  // split avec groupe capturant : indices impairs = balises et blocs protégés, pairs = texte
  return html
    .split(PAS_DU_TEXTE)
    .map((morceau, i) => (i % 2 === 1 ? morceau : corriger(morceau)))
    .join('');
}

async function pages(dossier) {
  const entrees = await readdir(dossier, { withFileTypes: true });
  const fichiers = await Promise.all(
    entrees.map((e) => {
      const p = path.join(dossier, e.name);
      if (e.isDirectory()) return pages(p);
      return e.name.endsWith('.html') ? [p] : [];
    }),
  );
  return fichiers.flat();
}

export default function typoFr() {
  return {
    name: 'typo-fr',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const racine = fileURLToPath(dir);
        const liste = await pages(racine);
        let touchees = 0;
        for (const f of liste) {
          const avant = await readFile(f, 'utf8');
          const apres = typoHtml(avant);
          if (apres !== avant) {
            await writeFile(f, apres, 'utf8');
            touchees += 1;
          }
        }
        logger.info(`typographie française : ${touchees} page(s) sur ${liste.length}`);
      },
    },
  };
}
