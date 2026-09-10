import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { Terrain } from '../../types/terrain';
import { formatMoney, formatSuperficie } from '../../utils/format';
import { ROUTES } from '../../routes';

export function TerrainCard({ terrain }: { terrain: Terrain }) {
  const cover = terrain.medias.find((media) => media.type === 'photo') ?? terrain.medias[0];
  const location = [terrain.commune, terrain.region].filter(Boolean).join(', ');

  return (
    <Link
      to={ROUTES.terrainDetail(terrain.id)}
      className="group flex flex-col overflow-hidden rounded-lg border border-mtm-border bg-mtm-surface shadow-card transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-mtm-border">
        {cover ? (
          <img
            src={cover.secureUrl}
            alt={terrain.nom}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-mtm-muted">
            Photo à venir
          </div>
        )}
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
