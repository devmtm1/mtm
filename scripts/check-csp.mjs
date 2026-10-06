/**
 * Contrôle de la politique de sécurité du contenu (CSP) des deux sites.
 *
 * La CSP est appliquée (et non plus seulement observée) : une origine externe
 * oubliée dans `public/_headers` casse une police, une carte ou un appel API
 * en production, sans que rien ne le signale au développement. Ce contrôle
 * échoue en CI dans ces cas :
 *   - l'en-tête est redevenu « Report-Only » ou a disparu ;
 *   - `script-src` autorise `unsafe-inline` ou `unsafe-eval` ;
 *   - la page d'entrée charge une ressource d'une origine non autorisée par
 *     la directive qui la concerne (script, feuille de style, image) ;
 *   - la page d'entrée contient un script ou un gestionnaire d'événement en
 *     ligne (bloqué par la CSP).
 *
 * Usage : node scripts/check-csp.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const sites = [
  { nom: 'site public', headers: 'apps/public-web/public/_headers', page: 'apps/public-web/index.html' },
  { nom: 'back-office', headers: 'apps/backoffice/public/_headers', page: 'apps/backoffice/src/index.html' },
];

const erreurs = [];

function lireCsp(chemin) {
  const texte = readFileSync(resolve(racine, chemin), 'utf8');
  const lignes = texte.split(/\r?\n/).map((ligne) => ligne.trim());
  const reportOnly = lignes.some((ligne) => ligne.startsWith('Content-Security-Policy-Report-Only:'));
  const ligne = lignes.find((l) => l.startsWith('Content-Security-Policy:'));
  if (!ligne) return { reportOnly, directives: null };
  const directives = new Map();
  for (const morceau of ligne.slice('Content-Security-Policy:'.length).split(';')) {
    const [nom, ...sources] = morceau.trim().split(/\s+/);
    if (nom) directives.set(nom, sources);
  }
  return { reportOnly, directives };
}

/** Une URL est-elle couverte par la liste de sources d'une directive ? */
function autorisee(url, sources) {
  const { origin, hostname } = new URL(url);
  return sources.some((source) => {
    if (source === origin) return true;
    const joker = source.match(/^https:\/\/\*\.(.+)$/);
    return Boolean(joker && hostname.endsWith(`.${joker[1]}`));
  });
}

for (const { nom, headers, page } of sites) {
  const { reportOnly, directives } = lireCsp(headers);
  if (reportOnly) erreurs.push(`${nom} : l'en-tête Content-Security-Policy-Report-Only ne doit pas rester (la CSP n'est pas appliquée).`);
  if (!directives) {
    erreurs.push(`${nom} : aucun en-tête Content-Security-Policy appliqué dans ${headers}.`);
    continue;
  }

  const scripts = directives.get('script-src') ?? directives.get('default-src') ?? [];
  for (const interdit of ["'unsafe-inline'", "'unsafe-eval'"]) {
    if (scripts.includes(interdit)) erreurs.push(`${nom} : script-src ne doit pas contenir ${interdit}.`);
  }
  if ((directives.get('frame-ancestors') ?? []).join(' ') !== "'none'") {
    erreurs.push(`${nom} : frame-ancestors doit valoir 'none'.`);
  }

  const html = readFileSync(resolve(racine, page), 'utf8');

  if (/\son[a-z]+\s*=\s*["']/i.test(html)) {
    erreurs.push(`${nom} : ${page} contient un gestionnaire d'événement en ligne (onload=…), bloqué par la CSP.`);
  }
  if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) {
    erreurs.push(`${nom} : ${page} contient un script en ligne, bloqué par la CSP.`);
  }

  const verifications = [
    { re: /<link[^>]+rel=["']stylesheet["'][^>]*>/gi, attr: 'href', directive: 'style-src' },
    { re: /<script[^>]+src=[^>]*>/gi, attr: 'src', directive: 'script-src' },
    { re: /<img[^>]+src=[^>]*>/gi, attr: 'src', directive: 'img-src' },
  ];
  for (const { re, attr, directive } of verifications) {
    for (const balise of html.match(re) ?? []) {
      const url = balise.match(new RegExp(`${attr}=["'](https?://[^"']+)["']`, 'i'))?.[1];
      if (!url) continue;
      const sources = directives.get(directive) ?? directives.get('default-src') ?? [];
      if (!autorisee(url, sources)) {
        erreurs.push(`${nom} : ${url} (${directive}) n'est pas autorisée par la CSP de ${headers}.`);
      }
    }
  }
  // Les polices sont demandées par la feuille Google Fonts : gstatic doit rester autorisé.
  if (/fonts\.googleapis\.com/.test(html) && !autorisee('https://fonts.gstatic.com/', directives.get('font-src') ?? [])) {
    erreurs.push(`${nom} : fonts.gstatic.com doit figurer dans font-src (Google Fonts est chargé).`);
  }
}

if (erreurs.length > 0) {
  console.error('Contrôle CSP : échec\n - ' + erreurs.join('\n - '));
  process.exit(1);
}
console.log(`Contrôle CSP : OK (${sites.map((site) => site.nom).join(', ')})`);
