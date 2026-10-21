// Fabrique les guides par métier : un document par type d'utilisateur
// (commercial, responsable commercial, administrateur).
//
//   npm run manuel            (depuis la racine du dépôt ; lance aussi le guide complet)
//
// Sources  : docs/manuel/guides/*.md et docs/manuel/assets/guide.css|guide.js
// Résultat : apps/backoffice/public/manuel/<id>.html (servi sur /manuel/<id>)
// Chaque guide est une page autonome qui s'imprime proprement ; son PDF téléchargeable
// est fabriqué à part (npm run manuel:pdf).
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';
import { ICI, SORTIE, echapper, lireGuides } from './lib.mjs';

mkdirSync(SORTIE, { recursive: true });

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const guides = lireGuides();
const imagesManquantes = [];
const aujourdhui = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Une boîte d'information selon son premier mot en gras : Important, À retenir, Astuce… */
function classeBloc(html) {
  if (/<strong>(Attention|À ne jamais faire|Important)/.test(html)) return ' class="attention"';
  if (/<strong>(À retenir|Astuce|Bon réflexe)/.test(html)) return ' class="retenir"';
  return '';
}

for (const guide of guides) {
  const sections = [];
  const renderer = {
    heading({ tokens, depth }) {
      const texte = this.parser.parseInline(tokens);
      const id = slug(texte);
      if (depth === 2) sections.push({ id, texte });
      return `<h${depth} id="${id}">${texte}</h${depth}>\n`;
    },
    image({ href, title, text }) {
      if (!existsSync(join(SORTIE, href))) imagesManquantes.push(`${guide.fichier} : ${href}`);
      const classe = /telephone/.test(href) ? ' class="mobile"' : '';
      return `<figure${classe}><a href="${echapper(href)}" target="_blank" rel="noopener"><img src="${echapper(href)}" alt="${echapper(text)}" loading="lazy"${title ? ` title="${echapper(title)}"` : ''}></a><figcaption>${echapper(text)}</figcaption></figure>`;
    },
    blockquote({ tokens }) {
      const interne = this.parser.parse(tokens);
      return `<blockquote${classeBloc(interne)}>${interne}</blockquote>\n`;
    },
  };
  marked.use({ renderer, gfm: true });
  const corps = marked.parse(guide.corps);

  const sommaire = sections.map((s) => `<li><a href="#${s.id}">${s.texte}</a></li>`).join('\n');
  const autres = guides
    .filter((g) => g.id !== guide.id)
    .map((g) => `<li><a href="${g.id}.html"><strong>${echapper(g.titre)}</strong><span>${echapper(g.public)}</span></a></li>`)
    .join('\n');

  const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${echapper(guide.titre)} — MTM Immobilier</title>
<link rel="icon" href="../favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="guide.css">
</head>
<body>
<header class="barre">
<a class="barre__marque" href="#couverture"><img src="../logomtm.jpeg" alt="MTM Immobilier"><span><strong>${echapper(guide.titre)}</strong><span>MTM Immobilier</span></span></a>
<nav class="barre__outils" aria-label="Outils du guide">
<a class="bouton bouton--plein" href="pdf/guide-${guide.id}.pdf" download>Télécharger le PDF</a>
<button class="bouton" type="button" data-imprimer>Imprimer</button>
<a class="bouton" href="index.html">Guide complet</a>
<a class="bouton" href="/">Ouvrir le back-office</a>
<button class="bouton bouton--menu" type="button" id="bouton-sommaire" aria-controls="sommaire">Sommaire</button>
</nav>
</header>

<section class="couverture" id="couverture">
<img class="couverture__logo" src="../logomtm.jpeg" alt="MTM Immobilier">
<p class="couverture__role">${echapper(guide.role)}</p>
<h1>${echapper(guide.titre)}</h1>
<p class="couverture__soustitre">${echapper(guide.soustitre)}</p>
<dl class="couverture__infos">
<div><dt>Pour</dt><dd>${echapper(guide.public)}</dd></div>
<div><dt>Version</dt><dd>${echapper(guide.version)}</dd></div>
<div><dt>Édité le</dt><dd>${aujourdhui}</dd></div>
</dl>
<nav class="couverture__sommaire" aria-label="Sommaire">
<h2>Dans ce guide</h2>
<ol>
${sommaire}
</ol>
</nav>
</section>

<div class="page">
<nav class="sommaire" id="sommaire" aria-label="Sommaire du guide">
<h2>Sommaire</h2>
<ol>
${sommaire}
</ol>
</nav>
<main class="document" id="document">
${corps}
<aside class="aide-finale">
<h2>Besoin d’aide ?</h2>
<p>Commencez par la <strong>recherche</strong> du guide complet, ou appuyez sur <kbd>Ctrl</kbd> + <kbd>K</kbd> dans le back-office pour retrouver une page. Sinon, prévenez votre responsable en joignant une <strong>capture d’écran</strong>.</p>
<h3>Les autres guides</h3>
<ul class="aide-finale__guides">
${autres}
</ul>
</aside>
</main>
</div>
<script src="guide.js" defer></script>
</body>
</html>
`;
  writeFileSync(join(SORTIE, `${guide.id}.html`), page);
  console.log(`Guide « ${guide.titre} » -> ${guide.id}.html (${sections.length} parties)`);
}

copyFileSync(join(ICI, 'assets', 'guide.css'), join(SORTIE, 'guide.css'));
copyFileSync(join(ICI, 'assets', 'guide.js'), join(SORTIE, 'guide.js'));

if (imagesManquantes.length) {
  console.error('Images introuvables :\n  ' + imagesManquantes.join('\n  '));
  process.exitCode = 1;
}
