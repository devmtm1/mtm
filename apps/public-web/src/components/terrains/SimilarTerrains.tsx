import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Terrain } from '../../types/terrain';
import { useTerrainsCatalog } from '../../hooks/useTerrainsCatalog';
import { ROUTES } from '../../routes';
import { AppPropertyCard } from '../mobile/AppPropertyCard';
import { terrainCard } from '../mobile/recent-properties';

/**
 * « Autres biens près de là » : une rangée à faire défiler sous la fiche, sur
 * mobile. Mêmes cartes que l'accueil. Les biens viennent du catalogue, de la
 * même commune (à défaut, de la même région) ; la rangée n'apparaît que s'il y
 * en a au moins un autre à montrer.
 */
export function SimilarTerrains({ terrain }: { terrain: Terrain }) {
  const lieu = terrain.commune ?? terrain.region;
  const filters = useMemo(
    () => (terrain.commune ? { commune: terrain.commune, pageSize: 7 } : terrain.region ? { region: terrain.region, pageSize: 7 } : { pageSize: 7 }),
    [terrain.commune, terrain.region],
  );
  const { data } = useTerrainsCatalog(filters);
  const autres = (data?.items ?? []).filter((item) => item.id !== terrain.id).slice(0, 6);

  if (autres.length === 0) return null;

  return (
    <section aria-labelledby="similaires-titre" className="mt-8 lg:hidden">
      <div className="flex items-center justify-between">
        <h2 id="similaires-titre" className="font-display text-lg font-bold text-mtm-text">
          {lieu ? `Autres biens à ${lieu}` : 'Autres biens'}
        </h2>
        <Link to={ROUTES.catalog} className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-mtm-primary active:opacity-70">
          Voir tout
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <ul className="-mx-4 mt-3 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
        {autres.map((item) => (
          <li key={item.id} className="w-[62%] max-w-[15rem] shrink-0 snap-start">
            <AppPropertyCard card={terrainCard(item)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
