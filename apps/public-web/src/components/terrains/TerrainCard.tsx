import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { Terrain } from '../../types/terrain';
import { formatMoney, formatSuperficie } from '../../utils/format';
import { Badge } from '../ui/Badge';
import { MediaImage } from '../ui/MediaImage';
import { ROUTES } from '../../routes';

interface TerrainCardProps {
  terrain: Terrain;
  /**
   * Mise en page resserrée sous 640 px, pour une grille à deux colonnes sur
   * téléphone (~170 px par carte) : typographie réduite, prix et superficie
   * empilés, un seul badge. À partir de `sm`, la carte est identique à la
   * version normale.
   */
  compact?: boolean;
}

export function TerrainCard({ terrain, compact = false }: TerrainCardProps) {
  // Toutes les photos servent de candidates : si la première URL est morte
  // (asset supprimé du stockage), la carte affiche la suivante plutôt qu'un
  // visuel cassé.
  const photos = terrain.medias.filter((media) => media.type === 'photo');
  const covers = (photos.length > 0 ? photos : terrain.medias).map((media) => media.secureUrl);
  const location = [terrain.commune, terrain.region].filter(Boolean).join(', ');

  return (
    <Link
      to={ROUTES.terrainDetail(terrain.id)}
      className="group flex flex-col overflow-hidden rounded-lg border border-mtm-border bg-mtm-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-mtm-border">
        <MediaImage
          src={covers}
          alt={terrain.nom}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {terrain.misEnAvant && (
          <span
            className={`absolute rounded-full bg-mtm-primary font-semibold text-white shadow-card ${
              compact
                ? 'left-2 top-2 px-2 py-0.5 text-[11px] sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs'
                : 'left-3 top-3 px-2.5 py-1 text-xs'
            }`}
          >
            Mis en avant
          </span>
        )}
      </div>

      <div className={`flex flex-1 flex-col ${compact ? 'gap-1.5 p-3 sm:gap-2 sm:p-4' : 'gap-2 p-4'}`}>
        <span className="text-xs font-semibold uppercase tracking-wide text-mtm-muted">
          {terrain.referenceInterne}
        </span>
        {/* Hauteur réservée pour deux lignes : toutes les cartes d'une même
            ligne gardent la même hauteur quelle que soit la longueur du nom. */}
        <h3
          className={`line-clamp-2 font-display font-bold text-mtm-text ${
            compact ? 'min-h-[2.5rem] text-sm sm:min-h-[3rem] sm:text-base' : 'min-h-[3rem] text-base'
          }`}
        >
          {terrain.nom}
        </h3>
        {location && (
          <p
            className={`flex items-center gap-1.5 text-mtm-muted ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}
          >
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{location}</span>
          </p>
        )}
        {/* Statut juridique : critère de confiance n°1 pour un acheteur
            foncier, exigé sur la carte par les sections 6 et 7 du CDC. Le
            niveau de vérification est masqué en compact (visible sur la fiche). */}
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="primary">{terrain.statutJuridique}</Badge>
          <Badge tone="success" className={compact ? 'hidden sm:inline-flex' : undefined}>
            {terrain.niveauVerification}
          </Badge>
        </div>
        <div
          className={`mt-auto pt-2 ${
            compact
              ? 'flex flex-col-reverse gap-0.5 sm:flex-row sm:items-center sm:justify-between'
              : 'flex items-center justify-between'
          }`}
        >
          <span className={`text-mtm-muted ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
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
