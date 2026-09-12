import { MapPin } from 'lucide-react';
import type { ShowcaseItem } from '../../types/showcase';
import { formatDate } from '../../utils/format';
import { MediaImage } from '../ui/MediaImage';

export function ShowcaseCard({ item }: { item: ShowcaseItem }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-mtm-border bg-mtm-surface shadow-card transition-shadow duration-200 hover:shadow-card-hover">
      <div className="aspect-[4/3] w-full overflow-hidden bg-mtm-border">
        <MediaImage
          src={item.imageUrl}
          alt={item.title}
          fallbackLabel="Image à venir"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-display text-base font-bold text-mtm-text">{item.title}</h3>
        {item.location && (
          <p className="flex items-center gap-1.5 text-sm text-mtm-muted">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.location}
          </p>
        )}
        {item.description && <p className="text-sm text-mtm-muted">{item.description}</p>}
        {item.date && <p className="mt-auto pt-2 text-xs text-mtm-muted">{formatDate(item.date)}</p>}
      </div>
    </article>
  );
}
