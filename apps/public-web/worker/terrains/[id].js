import { SITE_URL, lireApi, nature, pageAvecBalises, premierePhoto, resume } from '../_lib/seo.js';

// Fiche d'un bien à vendre : balises de la fiche écrites dans la page avant son envoi.
export async function onRequestGet({ request, env, params }) {
  const id = String(params.id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return pageAvecBalises({ request, env, fiche: null });

  const { statut, donnees: terrain } = await lireApi(env, `/terrains/public/${id}`);
  if (statut === 404) {
    return pageAvecBalises({ request, env, statut: 404, fiche: { titre: 'Bien introuvable', description: 'Ce bien n’est plus disponible.', url: `${SITE_URL}/terrains`, noindex: true } });
  }
  if (!terrain) return pageAvecBalises({ request, env, fiche: null });

  const vendu = terrain.statutCommercial === 'Vendu';
  const lieu = [terrain.commune, terrain.region].filter(Boolean).join(', ');
  const titre = [vendu ? `${terrain.nom} (vendu)` : terrain.nom, lieu].filter(Boolean).join(' – ');
  const description = resume(terrain.description, [nature(terrain.typeBien), vendu ? 'vendu' : 'à vendre', lieu && `à ${lieu}`].filter(Boolean).join(' '));
  const url = `${SITE_URL}/terrains/${terrain.id}`;
  const image = premierePhoto(terrain.medias);

  return pageAvecBalises({
    request,
    env,
    fiche: {
      titre,
      description,
      url,
      image,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: titre,
          description,
          sku: terrain.referenceInterne,
          ...(image ? { image: [image] } : {}),
          brand: { '@type': 'Brand', name: 'MTM Immobilier' },
          url,
          ...(terrain.prixPublic && !vendu
            ? {
                offers: {
                  '@type': 'Offer',
                  price: terrain.prixPublic,
                  priceCurrency: 'XOF',
                  availability: 'https://schema.org/InStock',
                  url,
                  seller: { '@type': 'RealEstateAgent', name: 'MTM Immobilier', url: SITE_URL },
                },
              }
            : {}),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Biens à vendre', item: `${SITE_URL}/terrains` },
            { '@type': 'ListItem', position: 3, name: titre, item: url },
          ],
        },
      ],
    },
  });
}
