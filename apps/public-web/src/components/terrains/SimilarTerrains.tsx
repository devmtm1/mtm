import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Terrain } from '../../types/terrain';
import { useTerrainsCatalog } from '../../hooks/useTerrainsCatalog';
import { ROUTES } from '../../routes';
import { AppPropertyCard } from '../mobile/AppPropertyCard';
import { terrainCard } from '../mobile/recent-properties';
import { SeeAllLink } from '../ui/SeeAllLink';
import { TerrainCard } from './TerrainCard';

/**
 * « Autres biens près de là » : sous la fiche, les biens de la même commune (à défaut, de la même région). Sur mobile,
 * une rangée à faire défiler avec les mêmes cartes que l'accueil ; sur ordinateur, une grille de trois cartes du
 * catalogue. La section n'apparaît que s'il y a au moins un autre bien à montrer.
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
  const titre = lieu ? `Autres biens à ${lieu}` : 'Autres biens';

  return (
    <>
      <section aria-labelledby="similaires-titre" className="mt-8 lg:hidden">
        <div className="flex items-center justify-between">
          <h2 id="similaires-titre" className="font-display text-lg font-bold text-mtm-text">
            {titre}
          </h2>
          <Link to={ROUTES.catalog} className="inline-flex min-h-11 items-center gap-0.5 text-[13px] font-semibold text-mtm-primary active:opacity-70">
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

      <section aria-labelledby="similaires-titre-bureau" className="mt-14 hidden lg:block">
        <div className="flex items-end justify-between gap-4">
          <h2 id="similaires-titre-bureau" className="font-display text-2xl font-bold text-mtm-text">
            {titre}
          </h2>
          <SeeAllLink to={ROUTES.catalog} />
        </div>
        <ul className="mt-6 grid grid-cols-3 gap-6">
          {autres.slice(0, 3).map((item) => (
            <li key={item.id}>
              <TerrainCard terrain={item} compact />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
