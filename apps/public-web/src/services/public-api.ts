import type { PublicTerrainResponse, Terrain } from '../domain/terrains/types';

export const publicApiUrl =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

function mapPublicTerrain(terrain: PublicTerrainResponse): Terrain {
  const price = Number(terrain.prixPublic);
  const surface = Number(terrain.superficie);
  const primaryMedia = terrain.medias?.find(
    (media) => media.type !== 'video',
  )?.secureUrl;

  return {
    id: terrain.referenceInterne,
    name: terrain.nom,
    location:
      [terrain.commune, terrain.region].filter(Boolean).join(', ') || 'Sénégal',
    region: terrain.region ?? '',
    size: Number.isFinite(surface)
      ? `${surface.toLocaleString('fr-FR')} ${terrain.uniteSuperficie ?? 'm²'}`
      : 'Superficie sur demande',
    price: Number.isFinite(price)
      ? ` ${price.toLocaleString('fr-FR')} FCFA`
      : 'Prix sur demande',
    status: terrain.statutJuridique,
    legalStatus: terrain.statutJuridique,
    tag: 'Disponible',
    image:
      primaryMedia ??
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=85',
    detail: terrain.localisationDetail,
    latitude: terrain.latitude,
    longitude: terrain.longitude,
    access: terrain.accesRoutier,
    waterAvailable: terrain.eauDisponible,
    electricityAvailable: terrain.electriciteDisponible,
    vocation: terrain.vocation,
    media: terrain.medias,
    documents: terrain.documents,
    pointsInteret: terrain.pointsInteret,
    dimensions: terrain.dimensions,
    superficieRaw: Number.isFinite(surface) ? surface : null,
    prixPublicRaw: Number.isFinite(price) ? price : null,
    misEnAvant: terrain.misEnAvant ?? false,
  };
}

export async function getPublicTerrains(): Promise<Terrain[]> {
  const response = await fetch(
    `${publicApiUrl}/terrains/public?pageSize=200&sortBy=createdAt&sortOrder=desc`,
  );
  if (!response.ok) throw new Error('Unable to load public terrains');
  const data = (await response.json()) as { items?: PublicTerrainResponse[] };
  return data.items?.map(mapPublicTerrain) ?? [];
}

export async function getContentBlocks(): Promise<Record<string, string>> {
  const response = await fetch(`${publicApiUrl}/content`);
  if (!response.ok) throw new Error('Unable to load public content');
  const data = (await response.json()) as Array<{
    key: string;
    content: string;
  }>;
  return Object.fromEntries(data.map((block) => [block.key, block.content]));
}

export async function sendContact(
  payload: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(`${publicApiUrl}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Unable to send contact request');
}
