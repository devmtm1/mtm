import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Location } from '../../types/location';
import { useLocationsCatalog } from '../../hooks/useLocations';
import { ROUTES } from '../../routes';
import { AppPropertyCard } from '../mobile/AppPropertyCard';
import { locationCard } from '../mobile/recent-properties';
import { SeeAllLink } from '../ui/SeeAllLink';
import { LocationCard } from './LocationCard';

/**
 * « Autres locations à… » : sous la fiche d'une annonce, les annonces de la même commune (à défaut, de la même région),
 * pour qu'un visiteur qui hésite trouve un autre logement sans repasser par la liste. Sur mobile, une rangée à faire
 * défiler ; sur ordinateur, une grille de trois cartes. La section n'apparaît que s'il y a au moins une autre annonce.
 */
export function SimilarLocations({ location }: { location: Location }) {
  // Région d'abord (assez large pour qu'il y ait toujours quelque chose à montrer), puis les annonces de la même commune
  // en tête : un locataire compare d'abord autour de lui.
  const filters = useMemo(() => (location.region ? { region: location.region, pageSize: 12 } : location.commune ? { commune: location.commune, pageSize: 12 } : { pageSize: 12 }), [location.commune, location.region]);
  const { data } = useLocationsCatalog(filters);
  const autres = (data?.items ?? [])
    .filter((item) => item.id !== location.id)
    .sort((a, b) => Number(b.commune === location.commune) - Number(a.commune === location.commune))
    .slice(0, 6);

  if (autres.length === 0) return null;
  const sameCommune = autres.every((item) => item.commune === location.commune);
  const lieu = sameCommune ? location.commune : location.region;
  const titre = lieu ? `Autres locations ${sameCommune ? 'à' : 'en région de'} ${lieu}` : 'Autres locations';

  return (
    <>
      <section aria-labelledby="similaires-locations-titre" className="mt-8 lg:hidden">
        <div className="flex items-center justify-between">
          <h2 id="similaires-locations-titre" className="font-display text-lg font-bold text-mtm-text">
            {titre}
          </h2>
          <Link to={ROUTES.locations} className="inline-flex min-h-11 items-center gap-0.5 text-[13px] font-semibold text-mtm-primary active:opacity-70">
            Voir tout
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <ul className="-mx-4 mt-3 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
          {autres.map((item) => (
            <li key={item.id} className="w-[62%] max-w-[15rem] shrink-0 snap-start">
              <AppPropertyCard card={locationCard(item)} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="similaires-locations-titre-bureau" className="mt-14 hidden lg:block">
        <div className="flex items-end justify-between gap-4">
          <h2 id="similaires-locations-titre-bureau" className="font-display text-2xl font-bold text-mtm-text">
            {titre}
          </h2>
          <SeeAllLink to={ROUTES.locations} />
        </div>
        <ul className="mt-6 grid grid-cols-3 gap-6">
          {autres.slice(0, 3).map((item) => (
            <li key={item.id}>
              <LocationCard location={item} compact />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
