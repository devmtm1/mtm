import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useTerrainsCatalog } from '../../hooks/useTerrainsCatalog';
import { SoldPropertyCard } from '../terrains/SoldPropertyCard';
import { SectionHeading } from '../ui/SectionHeading';
import { Carousel } from '../ui/Carousel';
import { ROUTES } from '../../routes';

/**
 * « Nos références vendues » : de quoi rassurer un visiteur sur ce que MTM
 * conclut vraiment. N'apparaît que si MTM affiche au moins un bien vendu ; les
 * prix ne sont jamais montrés.
 */
export function SoldReferencesSection() {
  const filters = useMemo(() => ({ statut: 'vendu' as const, pageSize: 6 }), []);
  const { data } = useTerrainsCatalog(filters);
  const items = data?.items ?? [];

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-16" aria-labelledby="references-vendues">
      <div className="flex items-end justify-between gap-4">
        <div id="references-vendues">
          <SectionHeading app eyebrow="Ils nous ont fait confiance" title="Nos références vendues" description="Des biens vendus par MTM : la preuve par les résultats." />
        </div>
        <Link
          to={`${ROUTES.catalog}?statut=vendu`}
          className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-mtm-primary active:opacity-70 lg:rounded-md lg:border lg:border-mtm-primary lg:bg-white lg:px-5 lg:py-2.5 lg:text-sm lg:hover:bg-mtm-primary-subtle"
        >
          Voir tout
          <ChevronRight className="h-4 w-4 lg:hidden" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-3 lg:mt-8">
        <Carousel
          ariaLabel="Nos références vendues"
          itemClassName="w-[62%] max-w-[15rem] sm:w-[40%] lg:w-auto lg:max-w-none"
          lgClassName="lg:grid lg:grid-cols-3 lg:gap-6"
          dotsOnly
        >
          {items.map((terrain) => (
            <SoldPropertyCard key={terrain.id} terrain={terrain} />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
