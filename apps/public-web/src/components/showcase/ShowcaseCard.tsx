import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import type { ShowcaseItem } from '../../types/showcase';
import { ROUTES } from '../../routes';
import { formatMonthYear } from '../../utils/format';
import { MediaImage } from '../ui/MediaImage';

/**
 * Carte compacte du portfolio : photo, titre, lieu et date. Le détail
 * (description complète, grande photo) est sur la fiche dédiée. Sur mobile,
 * la date se pose sur la photo et la carte réagit au toucher comme celles des
 * biens ; l'appel « Voir le projet » n'apparaît que sur ordinateur.
 */
export function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  return (
    <Link
      to={ROUTES.showcaseDetail(item.category, item.id)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-mtm-border/70 bg-mtm-surface shadow-card transition-all duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary lg:rounded-lg lg:border-mtm-border lg:duration-200 lg:hover:-translate-y-0.5 lg:hover:shadow-card-hover"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-mtm-border lg:aspect-[3/2]">
        <MediaImage
          src={item.imageUrl}
          alt={item.title}
          fallbackLabel="Image à venir"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {item.date && (
          <span className="absolute left-2.5 top-2.5 rounded-lg bg-mtm-primary px-2.5 py-1 text-[11px] font-bold text-white shadow-card lg:hidden">
            {formatMonthYear(item.date)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 lg:p-3.5">
        <h3 className="line-clamp-2 font-display text-sm font-bold leading-snug text-mtm-text">{item.title}</h3>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mtm-muted">
          {item.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {item.location}
            </span>
          )}
          {item.date && <span className="hidden lg:inline">{formatMonthYear(item.date)}</span>}
        </p>
        <span className="mt-auto hidden items-center gap-1 pt-1.5 text-xs font-semibold text-mtm-primary lg:inline-flex">
          Voir le projet
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
