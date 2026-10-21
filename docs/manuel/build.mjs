// Fabrique le guide d'utilisation : chapitres Markdown -> une page web autonome.
//
//   npm run manuel            (depuis la racine du dépôt)
//
// Sources  : docs/manuel/chapitres/*.md et docs/manuel/assets/
// Résultat : apps/backoffice/public/manuel/ (servi par le back-office sur /manuel/)
// Les captures d'écran sont dans apps/backoffice/public/manuel/img/.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { lireGuides } from './lib.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const SORTIE = join(ICI, '..', '..', 'apps', 'backoffice', 'public', 'manuel');
mkdirSync(SORTIE, { recursive: true });

const PROFILS = [
  ['tous', 'Tout le monde'],
  ['commercial', 'Commercial'],
  ['responsable_commercial', 'Responsable commercial ou manager'],
  ['direction', 'Direction'],
  ['comptabilite', 'Comptabilité'],
  ['gestion_locative', 'Gestion locative'],
  ['verifications', 'Vérifications (démarches)'],
  ['chantiers', 'Chantiers'],
  ['administrateur', 'Administrateur'],
  ['rh', 'Ressources humaines et autres'],
];
const GROUPES = { base: 'Pour tout le monde', metier: 'Par métier', reference: 'Pour s’y retrouver' };

const echapper = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function lireChapitre(fichier) {
  const brut = readFileSync(join(ICI, 'chapitres', fichier), 'utf8').replace(/\r\n/g, '\n');
  const m = brut.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${fichier} : en-tête --- manquant`);
  const meta = {};
  for (const ligne of m[1].split('\n')) {
    const i = ligne.indexOf(':');
    if (i > 0) meta[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim();
  }
  for (const cle of ['id', 'titre', 'groupe', 'resume', 'roles']) {
    if (!meta[cle]) throw new Error(`${fichier} : « ${cle} » manquant`);
  }
  meta.roles = meta.roles.split(/[\s,]+/).filter(Boolean);
  return { ...meta, fichier, corps: m[2] };
}

const chapitres = readdirSync(join(ICI, 'chapitres'))
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map(lireChapitre);

const imagesManquantes = [];
const sections = chapitres.map((ch) => {
  const titres = [];
  const renderer = {
    heading({ tokens, depth }) {
      const texte = this.parser.parseInline(tokens);
      const id = `${ch.id}--${slug(texte)}`;
      if (depth === 2) titres.push({ id, texte });
      return `<h${depth} id="${id}">${texte}</h${depth}>\n`;
    },
    image({ href, title, text }) {
      if (!existsSync(join(SORTIE, href))) imagesManquantes.push(`${ch.fichier} : ${href}`);
      const classe = /telephone/.test(href) ? ' class="mobile"' : '';
      return `<a href="${echapper(href)}" target="_blank" rel="noopener"><img${classe} src="${echapper(href)}" alt="${echapper(text)}" loading="lazy"${title ? ` title="${echapper(title)}"` : ''}></a>`;
    },
    blockquote({ tokens }) {
      const interne = this.parser.parse(tokens);
      const classe = /<strong>(Attention|À ne jamais faire|Important)/.test(interne) ? ' class="attention"' : '';
      return `<blockquote${classe}>${interne}</blockquote>\n`;
    },
  };
  marked.use({ renderer, gfm: true });
  let html = marked.parse(ch.corps);
  return { ...ch, html, titres };
});

// Cartes de l'accueil : un chapitre par carte, regroupés par profil.
const cartes = sections
  .filter((s) => s.groupe !== 'reference' && s.id !== 'bienvenue')
  .map((s) => `<li><a href="#${s.id}"><strong>${echapper(s.titre)}</strong><span>${echapper(s.resume)}</span></a></li>`)
  .join('\n');

const sommaire = Object.entries(GROUPES)
  .map(([cle, titre]) => {
    const items = sections
      .filter((s) => s.groupe === cle)
      .map((s) => `<li><a href="#${s.id}" data-chapitre="${s.id}" data-roles="${s.roles.join(' ')}">${echapper(s.titre)}</a></li>`)
      .join('\n');
    return items ? `<h2>${titre}</h2>\n<ul>\n${items}\n</ul>` : '';
  })
  .join('\n');

const cartesGuides = lireGuides()
  .map((g) => `<li><a href="${g.id}.html"><strong>${echapper(g.titre)}</strong><span>${echapper(g.soustitre)}</span></a></li>`)
  .join('\n');

const ordre = sections.map((s) => s.id);
const corps = sections
  .map((s, i) => {
    const html = s.html
      .replace('{{CARTES}}', `<ul class="accueil-cartes">\n${cartes}\n</ul>`)
      .replace('{{GUIDES}}', `<ul class="accueil-cartes">\n${cartesGuides}\n</ul>`);
    const surCette =
      s.titres.length > 2
        ? `<nav class="surcette" aria-label="Sur cette page"><strong>Sur cette page</strong><ul>${s.titres
            .map((t) => `<li><a href="#${t.id}">${t.texte}</a></li>`)
            .join('')}</ul></nav>`
        : '';
    const prec = i > 0 ? sections[i - 1] : null;
    const suiv = i < sections.length - 1 ? sections[i + 1] : null;
    const pagination = `<nav class="pagination" aria-label="Chapitres voisins">${
      prec ? `<a href="#${prec.id}" rel="prev"><small>Précédent</small>${echapper(prec.titre)}</a>` : '<span></span>'
    }${suiv ? `<a href="#${suiv.id}" rel="next"><small>Suivant</small>${echapper(suiv.titre)}</a>` : ''}</nav>`;
    return `<article class="chapitre" id="${s.id}" data-titre="${echapper(s.titre)}">
<header class="chapitre__entete">
<p class="chapitre__ligne">${GROUPES[s.groupe]}</p>
<h1>${echapper(s.titre)}</h1>
<p class="chapitre__resume">${echapper(s.resume)}</p>
</header>
${surCette}
${html}
${pagination}
</article>`;
  })
  .join('\n');

const aujourdhui = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Guide d’utilisation — MTM Immobilier</title>
<link rel="icon" href="../favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="manuel.css">
</head>
<body>
<header class="entete">
<a class="entete__marque" href="#bienvenue"><img src="../logomtm.jpeg" alt="MTM Immobilier"><span><strong>Guide d’utilisation</strong><span>MTM Immobilier · mis à jour le ${aujourdhui}</span></span></a>
<div class="entete__outils">
<div class="recherche"><input id="recherche" type="search" placeholder="Rechercher dans le guide…  ( / )" aria-label="Rechercher dans le guide" autocomplete="off"></div>
<div class="profil"><select id="profil" aria-label="Je suis">
${PROFILS.map(([v, l]) => `<option value="${v}">${v === 'tous' ? 'Je suis… (choisir mon métier)' : l}</option>`).join('\n')}
</select></div>
<a class="bouton" href="/">Ouvrir le back-office</a>
<button class="bouton bouton--menu" id="bouton-menu" type="button" aria-controls="sommaire">Menu</button>
</div>
</header>
<div class="page">
<nav class="sommaire" id="sommaire" aria-label="Sommaire du guide">
${sommaire}
</nav>
<main class="contenu" id="contenu">
<div class="resultats-recherche" id="resultats-recherche" hidden></div>
${corps}
</main>
</div>
<script src="manuel.js" defer></script>
</body>
</html>
`;

writeFileSync(join(SORTIE, 'index.html'), page);
copyFileSync(join(ICI, 'assets', 'manuel.css'), join(SORTIE, 'manuel.css'));
copyFileSync(join(ICI, 'assets', 'manuel.js'), join(SORTIE, 'manuel.js'));

console.log(`Guide fabriqué : ${sections.length} chapitres -> ${SORTIE}`);
if (imagesManquantes.length) {
  console.error('Images introuvables :\n  ' + imagesManquantes.join('\n  '));
  process.exitCode = 1;
}
