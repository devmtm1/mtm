// Worker du site public (Cloudflare Pages, « mode avancé » : copié dans dist/_worker.js par
// scripts/prepare-worker.mjs au build). Il ne répond qu'aux adresses listées dans _routes.json ;
// tout le reste est servi directement par Pages, sans passer par ici.
import { onRequestGet as terrain } from './terrains/[id].js';
import { onRequestGet as location } from './locations/[id].js';
import { onRequestGet as realisation } from './realisations/[id].js';
import { onRequestGet as projet } from './projets-a-venir/[id].js';
import { onRequestGet as planDuSite } from './sitemap.xml.js';
import { SITE_URL, pageAvecBalises } from './_lib/seo.js';
import { donneesAgence } from './_lib/agence.js';

const FICHES = [
  [/^\/terrains\/([^/]+)\/?$/, terrain],
  [/^\/locations\/([^/]+)\/?$/, location],
  [/^\/realisations\/([^/]+)\/?$/, realisation],
  [/^\/projets-a-venir\/([^/]+)\/?$/, projet],
];

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (request.method === 'GET' || request.method === 'HEAD') {
      if (pathname === '/sitemap.xml') return planDuSite({ request, env });
      if (pathname === '/') {
        return pageAvecBalises({
          request,
          env,
          fiche: {
            titre: 'Terrains et villas vérifiés, gestion locative et construction au Sénégal',
            description:
              "MTM Immobilier accompagne particuliers et diaspora dans l'achat de terrains et de villas vérifiés, la vérification foncière, la gestion locative et la construction au Sénégal.",
            url: `${SITE_URL}/`,
            jsonLd: donneesAgence(),
          },
        });
      }
      for (const [motif, gestionnaire] of FICHES) {
        const trouve = pathname.match(motif);
        if (trouve) return gestionnaire({ request, env, params: { id: decodeURIComponent(trouve[1]) } });
      }
    }
    return env.ASSETS.fetch(request);
  },
};
