import { SITE_URL, urlCanonique } from '../hooks/usePageMetadata';
import type { Terrain } from '../types/terrain';
import type { Location } from '../types/location';
import type { ShowcaseItem } from '../types/showcase';

/** Description de repli (≈ 155 caractères) : le texte saisi, sinon une phrase construite avec les chiffres du bien. */
export function descriptionDe(texte: string | null | undefined, secours: string): string {
  const propre = (texte ?? '').replace(/\s+/g, ' ').trim();
  const base = propre.length >= 40 ? propre : [propre, secours].filter(Boolean).join(' – ');
  return base.length > 158 ? `${base.slice(0, 155).trimEnd()}…` : base;
}

/** Fil d'Ariane : Google l'affiche dans le résultat à la place de l'adresse brute. */
export function filAriane(etapes: { nom: string; chemin: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: etapes.map((etape, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: etape.nom,
      item: urlCanonique(etape.chemin),
    })),
  };
}

/** Premier visuel exploitable d'un bien : photo en priorité. */
export function premierePhoto(medias: { type: string; secureUrl: string }[] | undefined): string | null {
  return medias?.find((media) => media.type === 'photo')?.secureUrl ?? null;
}

function offre(prix: number, chemin: string): Record<string, unknown> {
  return {
    '@type': 'Offer',
    price: prix,
    priceCurrency: 'XOF',
    availability: 'https://schema.org/InStock',
    url: urlCanonique(chemin),
    seller: { '@type': 'RealEstateAgent', name: 'MTM Immobilier', url: SITE_URL },
  };
}

/** Fiche d'un bien à vendre, avec son prix quand il est public. */
export function donneesTerrain(terrain: Terrain, titre: string, description: string, image: string | null): Record<string, unknown>[] {
  const chemin = `/terrains/${terrain.id}`;
  const vendu = terrain.statutCommercial === 'Vendu';
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: titre,
      description,
      sku: terrain.referenceInterne,
      ...(image ? { image: [image] } : {}),
      brand: { '@type': 'Brand', name: 'MTM Immobilier' },
      url: urlCanonique(chemin),
      ...(terrain.prixPublic && !vendu ? { offers: offre(terrain.prixPublic, chemin) } : {}),
    },
    filAriane([
      { nom: 'Accueil', chemin: '/' },
      { nom: 'Biens à vendre', chemin: '/terrains' },
      { nom: titre, chemin },
    ]),
  ];
}

/** Annonce de location : loyer mensuel ou prix de la nuit. */
export function donneesLocation(location: Location, titre: string, description: string, image: string | null): Record<string, unknown>[] {
  const chemin = `/locations/${location.id}`;
  const prix = location.modeLocation === 'courte_duree' ? location.prixNuit : location.loyerMensuel;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: titre,
      description,
      sku: location.referenceInterne,
      ...(image ? { image: [image] } : {}),
      brand: { '@type': 'Brand', name: 'MTM Immobilier' },
      url: urlCanonique(chemin),
      ...(prix ? { offers: offre(prix, chemin) } : {}),
    },
    filAriane([
      { nom: 'Accueil', chemin: '/' },
      { nom: 'Locations', chemin: '/locations' },
      { nom: titre, chemin },
    ]),
  ];
}

/** Réalisation ou projet à venir : fil d'Ariane. */
export function donneesVitrine(item: ShowcaseItem, chemin: string, listeNom: string, listeChemin: string): Record<string, unknown> {
  return filAriane([
    { nom: 'Accueil', chemin: '/' },
    { nom: listeNom, chemin: listeChemin },
    { nom: item.title, chemin },
  ]);
}
