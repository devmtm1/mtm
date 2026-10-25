import { SITE_URL } from './seo.js';

// Identique à donneesAgence() de src/utils/seo.ts : à garder synchronisé.
export function donneesAgence() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      '@id': `${SITE_URL}/#agence`,
      name: 'MTM Immobilier',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/logomtm-mark.png`,
      image: `${SITE_URL}/hero-poster.jpg`,
      description: 'Terrains et villas vérifiés, gestion locative, construction et démarches foncières au Sénégal.',
      telephone: '+221783662651',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Malibou, Cité Dalal Diam, non loin de l’hôpital Dalal Diam',
        addressLocality: 'Dakar',
        addressCountry: 'SN',
      },
      areaServed: { '@type': 'Country', name: 'Sénégal' },
      geo: { '@type': 'GeoCoordinates', latitude: 14.7753, longitude: -17.4081 },
    },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'MTM Immobilier', url: `${SITE_URL}/` },
  ];
}
