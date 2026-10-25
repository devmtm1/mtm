// Aide commune au worker Cloudflare Pages du site public (voir worker/index.js).
//
// Le site est une application React : sans JavaScript, une fiche de bien n'a ni titre, ni description,
// ni photo. Ces fonctions lisent la fiche dans l'API et l'écrivent dans l'en-tête de la page avant de
// l'envoyer. Google et les aperçus de partage (WhatsApp, Facebook) voient alors la bonne fiche, sans
// attendre l'exécution du JavaScript. Si l'API est lente ou en panne, la page normale est servie telle
// quelle : le site ne dépend jamais de ces fonctions pour s'afficher.

export const SITE_URL = 'https://www.mtm-immobilier.com';
export const SITE_NAME = 'MTM Immobilier';
const API_PAR_DEFAUT = 'https://api.mtm-immobilier.com/api';
const DELAI_API_MS = 2500;

export function apiUrl(env) {
  return (env.API_URL || API_PAR_DEFAUT).replace(/\/+$/, '');
}

/** Lit l'API avec un délai maximum ; renvoie `{ statut, donnees }` (donnees `null` si indisponible). */
export async function lireApi(env, chemin) {
  const controle = new AbortController();
  const minuteur = setTimeout(() => controle.abort(), DELAI_API_MS);
  try {
    const reponse = await fetch(`${apiUrl(env)}${chemin}`, {
      signal: controle.signal,
      headers: { Accept: 'application/json' },
      // La fiche est gardée 5 minutes côté Cloudflare : l'API n'est pas sollicitée à chaque visite.
      cf: { cacheEverything: true, cacheTtl: 300 },
    });
    if (reponse.status === 404) return { statut: 404, donnees: null };
    if (!reponse.ok) return { statut: reponse.status, donnees: null };
    return { statut: 200, donnees: await reponse.json() };
  } catch {
    return { statut: 0, donnees: null };
  } finally {
    clearTimeout(minuteur);
  }
}

export function echapper(texte) {
  return String(texte ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Texte d'une ligne, ramené à `max` caractères au plus. */
export function resume(texte, secours, max = 158) {
  const propre = String(texte ?? '').replace(/\s+/g, ' ').trim();
  const base = propre.length >= 40 ? propre : [propre, secours].filter(Boolean).join(' – ');
  return base.length > max ? `${base.slice(0, max - 3).trimEnd()}…` : base;
}

const NATURES = {
  terrain_nu: 'Terrain',
  villa: 'Villa',
  appartement: 'Appartement',
  immeuble: 'Immeuble',
  local_commercial: 'Local commercial',
  bureau: 'Bureau',
  entrepot: 'Entrepôt',
};

export function nature(valeur) {
  return NATURES[valeur] || 'Bien';
}

export function premierePhoto(medias) {
  return (medias || []).find((media) => media.type === 'photo')?.secureUrl || null;
}

/**
 * Sert `index.html` (l'application) avec les balises de la fiche : titre, description, adresse
 * canonique, aperçu de partage et données structurées. `fiche` = null → page servie sans changement.
 */
export async function pageAvecBalises({ request, env, fiche, statut = 200 }) {
  const reponse = await env.ASSETS.fetch(new URL('/index.html', request.url));
  if (!fiche) return statut === 200 ? reponse : new Response(reponse.body, { status: statut, headers: reponse.headers });

  const titre = `${fiche.titre} · ${SITE_NAME}`;
  const image = fiche.image || `${SITE_URL}/hero-poster.jpg`;
  const jsonLd = (fiche.jsonLd || []).map((bloc) => `<script type="application/ld+json">${JSON.stringify(bloc).replace(/</g, '\\u003c')}</script>`).join('');
  const balises = [
    `<link rel="canonical" href="${echapper(fiche.url)}">`,
    `<meta property="og:title" content="${echapper(titre)}">`,
    `<meta property="og:description" content="${echapper(fiche.description)}">`,
    `<meta property="og:url" content="${echapper(fiche.url)}">`,
    `<meta property="og:image" content="${echapper(image)}">`,
    `<meta name="twitter:title" content="${echapper(titre)}">`,
    `<meta name="twitter:description" content="${echapper(fiche.description)}">`,
    `<meta name="twitter:image" content="${echapper(image)}">`,
    jsonLd,
  ].join('\n');

  const rewriter = new HTMLRewriter()
    .on('title', { element: (el) => el.setInnerContent(titre) })
    .on('meta[name="description"]', { element: (el) => el.setAttribute('content', fiche.description) })
    // Les balises de partage par défaut du site cèdent la place à celles de la fiche.
    .on('meta[name="robots"]', { element: (el) => el.remove() })
    .on('meta[property^="og:"]', { element: (el) => el.remove() })
    .on('meta[name^="twitter:"]', { element: (el) => el.remove() })
    .on('script[type="application/ld+json"]', { element: (el) => el.remove() })
    .on('head', {
      element: (el) => {
        el.append(`${balises}\n<meta property="og:type" content="website"><meta property="og:site_name" content="${SITE_NAME}"><meta property="og:locale" content="fr_FR"><meta name="twitter:card" content="summary_large_image">`, { html: true });
        el.append(`<meta name="robots" content="${fiche.noindex ? 'noindex, nofollow' : 'index, follow'}">`, { html: true });
      },
    })
    // Texte lisible sans JavaScript (moteurs, lecteurs d'aperçu) ; l'application le remplace au chargement.
    .on('div#root', {
      element: (el) => {
        el.append(`<noscript><h1>${echapper(fiche.titre)}</h1><p>${echapper(fiche.description)}</p></noscript>`, { html: true });
      },
    });

  const reponseBalisee = rewriter.transform(reponse);
  const entetes = new Headers(reponseBalisee.headers);
  entetes.set('Cache-Control', 'public, max-age=0, s-maxage=300, must-revalidate');
  return new Response(reponseBalisee.body, { status: statut, headers: entetes });
}
