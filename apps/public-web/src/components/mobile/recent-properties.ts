import type { Terrain } from '../../types/terrain';
import type { Location } from '../../types/location';
import { ROUTES } from '../../routes';
import { formatMoney, formatSuperficie } from '../../utils/format';
import { typeBienLabel } from '../../utils/bienLabels';
import { formatLoyerMontant, locationPlace, locationTitle } from '../../utils/locationFormat';
import type { AppPropertyCardData, AppPropertyFact } from './AppPropertyCard';

/**
 * Les repères d'un bien, ceux qu'il renseigne : chambres, salles d'eau, surface.
 * Une information absente n'est pas montrée — jamais de « — » ni de « 0 ch. ».
 */
function facts(source: {
  nombreChambres: number | null;
  nombreSallesEau: number | null;
  surface: number | null;
  unite: string | null;
}): AppPropertyFact[] {
  const repères: AppPropertyFact[] = [];
  if (source.nombreChambres) repères.push({ icon: 'chambres', label: `${source.nombreChambres} ch.` });
  if (source.nombreSallesEau) repères.push({ icon: 'sallesEau', label: `${source.nombreSallesEau} sdb.` });
  if (source.surface) repères.push({ icon: 'surface', label: formatSuperficie(source.surface, source.unite) });
  return repères;
}

function photosOf(medias: { type: string; secureUrl: string }[]): string[] {
  const photos = medias.filter((media) => media.type === 'photo');
  return (photos.length > 0 ? photos : medias).map((media) => media.secureUrl);
}

export function terrainCard(terrain: Terrain): AppPropertyCardData {
  return {
    kind: 'terrain',
    id: terrain.id,
    to: ROUTES.terrainDetail(terrain.id),
    title: terrain.nom,
    images: photosOf(terrain.medias),
    price: formatMoney(terrain.prixPublic),
    place: [terrain.commune, terrain.region].filter(Boolean).join(', '),
    featured: terrain.misEnAvant ? 'Mis en avant' : undefined,
    statutJuridique: terrain.statutJuridique || undefined,
    facts: facts({
      nombreChambres: terrain.nombreChambres,
      nombreSallesEau: terrain.nombreSallesEau,
      // Un bien bâti se lit à sa surface habitable, une parcelle à sa superficie.
      surface: terrain.surfaceHabitable ?? terrain.superficie,
      unite: terrain.uniteSuperficie,
    }),
  };
}

export function locationCard(location: Location): AppPropertyCardData {
  return {
    kind: 'location',
    id: location.id,
    to: ROUTES.locationDetail(location.id),
    title: locationTitle(location, typeBienLabel(location.type)),
    images: photosOf(location.medias),
    badge: 'Location',
    badgeTone: 'success',
    price: formatLoyerMontant(location.loyerMensuel),
    priceSuffix: location.loyerMensuel === null ? undefined : '/ mois',
    place: locationPlace(location),
    featured: location.misEnAvant ? 'À la une' : undefined,
    facts: facts({
      nombreChambres: location.nombreChambres,
      nombreSallesEau: location.nombreSallesEau,
      surface: location.superficie,
      unite: 'm²',
    }),
  };
}

interface Dated {
  card: AppPropertyCardData;
  /** Date de mise en ligne : la plus récente passe devant, ventes et locations mêlées. */
  at: number;
}

/**
 * « Nos biens récents » : les dernières ventes et les dernières locations
 * publiées, de la plus récente à la plus ancienne. Une date illisible place le
 * bien en fin de rangée plutôt que de le faire disparaître.
 */
export function mergeRecent(terrains: Terrain[], locations: Location[], limit = 8): AppPropertyCardData[] {
  const time = (value: string | null | undefined): number => {
    const parsed = value ? Date.parse(value) : NaN;
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const all: Dated[] = [
    ...terrains.map((terrain) => ({ card: terrainCard(terrain), at: time(terrain.createdAt) })),
    ...locations.map((location) => ({ card: locationCard(location), at: time(location.publieLe) })),
  ];
  return all
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
    .map((entry) => entry.card);
}
