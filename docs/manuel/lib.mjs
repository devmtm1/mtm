// Outils partagés par les deux générateurs du guide : le guide complet (build.mjs)
// et les guides par métier (build-guides.mjs).
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ICI = dirname(fileURLToPath(import.meta.url));
export const SORTIE = join(ICI, '..', '..', 'apps', 'backoffice', 'public', 'manuel');

export const echapper = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Sépare l'en-tête « --- clé: valeur --- » du corps Markdown. */
export function lireFrontMatter(fichier, brut, cles) {
  const m = brut.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${fichier} : en-tête --- manquant`);
  const meta = {};
  for (const ligne of m[1].split('\n')) {
    const i = ligne.indexOf(':');
    if (i > 0) meta[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim();
  }
  for (const cle of cles) {
    if (!meta[cle]) throw new Error(`${fichier} : « ${cle} » manquant`);
  }
  return { meta, corps: m[2] };
}

/** Les guides par métier : docs/manuel/guides/*.md. */
export function lireGuides() {
  return readdirSync(join(ICI, 'guides'))
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((fichier) => {
      const brut = readFileSync(join(ICI, 'guides', fichier), 'utf8');
      const { meta, corps } = lireFrontMatter(fichier, brut, ['id', 'titre', 'soustitre', 'role', 'public', 'version']);
      return { ...meta, fichier, corps };
    });
}
