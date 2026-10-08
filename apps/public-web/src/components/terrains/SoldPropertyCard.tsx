import { Link } from 'react-router-dom';
import { CheckCircle2, MapPin } from 'lucide-react';
import type { Terrain } from '../../types/terrain';
import { ROUTES } from '../../routes';
import { typeBienLabel } from '../../utils/bienLabels';
import { venduLabel } from '../../utils/venteLabels';
import { MediaImage } from '../ui/MediaImage';
import { SoldBadge } from './SoldBadge';
import { StatutJuridiqueChip } from './StatutJuridiqueChip';

/**
 * Carte d'un bien vendu, affiché comme référence : la photo légèrement
 * estompée, le badge rouge « Vendu », le lieu et le mois de la vente. Jamais de
 * prix : il révélerait la transaction d'un client.
 */
export function SoldPropertyCard({ terrain }: { terrain: Terrain }) {
  const photos = terrain.medias.filter((media) => media.type === 'photo');
  const covers = (photos.length > 0 ? photos : terrain.medias).map((media) => media.secureUrl);
  const lieu = [terrain.commune, terrain.region].filter(Boolean).join(', ');

  return (
    <Link
      to={ROUTES.terrainDetail(terrain.id)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-mtm-border/70 bg-mtm-surface shadow-card transition-all duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary lg:rounded-lg lg:border-mtm-border lg:hover:-translate-y-0.5 lg:hover:shadow-card-hover"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-mtm-border">
        <MediaImage
          src={covers}
          alt={terrain.nom}
          sizes="(min-width: 1024px) 30vw, 240px"
          className="h-full w-full object-cover saturate-50 transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" aria-hidden="true" />
        <SoldBadge className="absolute left-2.5 top-2.5" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">{typeBienLabel(terrain.typeBien)}</p>
        <h3 className="line-clamp-1 text-[14px] font-bold text-mtm-text">{terrain.nom}</h3>
        <StatutJuridiqueChip statut={terrain.statutJuridique} className="self-start" />
        {lieu && (
          <p className="flex items-center gap-1 text-xs text-mtm-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{lieu}</span>
          </p>
        )}
        <p className="mt-auto flex items-center gap-1 pt-1 text-xs font-semibold text-mtm-accent">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          {venduLabel(terrain.venduLe)}
        </p>
      </div>
    </Link>
  );
}
