import { Link } from 'react-router-dom';
import { Maximize2 } from 'lucide-react';
import type { LotPublic } from '../../api/programmes';
import { ROUTES } from '../../routes';
import { formatMoney, formatSuperficie } from '../../utils/format';
import { STATUT_LOT } from '../../utils/programmes';

/**
 * Un lot en tuile : son numéro, sa catégorie, sa superficie, et son prix dans un bouton bleu nuit pleine largeur.
 * Toutes les tuiles ont la même taille : on balaie le lotissement d'un coup d'œil et on touche le lot voulu. Une tuile
 * libre mène à la fiche du lot ; une tuile réservée ou vendue est grisée, sans prix, et ne mène nulle part.
 */
export function LotTile({ lot }: { lot: LotPublic }) {
  const libre = lot.statut === 'Disponible';
  const contenu = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className={`font-display text-xl font-bold leading-none ${libre ? 'text-mtm-text' : 'text-mtm-muted'}`}>{lot.numeroLot}</span>
        {lot.categorieLot && (
          <span className="truncate rounded-full bg-mtm-primary-subtle px-2.5 py-1 text-xs font-bold text-mtm-primary">{lot.categorieLot.nom}</span>
        )}
      </span>
      <span className="mt-2.5 inline-flex items-center gap-1.5 text-sm text-mtm-muted">
        <Maximize2 className="h-3.5 w-3.5 text-mtm-primary" aria-hidden="true" />
        {formatSuperficie(lot.superficie, lot.uniteSuperficie)}
      </span>
      {/* Un espace extensible : le bouton se cale toujours en bas, aligné d'une tuile à l'autre. */}
      <span aria-hidden="true" className="min-h-4 flex-1" />
      {libre ? (
        <span className="flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl bg-mtm-primary-dark px-2 text-center text-sm font-bold tabular-nums text-white transition-colors group-hover:bg-mtm-primary">
          {formatMoney(lot.prixPublic)}
        </span>
      ) : (
        <span className={`flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-bold ${STATUT_LOT[lot.statut].pastille}`}>
          {STATUT_LOT[lot.statut].libelle}
        </span>
      )}
    </>
  );

  return (
    <li className="flex">
      {libre ? (
        <Link
          to={ROUTES.terrainDetail(lot.id)}
          aria-label={`Lot ${lot.numeroLot}, ${formatMoney(lot.prixPublic)}`}
          className="group flex w-full flex-col rounded-2xl border border-mtm-border bg-mtm-surface p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-mtm-primary-light hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary"
        >
          {contenu}
        </Link>
      ) : (
        <div className="flex w-full flex-col rounded-2xl border border-mtm-border/70 bg-mtm-bg p-4 opacity-80">{contenu}</div>
      )}
    </li>
  );
}
