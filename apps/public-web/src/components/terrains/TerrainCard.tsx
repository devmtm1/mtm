import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { Terrain } from '../../types/terrain';
import { formatMoney, formatSuperficie } from '../../utils/format';
import { Badge } from '../ui/Badge';
import { MediaImage } from '../ui/MediaImage';
import { ROUTES } from '../../routes';

export function TerrainCard({ terrain }: { terrain: Terrain }) {
  // Toutes les photos servent de candidates : si la première URL est morte
  // (asset supprimé du stockage), la carte affiche la suivante plutôt qu'un
  // visuel cassé.
  const photos = terrain.medias.filter((media) => media.type === 'photo');
  const covers = (photos.length > 0 ? photos : terrain.medias).map((media) => media.secureUrl);
  const location = [terrain.commune, terrain.region].filter(Boolean).join(', ');

  return (
    <Link
      to={ROUTES.terrainDetail(terrain.id)}
      className="group flex flex-col overflow-hidden rounded-lg border border-mtm-border bg-mtm-surface shadow-card transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-mtm-border">
        <MediaImage
          src={covers}
          alt={terrain.nom}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {terrain.misEnAvant && (
          <span className="absolute left-3 top-3 rounded-full bg-mtm-primary px-2.5 py-1 text-xs font-semibold text-white shadow-card">
            Mis en avant
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-mtm-muted">
          {terrain.referenceInterne}
        </span>
        <h3 className="font-display text-base font-bold text-mtm-text">{terrain.nom}</h3>
        {location && (
          <p className="flex items-center gap-1.5 text-sm text-mtm-muted">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {location}
          </p>
        )}
        {/* Statut juridique : critère de confiance n°1 pour un acheteur
            foncier, exigé sur la carte par les sections 6 et 7 du CDC. */}
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="primary">{terrain.statutJuridique}</Badge>
          <Badge tone="success">{terrain.niveauVerification}</Badge>
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm text-mtm-muted">
            {formatSuperficie(terrain.superficie, terrain.uniteSuperficie)}
          </span>
          <span className="font-display text-base font-bold text-mtm-primary">
            {formatMoney(terrain.prixPublic)}
          </span>
        </div>
      </div>
    </Link>
  );
}
