import { SITE_URL, echapper, lireApi } from './_lib/seo.js';

// Plan du site : les pages fixes, puis chaque bien, annonce, réalisation et projet publié.
// Il se met à jour tout seul : un bien publié au back-office apparaît ici sous cinq minutes.

const PAGES_FIXES = [
  ['/', 'weekly', '1.0'],
  ['/terrains', 'daily', '0.9'],
  ['/locations', 'daily', '0.9'],
  ['/a-propos', 'monthly', '0.6'],
  ['/gestion-locative', 'monthly', '0.7'],
  ['/construction', 'monthly', '0.7'],
  ['/demarches-administratives', 'monthly', '0.7'],
  ['/realisations', 'weekly', '0.7'],
  ['/projets-a-venir', 'weekly', '0.7'],
  ['/actualites', 'weekly', '0.7'],
  ['/contact', 'monthly', '0.8'],
  ['/mentions-legales', 'yearly', '0.2'],
  ['/confidentialite', 'yearly', '0.2'],
];

/** Parcourt les pages d'une liste de l'API (au plus `maxPages`). */
async function toutesLesPages(env, chemin, taille, maxPages = 10) {
  const items = [];
  for (let page = 1; page <= maxPages; page++) {
    const { donnees } = await lireApi(env, `${chemin}?page=${page}&pageSize=${taille}`);
    if (!donnees?.items?.length) break;
    items.push(...donnees.items);
    if (items.length >= donnees.total) break;
  }
  return items;
}

function entree(chemin, { frequence, priorite, modifie } = {}) {
  return [
    '  <url>',
    `    <loc>${echapper(SITE_URL + chemin)}</loc>`,
    modifie ? `    <lastmod>${new Date(modifie).toISOString().slice(0, 10)}</lastmod>` : '',
    frequence ? `    <changefreq>${frequence}</changefreq>` : '',
    priorite ? `    <priority>${priorite}</priority>` : '',
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function onRequestGet({ env }) {
  const [terrains, locations, vitrine] = await Promise.all([
    toutesLesPages(env, '/terrains/public', 200),
    toutesLesPages(env, '/locatif/public/biens', 100),
    lireApi(env, '/showcase').then((reponse) => (Array.isArray(reponse.donnees) ? reponse.donnees : [])),
  ]);

  const lignes = [
    ...PAGES_FIXES.map(([chemin, frequence, priorite]) => entree(chemin, { frequence, priorite })),
    ...terrains.map((t) => entree(`/terrains/${t.id}`, { frequence: 'weekly', priorite: '0.8', modifie: t.updatedAt })),
    ...locations.map((l) => entree(`/locations/${l.id}`, { frequence: 'weekly', priorite: '0.8', modifie: l.publieLe })),
    ...vitrine.map((v) =>
      entree(`${v.category === 'projet_a_venir' ? '/projets-a-venir' : '/realisations'}/${v.id}`, { frequence: 'monthly', priorite: '0.6' }),
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lignes.join('\n')}\n</urlset>\n`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Une API endormie ne doit pas figer un plan du site vide : court délai de garde.
      'Cache-Control': `public, max-age=0, s-maxage=${terrains.length + locations.length > 0 ? 3600 : 60}`,
    },
  });
}
