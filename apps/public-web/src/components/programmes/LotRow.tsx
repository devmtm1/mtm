import { Link } from 'react-router-dom';
import { CalendarCheck, ChevronRight } from 'lucide-react';
import type { LotPublic } from '../../api/programmes';
import { ROUTES } from '../../routes';
import { formatMoney, formatSuperficie } from '../../utils/format';
import { conditionsDuLot, STATUT_LOT } from '../../utils/programmes';

interface LotRowProps {
  lot: LotPublic;
  onVisite: (lot: LotPublic) => void;
}

/**
 * Un lot, sur une ligne : son numéro, ce qui le décrit, son prix, puis une seule action. Une liste de lignes
 * alignées se parcourt bien plus vite qu'une grille de grosses cartes quand le lotissement compte vingt lots.
 * Un lot réservé ou vendu reste dans la liste, grisé, sans prix ni action.
 */
export function LotRow({ lot, onVisite }: LotRowProps) {
  const libre = lot.statut === 'Disponible';
  const conditions = libre ? conditionsDuLot(lot) : '';
  const details = [lot.categorieLot?.nom, formatSuperficie(lot.superficie, lot.uniteSuperficie)].filter(Boolean).join(' · ');

  return (
    <li
      className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:px-5 ${
        libre ? 'bg-mtm-surface' : 'bg-mtm-bg'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-12 w-14 items-center justify-center rounded-xl font-display text-sm font-bold ${
          libre ? 'bg-mtm-primary-subtle text-mtm-primary' : 'bg-mtm-border text-mtm-muted'
        }`}
      >
        {lot.numeroLot}
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <p className={`font-display text-base font-bold ${libre ? 'text-mtm-text' : 'text-mtm-muted'}`}>
            {libre ? (
              <Link to={ROUTES.terrainDetail(lot.id)} className="hover:text-mtm-primary hover:underline">
                Lot {lot.numeroLot}
              </Link>
            ) : (
              <>Lot {lot.numeroLot}</>
            )}
          </p>
          {!libre && (
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUT_LOT[lot.statut].pastille}`}>
              {STATUT_LOT[lot.statut].libelle}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-mtm-muted">{details}</p>
        {conditions && <p className="mt-0.5 hidden text-xs text-mtm-muted sm:block">{conditions}</p>}
      </div>

      <p
        className={`whitespace-nowrap text-right font-display text-base font-bold tabular-nums sm:text-lg ${
          libre ? 'text-mtm-primary' : 'text-mtm-muted'
        }`}
      >
        {libre ? formatMoney(lot.prixPublic) : '—'}
      </p>

      {libre ? (
        <div className="col-span-3 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
          <Link
            to={ROUTES.terrainDetail(lot.id)}
            className="inline-flex items-center gap-0.5 text-sm font-semibold text-mtm-primary hover:underline sm:hidden"
          >
            Voir le lot
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => onVisite(lot)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-mtm-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-mtm-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary"
          >
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            Visiter
          </button>
        </div>
      ) : (
        <span className="hidden sm:block" aria-hidden="true" />
      )}
    </li>
  );
}
