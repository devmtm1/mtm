import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { fetchProgramme } from '../../api/programmes';
import { useAsyncData } from '../../hooks/useAsyncData';
import { ROUTES } from '../../routes';
import { disponibilites, visuelDesLotsDe } from '../../utils/programmes';
import { LotTile } from './LotTile';

interface AutresLotsDuProgrammeProps {
  programmeId: string;
  /** Le lot que le visiteur regarde : il n'est pas reproposé. */
  lotId: string;
}

/**
 * « Autres lots du lotissement » sous la fiche d'un lot : un acheteur compare avant de choisir, et un lot déjà
 * pris ne doit pas le laisser sans issue. N'apparaît que s'il reste un autre lot à vendre.
 */
export function AutresLotsDuProgramme({ programmeId, lotId }: AutresLotsDuProgrammeProps) {
  const { data: programme } = useAsyncData(() => fetchProgramme(programmeId), [programmeId]);

  const autres = (programme?.lots ?? []).filter((l) => l.statut === 'Disponible' && l.id !== lotId).slice(0, 8);
  if (!programme || autres.length === 0) return null;

  const visuel = visuelDesLotsDe(programme);

  return (
    <section aria-labelledby="autres-lots-titre" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="autres-lots-titre" className="font-display text-xl font-bold text-mtm-text sm:text-2xl">
            Autres lots du lotissement {programme.nom}
          </h2>
          <p className="mt-0.5 text-sm text-mtm-muted">{disponibilites(programme)}</p>
        </div>
        <Link
          to={ROUTES.programme(programme.id)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-mtm-primary hover:underline"
        >
          Voir tout le lotissement
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {autres.map((lot) => (
          <LotTile key={lot.id} lot={lot} visuel={visuel} avecPhoto={visuel !== null || autres.some((l) => l.photo)} />
        ))}
      </ul>
    </section>
  );
}
