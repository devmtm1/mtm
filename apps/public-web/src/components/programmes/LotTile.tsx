import { Link } from 'react-router-dom';
import { LayoutGrid, Maximize2 } from 'lucide-react';
import type { LotPublic } from '../../api/programmes';
import { ROUTES } from '../../routes';
import { formatMoney, formatSuperficie } from '../../utils/format';
import { STATUT_LOT } from '../../utils/programmes';
import { MediaImage } from '../ui/MediaImage';

/** L'image du programme que prête une tuile qui n'a pas de photo à elle : le plan de masse, à défaut une photo. */
export interface VisuelLot {
  src: string;
  legende: string;
}

interface LotTileProps {
  lot: LotPublic;
  /** Image de remplacement quand le lot n'a pas sa propre photo. */
  visuel?: VisuelLot | null;
  /** Une tuile de la grille a une photo : toutes gardent alors la même hauteur, même sans image (fond à la charte). */
  avecPhoto?: boolean;
}

/**
 * Un lot en tuile : sa photo (ou, à défaut, le plan de masse du lotissement), son numéro et sa catégorie posés dessus,
 * sa superficie, puis son prix dans un bouton bleu nuit pleine largeur. Toutes les tuiles ont la même taille : on balaie
 * le lotissement d'un coup d'œil et on touche le lot voulu. Une tuile libre mène à la fiche du lot ; une tuile réservée
 * ou vendue est grisée, sans prix, et ne mène nulle part.
 */
export function LotTile({ lot, visuel = null, avecPhoto = false }: LotTileProps) {
  const libre = lot.statut === 'Disponible';
  const emprunte = !lot.photo && visuel !== null;
  const bandeau = Boolean(lot.photo) || visuel !== null || avecPhoto;

  const contenu = (
    <>
      {bandeau && (
        <span className="relative block aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-mtm-primary to-mtm-primary-dark">
          {(lot.photo || visuel) && (
            <MediaImage
              src={[lot.photo, visuel?.src]}
              alt=""
              aria-hidden
              compact
              sizes="(min-width: 640px) 240px, 45vw"
              className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${libre ? '' : 'opacity-70 grayscale'}`}
            />
          )}
          {!lot.photo && !visuel && (
            <span aria-hidden="true" className="flex h-full w-full items-center justify-center text-white/60">
              <LayoutGrid className="h-9 w-9" />
            </span>
          )}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
          <span className="absolute left-2.5 top-2.5 rounded-lg bg-white px-2.5 py-1 font-display text-base font-bold leading-none text-mtm-text shadow-card">
            {lot.numeroLot}
          </span>
          {lot.categorieLot && (
            <span className="absolute right-2.5 top-2.5 max-w-[55%] truncate rounded-full bg-mtm-primary-dark/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-card">
              {lot.categorieLot.nom}
            </span>
          )}
          {emprunte && (
            <span className="absolute bottom-2 left-2.5 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
              {visuel.legende}
            </span>
          )}
        </span>
      )}
      <span className="flex flex-1 flex-col p-3.5">
        {!bandeau && (
          <span className="flex items-start justify-between gap-2">
            <span className={`font-display text-xl font-bold leading-none ${libre ? 'text-mtm-text' : 'text-mtm-muted'}`}>{lot.numeroLot}</span>
            {lot.categorieLot && (
              <span className="truncate rounded-full bg-mtm-primary-subtle px-2.5 py-1 text-xs font-bold text-mtm-primary">{lot.categorieLot.nom}</span>
            )}
          </span>
        )}
        <span className={`inline-flex items-center gap-1.5 text-sm text-mtm-muted ${bandeau ? '' : 'mt-2.5'}`}>
          <Maximize2 className="h-3.5 w-3.5 text-mtm-primary" aria-hidden="true" />
          {formatSuperficie(lot.superficie, lot.uniteSuperficie)}
        </span>
        {/* Un espace extensible : le bouton se cale toujours en bas, aligné d'une tuile à l'autre. */}
        <span aria-hidden="true" className="min-h-3 flex-1" />
        {libre ? (
          <span className="mt-1 flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl bg-mtm-primary-dark px-2 text-center text-sm font-bold tabular-nums text-white transition-colors group-hover:bg-mtm-primary">
            {formatMoney(lot.prixPublic)}
          </span>
        ) : (
          <span className={`mt-1 flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-bold ${STATUT_LOT[lot.statut].pastille}`}>
            {STATUT_LOT[lot.statut].libelle}
          </span>
        )}
      </span>
    </>
  );

  return (
    <li className="flex">
      {libre ? (
        <Link
          to={ROUTES.terrainDetail(lot.id)}
          aria-label={`Lot ${lot.numeroLot}, ${formatMoney(lot.prixPublic)}`}
          className="group flex w-full flex-col overflow-hidden rounded-2xl border border-mtm-border bg-mtm-surface shadow-card transition-all hover:-translate-y-0.5 hover:border-mtm-primary-light hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary"
        >
          {contenu}
        </Link>
      ) : (
        <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-mtm-border/70 bg-mtm-bg opacity-90">{contenu}</div>
      )}
    </li>
  );
}
