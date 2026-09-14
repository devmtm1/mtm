import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import type { ShowcaseItem } from '../../types/showcase';
import { ROUTES } from '../../routes';
import { formatMonthYear } from '../../utils/format';
import { MediaImage } from '../ui/MediaImage';

/**
 * Carte compacte du portfolio : photo, titre, lieu et date. Le détail
 * (description complète, grande photo) est sur la fiche dédiée.
 */
export function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  return (
    <Link
      to={ROUTES.showcaseDetail(item.category, item.id)}
      className="group flex flex-col overflow-hidden rounded-lg border border-mtm-border bg-mtm-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary"
    >
      <div className="aspect-[3/2] w-full overflow-hidden bg-mtm-border">
        <MediaImage
          src={item.imageUrl}
          alt={item.title}
          fallbackLabel="Image à venir"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 font-display text-sm font-bold leading-snug text-mtm-text">{item.title}</h3>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mtm-muted">
          {item.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {item.location}
            </span>
          )}
          {item.date && <span>{formatMonthYear(item.date)}</span>}
        </p>
        <span className="mt-auto inline-flex items-center gap-1 pt-1.5 text-xs font-semibold text-mtm-primary">
          Voir le projet
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
