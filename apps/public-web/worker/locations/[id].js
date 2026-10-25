import { SITE_URL, lireApi, nature, pageAvecBalises, premierePhoto, resume } from '../_lib/seo.js';

// Annonce de location : balises de la fiche écrites dans la page avant son envoi.
export async function onRequestGet({ request, env, params }) {
  const id = String(params.id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return pageAvecBalises({ request, env, fiche: null });

  const { statut, donnees: location } = await lireApi(env, `/locatif/public/biens/${id}`);
  if (statut === 404) {
    return pageAvecBalises({ request, env, statut: 404, fiche: { titre: 'Annonce introuvable', description: 'Cette annonce n’est plus disponible.', url: `${SITE_URL}/locations`, noindex: true } });
  }
  if (!location) return pageAvecBalises({ request, env, fiche: null });

  const lieu = [location.commune, location.region].filter(Boolean).join(', ');
  const base = location.titre || `${nature(location.type)}${location.commune ? ` à ${location.commune}` : ''}`;
  const titre = [base, lieu].filter(Boolean).join(' – ');
  const description = resume(location.description, `${nature(location.type)} à louer${lieu ? ` à ${lieu}` : ''}`);
  const url = `${SITE_URL}/locations/${location.id}`;
  const image = premierePhoto(location.medias);
  const prix = location.modeLocation === 'courte_duree' ? location.prixNuit : location.loyerMensuel;

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
          sku: location.referenceInterne,
          ...(image ? { image: [image] } : {}),
          brand: { '@type': 'Brand', name: 'MTM Immobilier' },
          url,
          ...(prix
            ? {
                offers: {
                  '@type': 'Offer',
                  price: prix,
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
            { '@type': 'ListItem', position: 2, name: 'Locations', item: `${SITE_URL}/locations` },
            { '@type': 'ListItem', position: 3, name: titre, item: url },
          ],
        },
      ],
    },
  });
}
