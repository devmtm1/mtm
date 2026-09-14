import { Link } from 'react-router-dom';
import { MapPin, Ruler, ShieldCheck } from 'lucide-react';
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
   * empilés. À partir de `sm`, la carte est identique à la version normale.
   */
  compact?: boolean;
}

/**
 * Carte terrain : photo courte (16:10) avec les deux signaux de confiance
 * dessus (mise en avant, vérification), puis référence + statut juridique,
 * nom, localisation et un pied superficie / prix. Tout le reste est sur la
 * fiche.
 */
export function TerrainCard({ terrain, compact = false }: TerrainCardProps) {
  // Toutes les photos servent de candidates : si la première URL est morte
  // (asset supprimé du stockage), la carte affiche la suivante plutôt qu'un
  // visuel cassé.
  const photos = terrain.medias.filter((media) => media.type === 'photo');
  const covers = (photos.length > 0 ? photos : terrain.medias).map((media) => media.secureUrl);
  const location = [terrain.commune, terrain.region].filter(Boolean).join(', ');
  const verified = /v[ée]rifi[ée]/i.test(terrain.niveauVerification) && !/non/i.test(terrain.niveauVerification);

  return (
    <Link
      to={ROUTES.terrainDetail(terrain.id)}
      className="group flex flex-col overflow-hidden rounded-lg border border-mtm-border bg-mtm-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-mtm-primary-light hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-mtm-border">
        <MediaImage
          src={covers}
          alt={terrain.nom}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {terrain.misEnAvant && (
          <span
            className={`absolute left-2.5 top-2.5 rounded-full bg-mtm-accent font-semibold text-white shadow-card ${
              compact ? 'px-2 py-0.5 text-[11px] sm:px-2.5 sm:text-xs' : 'px-2.5 py-0.5 text-xs'
            }`}
          >
            Mis en avant
          </span>
        )}
        <span
          className={`absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 font-semibold shadow-card ${
            verified ? 'text-mtm-success' : 'text-mtm-muted'
          } ${compact ? 'px-2 py-0.5 text-[11px] sm:text-xs' : 'px-2.5 py-0.5 text-xs'}`}
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {terrain.niveauVerification}
        </span>
      </div>

      <div className={`flex flex-1 flex-col ${compact ? 'gap-1 p-2.5 sm:gap-1.5 sm:p-3.5' : 'gap-1.5 p-3.5'}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">{terrain.referenceInterne}</span>
          {/* Statut juridique : critère de confiance n°1 pour un acheteur
              foncier, exigé sur la carte par les sections 6 et 7 du CDC. */}
          <Badge tone="primary" className={compact ? 'hidden sm:inline-flex' : undefined}>
            {terrain.statutJuridique}
          </Badge>
        </div>
        <h3 className={`truncate font-display font-bold text-mtm-text ${compact ? 'text-sm sm:text-[15px]' : 'text-[15px]'}`}>
          {terrain.nom}
        </h3>
        {location && (
          <p className={`flex items-center gap-1 text-mtm-muted ${compact ? 'text-xs' : 'text-xs sm:text-[13px]'}`}>
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{location}</span>
          </p>
        )}
        <div
          className={`mt-auto border-t border-mtm-border pt-2 ${
            compact
              ? 'flex flex-col-reverse gap-0.5 sm:flex-row sm:items-center sm:justify-between'
              : 'flex items-center justify-between'
          }`}
        >
          <span className={`inline-flex items-center gap-1 text-mtm-muted ${compact ? 'text-xs' : 'text-xs sm:text-[13px]'}`}>
            <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
            {formatSuperficie(terrain.superficie, terrain.uniteSuperficie)}
          </span>
          <span className={`font-display font-bold text-mtm-primary ${compact ? 'text-sm sm:text-[15px]' : 'text-[15px]'}`}>
            {formatMoney(terrain.prixPublic)}
          </span>
        </div>
      </div>
    </Link>
  );
}
