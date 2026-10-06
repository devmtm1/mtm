import { Link } from 'react-router-dom';
import { BedDouble, Bath, Camera, CalendarCheck, MapPin, Ruler, Sofa } from 'lucide-react';
import type { Location } from '../../types/location';
import { ROUTES } from '../../routes';
import { typeBienLabel } from '../../utils/bienLabels';
import { formatSuperficie } from '../../utils/format';
import {
  chambresLabel,
  disponibiliteLabel,
  formatLoyerMontant,
  locationPlace,
  locationTitle,
  sallesEauLabel,
} from '../../utils/locationFormat';
import { MediaImage } from '../ui/MediaImage';

interface LocationCardProps {
  location: Location;
  /** Mise en page resserrée sous 640 px (deux colonnes sur téléphone). */
  compact?: boolean;
}

/**
 * Carte d'annonce de location : la photo porte le loyer (c'est le premier
 * critère d'un locataire), puis le titre, le lieu et les trois chiffres qui
 * décident d'ouvrir ou non la fiche — chambres, salles d'eau, surface.
 */
export function LocationCard({ location, compact = false }: LocationCardProps) {
  const photos = location.medias.filter((media) => media.type === 'photo');
  const covers = (photos.length > 0 ? photos : location.medias).map((media) => media.secureUrl);
  const typeLabel = typeBienLabel(location.type);
  const titre = locationTitle(location, typeLabel);
  const place = locationPlace(location);
  const chambres = chambresLabel(location.nombreChambres);
  const sallesEau = sallesEauLabel(location.nombreSallesEau);
  const libre = disponibiliteLabel(location.disponibleLe);

  return (
    <Link
      to={ROUTES.locationDetail(location.id)}
      className="group flex flex-col overflow-hidden rounded-xl border border-mtm-border bg-mtm-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-mtm-primary-light hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mtm-primary"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-mtm-border">
        <MediaImage
          src={covers}
          alt={titre}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Dégradé sous le loyer : lisible sur n'importe quelle photo. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/65 to-transparent"
        />

        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {location.misEnAvant && (
            <span
              className={`rounded-full bg-mtm-accent font-semibold text-white shadow-card ${
                compact ? 'px-2 py-0.5 text-[11px] sm:px-2.5 sm:text-xs' : 'px-2.5 py-0.5 text-xs'
              }`}
            >
              À la une
            </span>
          )}
          {location.meuble && (
            <span
              className={`inline-flex items-center gap-1 rounded-full bg-white/95 font-semibold text-mtm-primary shadow-card ${
                compact ? 'px-2 py-0.5 text-[11px] sm:text-xs' : 'px-2.5 py-0.5 text-xs'
              }`}
            >
              <Sofa className="h-3 w-3" aria-hidden="true" />
              Meublé
            </span>
          )}
        </div>

        {location.medias.length > 1 && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
            <Camera className="h-3 w-3" aria-hidden="true" />
            {location.medias.length}
          </span>
        )}

        <p className="absolute bottom-2.5 left-3 right-3 text-white">
          <span
            className={`font-display font-bold drop-shadow ${compact ? 'text-base sm:text-xl' : 'text-xl'}`}
          >
            {formatLoyerMontant(location.loyerMensuel)}
          </span>
          <span className="ml-1 text-xs font-medium text-white/85">/ mois</span>
        </p>
      </div>

      <div className={`flex flex-1 flex-col ${compact ? 'gap-1 p-2.5 sm:gap-1.5 sm:p-4' : 'gap-1.5 p-4'}`}>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-mtm-primary">
          {typeLabel}
          <span aria-hidden="true" className="mx-1.5 text-mtm-border">
            ·
          </span>
          <span className="text-mtm-muted">{location.referenceInterne}</span>
        </span>

        <h3
          className={`line-clamp-2 font-display font-bold leading-snug text-mtm-text ${
            compact ? 'text-sm sm:text-base' : 'text-base'
          }`}
        >
          {titre}
        </h3>

        {place && (
          <p className={`flex items-center gap-1 text-mtm-muted ${compact ? 'text-xs' : 'text-xs sm:text-[13px]'}`}>
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{place}</span>
          </p>
        )}

        <ul
          className={`mt-1 flex flex-wrap gap-x-3 gap-y-1 text-mtm-muted ${compact ? 'text-xs' : 'text-xs sm:text-[13px]'}`}
          aria-label="Caractéristiques"
        >
          {chambres && (
            <li className="inline-flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5" aria-hidden="true" />
              {chambres}
            </li>
          )}
          {sallesEau && (
            <li className="inline-flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" aria-hidden="true" />
              {sallesEau}
            </li>
          )}
          {location.superficie !== null && (
            <li className="inline-flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
              {formatSuperficie(location.superficie, 'm²')}
            </li>
          )}
        </ul>

        <p
          className={`mt-auto inline-flex items-center gap-1.5 border-t border-mtm-border pt-2 font-semibold text-mtm-success ${
            compact ? 'text-xs' : 'text-xs sm:text-[13px]'
          }`}
        >
          <CalendarCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {libre}
        </p>
      </div>
    </Link>
  );
}
