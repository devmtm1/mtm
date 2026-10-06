import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { MediaImage } from '../ui/MediaImage';
import { FavoriteButton } from './FavoriteButton';
import type { FavoriteKind } from '../../utils/favorites';

export interface AppPropertyCardData {
  kind: FavoriteKind;
  id: string;
  to: string;
  title: string;
  /** Photos candidates : la suivante prend le relais si une URL est morte. */
  images: string[];
  /** « Vente » ou « Location » : la nature de l'offre, lue avant le reste. */
  badge: string;
  badgeTone: 'primary' | 'success';
  price: string;
  /** Période du loyer (« / mois »), absente pour un prix de vente. */
  priceSuffix?: string;
  place: string;
}

const BADGE_TONES = {
  primary: 'bg-mtm-primary text-white',
  success: 'bg-mtm-success text-white',
} as const;

/**
 * Carte d'un bien dans la rangée « Nos biens récents » de l'accueil mobile :
 * photo arrondie avec la nature de l'offre et le cœur, puis le nom, le prix et
 * le lieu. Les données viennent du catalogue des ventes et des locations.
 */
export function AppPropertyCard({ card }: { card: AppPropertyCardData }) {
  return (
    <Link
      to={card.to}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-mtm-border/70 bg-mtm-surface shadow-card transition-transform duration-150 active:scale-[0.97]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-mtm-border">
        <MediaImage
          src={card.images}
          alt={card.title}
          sizes="240px"
          className="h-full w-full object-cover transition-transform duration-500 group-active:scale-105"
        />
        <span
          className={`absolute left-2.5 top-2.5 rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-card ${BADGE_TONES[card.badgeTone]}`}
        >
          {card.badge}
        </span>
        <FavoriteButton kind={card.kind} id={card.id} label={card.title} className="absolute right-2.5 top-2.5" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-1 text-[14px] font-bold text-mtm-text">{card.title}</h3>
        <p className="font-display text-[15px] font-bold leading-tight text-mtm-primary">
          {card.price}
          {card.priceSuffix && <span className="ml-1 text-[11px] font-semibold text-mtm-muted">{card.priceSuffix}</span>}
        </p>
        {card.place && (
          <p className="mt-auto flex items-center gap-1 text-xs text-mtm-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{card.place}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
