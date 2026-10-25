// Après le build : place le worker (SEO des fiches, plan du site) dans dist/_worker.js et limite son
// action, via _routes.json, aux seules adresses qui en ont besoin. Le reste du site reste servi
// directement par Cloudflare Pages, comme avant.
import { cpSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const cible = join(racine, 'dist', '_worker.js');

rmSync(cible, { recursive: true, force: true });
cpSync(join(racine, 'worker'), cible, { recursive: true });
writeFileSync(
  join(racine, 'dist', '_routes.json'),
  JSON.stringify({
    version: 1,
    include: ['/', '/sitemap.xml', '/terrains/*', '/locations/*', '/realisations/*', '/projets-a-venir/*'],
    exclude: [],
  }),
);
console.log('Worker du site public prêt dans dist/_worker.js');
