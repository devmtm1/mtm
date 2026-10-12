import { Link } from 'react-router-dom';
import { Bath, BedDouble, MapPin, Ruler, Star } from 'lucide-react';
import { MediaImage } from '../ui/MediaImage';
import { FavoriteButton } from './FavoriteButton';
import { StatutJuridiqueChip } from '../terrains/StatutJuridiqueChip';
import type { FavoriteKind } from '../../utils/favorites';

/** Un repère chiffré du bien (chambres, salles d'eau, surface), lu d'un coup d'œil sous le titre. */
export interface AppPropertyFact {
  icon: 'chambres' | 'sallesEau' | 'surface';
  /** « 4 ch. », « 3 sdb. », « 250 m² ». */
  label: string;
}

export interface AppPropertyCardData {
  kind: FavoriteKind;
  id: string;
  to: string;
  title: string;
  /** Photos candidates : la suivante prend le relais si une URL est morte. */
  images: string[];
  /**
   * Nature de l'offre, seulement quand elle ne va pas de soi : une location porte « Location »,
   * une vente n'a pas de badge (c'est le cas général, et le prix suffit à le dire).
   */
  badge?: string;
  badgeTone?: 'primary' | 'success';
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
  /** Chambres, salles d'eau, surface : trois repères au plus, ceux que le bien renseigne. */
  facts?: AppPropertyFact[];
}

const BADGE_TONES = {
  primary: 'bg-mtm-primary text-white',
  success: 'bg-mtm-success text-white',
} as const;

const FACT_ICONS = {
  chambres: BedDouble,
  sallesEau: Bath,
  surface: Ruler,
} as const;

/**
 * Carte d'un bien dans la rangée « Biens en vedette » de l'accueil mobile :
 * grande photo arrondie avec le badge et le cœur, puis le nom, les repères du
 * bien (chambres, salles d'eau, surface), le prix et le lieu. Les données
 * viennent du catalogue des ventes et des locations.
 */
export function AppPropertyCard({ card }: { card: AppPropertyCardData }) {
  return (
    <Link
      to={card.to}
      className="group flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-mtm-border/60 bg-mtm-surface shadow-card transition-transform duration-150 active:scale-[0.97]"
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-mtm-border">
        <MediaImage
          src={card.images}
          alt={card.title}
          sizes="280px"
          className="h-full w-full object-cover transition-transform duration-500 group-active:scale-105"
        />
        {/* Peu de badges, pour ne pas surcharger la photo : « Mis en avant », puis « Location » pour un logement. */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {card.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-mtm-accent px-3 py-1 text-[11px] font-bold text-white shadow-card">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              {card.featured}
            </span>
          )}
          {card.badge && (
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold shadow-card ${BADGE_TONES[card.badgeTone ?? 'primary']}`}>
              {card.badge}
            </span>
          )}
        </div>
        <FavoriteButton kind={card.kind} id={card.id} label={card.title} className="absolute right-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-1 font-display text-[15px] font-bold text-mtm-text">{card.title}</h3>
        {card.facts && card.facts.length > 0 && (
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mtm-muted" aria-label="Caractéristiques">
            {card.facts.map((fact) => {
              const Icone = FACT_ICONS[fact.icon];
              return (
                <li key={fact.icon} className="inline-flex items-center gap-1">
                  <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {fact.label}
                </li>
              );
            })}
          </ul>
        )}
        <p className="font-display text-[17px] font-bold leading-tight text-mtm-primary">
          {card.price}
          {card.priceSuffix && <span className="ml-1 text-[11px] font-semibold text-mtm-muted">{card.priceSuffix}</span>}
        </p>
        {card.statutJuridique && <StatutJuridiqueChip statut={card.statutJuridique} className="self-start" />}
        {card.place && (
          <p className="mt-auto flex items-center gap-1 pt-0.5 text-xs text-mtm-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{card.place}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
