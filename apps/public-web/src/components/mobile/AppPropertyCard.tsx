import { Link } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import { MediaImage } from '../ui/MediaImage';
import { FavoriteButton } from './FavoriteButton';
import { StatutJuridiqueChip } from '../terrains/StatutJuridiqueChip';
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
  /**
   * Libellé du badge rouge quand MTM met le bien en avant (« Mis en avant » pour
   * une vente, « À la une » pour une location) ; absent sinon.
   */
  featured?: string;
  /** Statut juridique d'un bien à vendre (titre foncier, bail…) : mis en évidence sur la carte. */
  statutJuridique?: string;
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
        {/* Les badges se rangent en colonne : « Mis en avant » en premier, puis la nature de l'offre. */}
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {card.featured && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-mtm-accent px-2.5 py-1 text-[11px] font-bold text-white shadow-card">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              {card.featured}
            </span>
          )}
          <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-card ${BADGE_TONES[card.badgeTone]}`}>
            {card.badge}
          </span>
        </div>
        <FavoriteButton kind={card.kind} id={card.id} label={card.title} className="absolute right-2.5 top-2.5" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-1 text-[14px] font-bold text-mtm-text">{card.title}</h3>
        <p className="font-display text-[15px] font-bold leading-tight text-mtm-primary">
          {card.price}
          {card.priceSuffix && <span className="ml-1 text-[11px] font-semibold text-mtm-muted">{card.priceSuffix}</span>}
        </p>
        {card.statutJuridique && <StatutJuridiqueChip statut={card.statutJuridique} className="self-start" />}
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
