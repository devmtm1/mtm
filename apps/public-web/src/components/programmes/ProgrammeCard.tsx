import { Link } from 'react-router-dom';
import { LayoutGrid, MapPin, Ruler } from 'lucide-react';
import type { ProgrammePublic } from '../../api/programmes';
import { ROUTES } from '../../routes';
import { disponibilites, fourchettePrix, fourchetteSuperficie, tauxEngage } from '../../utils/programmes';
import { formatMoney } from '../../utils/format';
import { MediaImage } from '../ui/MediaImage';
import { StatutJuridiqueChip } from '../terrains/StatutJuridiqueChip';

interface ProgrammeCardProps {
  programme: ProgrammePublic;
  /** Mise en page resserrée sous 640 px, pour la grille à deux colonnes du catalogue sur téléphone. */
  compact?: boolean;
}

/**
 * La carte d'un lotissement : même gabarit que celle d'un bien, pour qu'elles se mêlent dans le catalogue sans
 * rupture. Se distingue par la pastille « Lotissement » et la barre d'avancement des ventes, qui dit d'un coup
 * d'œil combien de lots restent.
 */
export function ProgrammeCard({ programme: p, compact = false }: ProgrammeCardProps) {
  const lieu = [p.commune, p.region].filter(Boolean).join(', ');
  const surface = fourchetteSuperficie(p.superficieMin, p.superficieMax, p.uniteSuperficie);
  const engage = tauxEngage(p);
  const dernier = p.lotsDisponibles === 1;

  return (
    <Link
      to={ROUTES.programme(p.id)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-mtm-border/70 bg-mtm-surface shadow-card transition-all duration-150 active:scale-[0.98] lg:rounded-lg lg:border-mtm-border lg:duration-200 lg:hover:-translate-y-0.5 lg:hover:border-mtm-primary-light lg:hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-mtm-primary-subtle">
        {p.couverture ? (
          <MediaImage
            src={p.couverture}
            alt={p.nom}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          /* Sans photo, un fond à la charte plutôt qu'un visuel vide : le programme reste reconnaissable. */
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-mtm-primary to-mtm-primary-dark text-white/80"
          >
            <LayoutGrid className={compact ? 'hidden h-12 w-12 sm:block' : 'h-12 w-12'} />
          </div>
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/65 to-transparent"
        />
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full bg-mtm-primary font-semibold text-white shadow-card ${
              compact ? 'px-2 py-0.5 text-[11px] sm:px-2.5 sm:text-xs' : 'px-2.5 py-0.5 text-xs'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            Lotissement
          </span>
          {dernier && (
            <span className="rounded-full bg-mtm-accent px-2.5 py-0.5 text-xs font-semibold text-white shadow-card">
              Dernier lot
            </span>
          )}
        </div>
        <p className="absolute bottom-2.5 left-3 right-3 text-white">
          <span className={`block text-[11px] font-semibold uppercase tracking-wide text-white/80 ${compact ? 'sm:text-xs' : 'text-xs'}`}>
            À partir de
          </span>
          <span className={`font-display font-bold drop-shadow ${compact ? 'text-base sm:text-xl' : 'text-xl'}`}>
            {p.prixMin === null ? fourchettePrix(null, null) : formatMoney(p.prixMin)}
          </span>
        </p>
      </div>

      <div className={`flex flex-1 flex-col ${compact ? 'gap-1 p-2.5 sm:gap-1.5 sm:p-3.5' : 'gap-1.5 p-3.5'}`}>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
          <span className={`text-mtm-primary ${compact ? 'hidden sm:inline' : ''}`}>Lotissement</span>
          <span aria-hidden="true" className={`text-mtm-border ${compact ? 'hidden sm:inline' : ''}`}>·</span>
          <span className="whitespace-nowrap text-mtm-muted">{p.reference}</span>
        </span>
        <h3 className={`line-clamp-2 font-display font-bold leading-snug text-mtm-text ${compact ? 'text-sm sm:text-[15px]' : 'text-[15px]'}`}>
          {p.nom}
        </h3>
        {lieu && (
          <p className={`flex items-center gap-1 text-mtm-muted ${compact ? 'text-xs' : 'text-xs sm:text-[13px]'}`}>
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{lieu}</span>
          </p>
        )}
        <StatutJuridiqueChip statut={p.statutJuridique} className="mt-0.5 self-start" />

        <div className="mt-auto border-t border-mtm-border pt-2">
          {/* Avancement des ventes : la part déjà prise, en couleur ; le reste, ce que le visiteur peut encore acheter. */}
          <div
            role="img"
            aria-label={`${engage} % des lots déjà réservés ou vendus`}
            className="h-1.5 w-full overflow-hidden rounded-full bg-mtm-success/20"
          >
            <div className="h-full rounded-full bg-mtm-primary" style={{ width: `${engage}%` }} />
          </div>
          <div className={`mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 ${compact ? 'text-xs' : 'text-xs sm:text-[13px]'}`}>
            <span className="font-semibold text-mtm-success">{disponibilites(p)}</span>
            {surface && (
              <span className="inline-flex items-center gap-1 text-mtm-muted">
                <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
                {surface}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
