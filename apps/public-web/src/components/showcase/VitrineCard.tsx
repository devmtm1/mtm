import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { ShowcaseItem } from '../../types/showcase';
import { ROUTES } from '../../routes';
import { formatMonthYear } from '../../utils/format';
import { MediaImage } from '../ui/MediaImage';

/**
 * Carte d'une page vitrine (réalisations, projets à venir) : photo, petit trait rouge, titre
 * marine, lieu, description et bouton rond rouge vers la fiche du projet.
 */
export function VitrineCard({ item }: { item: ShowcaseItem }) {
  return (
    <Link
      to={ROUTES.showcaseDetail(item.category, item.id)}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-white bg-mtm-surface shadow-card ring-1 ring-mtm-border/60 transition-all duration-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary lg:hover:-translate-y-1 lg:hover:shadow-card-hover"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-mtm-border sm:aspect-[16/10] lg:aspect-[4/3]">
        <MediaImage
          src={item.imageUrl}
          alt={item.title}
          fallbackLabel="Image à venir"
          sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {item.date && (
          <span className="absolute left-2.5 top-2.5 rounded-lg bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mtm-primary-dark shadow-card">
            {formatMonthYear(item.date)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6 lg:p-4">
        <span aria-hidden="true" className="h-[3px] w-8 rounded-full bg-mtm-accent" />
        <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-mtm-primary-dark lg:mt-2.5 lg:text-[1.05rem]">{item.title}</h2>
        {item.location && <p className="mt-1 text-[15px] font-medium text-mtm-primary-medium lg:text-[13px]">{item.location}</p>}
        {item.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-mtm-muted lg:mt-2 lg:text-[13px] lg:leading-snug">{item.description}</p>}
        <span className="mt-auto flex justify-end pt-4 lg:pt-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-mtm-accent lg:h-9 lg:w-9 text-white shadow-md transition-transform duration-200 group-hover:translate-x-0.5 group-hover:bg-mtm-accent-dark">
            <ArrowRight className="h-5 w-5 lg:h-4 lg:w-4" aria-hidden="true" />
            <span className="sr-only">Voir le projet : {item.title}</span>
          </span>
        </span>
      </div>
    </Link>
  );
}
