import { Link } from 'react-router-dom';
import { BedDouble, Bath, Camera, CalendarCheck, MapPin, MessageCircle, Moon, Ruler, Sofa } from 'lucide-react';
import type { Location } from '../../types/location';
import { ROUTES } from '../../routes';
import { typeBienLabel } from '../../utils/bienLabels';
import { formatSuperficie, groupDigits } from '../../utils/format';
import { useSiteContact } from '../../hooks/useSiteContact';
import {
  chambresLabel,
  disponibiliteLabel,
  estCourteDuree,
  prixAffiche,
  locationPlace,
  locationTitle,
  sallesEauLabel,
} from '../../utils/locationFormat';
import { MediaImage } from '../ui/MediaImage';
import { FavoriteButton } from '../mobile/FavoriteButton';

interface LocationCardProps {
  location: Location;
  /** Mise en page resserrée sous 640 px (deux colonnes sur téléphone). */
  compact?: boolean;
  /** Dans une section déjà consacrée aux annonces à la une, l'étiquette « À la une » n'apprend rien. */
  masquerALaUne?: boolean;
  /** Liste de la page Locations : sur téléphone, la carte se couche (photo à gauche, texte à droite) pour tenir sur une colonne. */
  liste?: boolean;
}

/** Ce qu'un locataire veut savoir avant d'appeler : la caution et les charges, tels que MTM les a saisis. */
function conditionsLabel(location: Pick<Location, 'charges' | 'moisCaution' | 'montantCaution'>): string | null {
  const parts: string[] = [];
  if (location.moisCaution) parts.push(`Caution : ${location.moisCaution} mois`);
  else if (location.montantCaution) parts.push(`Caution : ${groupDigits(Math.round(location.montantCaution))} FCFA`);
  if (location.charges) parts.push(`Charges : ${groupDigits(Math.round(location.charges))} FCFA`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * Carte d'annonce de location : la photo porte le loyer (c'est le premier
 * critère d'un locataire), puis le titre, le lieu et les trois chiffres qui
 * décident d'ouvrir ou non la fiche — chambres, salles d'eau, surface.
 */
export function LocationCard({ location, compact = false, masquerALaUne = false, liste = false }: LocationCardProps) {
  const { whatsapp } = useSiteContact();
  const photos = location.medias.filter((media) => media.type === 'photo');
  const covers = (photos.length > 0 ? photos : location.medias).map((media) => media.secureUrl);
  const typeLabel = typeBienLabel(location.type);
  const titre = locationTitle(location, typeLabel);
  const place = locationPlace(location);
  const chambres = chambresLabel(location.nombreChambres);
  const sallesEau = sallesEauLabel(location.nombreSallesEau);
  const libre = disponibiliteLabel(location.disponibleLe);
  const courte = estCourteDuree(location);
  const prix = prixAffiche(location);
  const conditions = courte ? null : conditionsLabel(location);
  const lienWhatsapp = `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Bonjour, je souhaite visiter ce bien : ${titre} (${location.referenceInterne}).`)}`;

  return (
    <div
      className={`group relative flex h-full overflow-hidden rounded-2xl border border-mtm-border/70 bg-mtm-surface shadow-card transition-all duration-150 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-mtm-primary lg:rounded-xl lg:border-mtm-border lg:duration-200 lg:hover:-translate-y-0.5 lg:hover:border-mtm-primary-light lg:hover:shadow-card-hover ${
        liste ? 'max-sm:flex-row sm:flex-col' : 'flex-col'
      }`}
    >
      <div className={`relative w-full overflow-hidden bg-mtm-border ${liste ? 'max-sm:w-[40%] max-sm:shrink-0 max-sm:self-stretch sm:aspect-[4/3]' : 'aspect-[4/3]'}`}>
        <MediaImage
          src={covers}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Dégradé sous le loyer : lisible sur n'importe quelle photo. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/65 to-transparent ${liste ? 'max-sm:hidden' : ''}`}
        />

        <FavoriteButton kind="location" id={location.id} label={titre} className="absolute right-2.5 top-2.5 z-10" />

        <div className={`absolute left-2.5 top-2.5 flex flex-wrap gap-1.5 ${liste ? 'max-sm:right-12' : ''}`}>
          {location.misEnAvant && !masquerALaUne && (
            <span
              className={`whitespace-nowrap rounded-full bg-mtm-accent font-semibold text-white shadow-card ${
                compact ? 'px-2 py-0.5 text-[11px] sm:px-2.5 sm:text-xs' : 'px-2.5 py-0.5 text-xs'
              }`}
            >
              À la une
            </span>
          )}
          {courte && (
            <span
              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-mtm-primary font-semibold text-white shadow-card ${
                compact ? 'px-2 py-0.5 text-[11px] sm:text-xs' : 'px-2.5 py-0.5 text-xs'
              }`}
            >
              <Moon className={`h-3 w-3 ${liste ? 'max-sm:hidden' : ''}`} aria-hidden="true" />Courte durée
            </span>
          )}
          {location.meuble && !courte && (
            <span
              className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white/95 font-semibold text-mtm-primary shadow-card ${
                compact ? 'px-2 py-0.5 text-[11px] sm:text-xs' : 'px-2.5 py-0.5 text-xs'
              }`}
            >
              <Sofa className="h-3 w-3" aria-hidden="true" />
              Meublé
            </span>
          )}
        </div>

        {location.medias.length > 1 && (
          <span className={`absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur ${liste ? 'max-sm:hidden' : ''}`}>
            <Camera className="h-3 w-3" aria-hidden="true" />
            {location.medias.length}
          </span>
        )}

        <p className={`absolute bottom-2.5 left-3 right-11 text-white ${liste ? 'max-sm:hidden' : ''}`}>
          <span
            className={`whitespace-nowrap font-display font-bold drop-shadow ${compact ? 'text-base sm:text-xl' : 'text-xl'}`}
          >
            {prix.montant}
          </span>
          <span className="ml-1 text-xs font-medium text-white/85">{prix.suffixe}</span>
        </p>
      </div>

      <div className={`flex min-w-0 flex-1 flex-col ${liste ? 'max-sm:gap-1 max-sm:p-3 sm:gap-1.5 sm:p-4' : compact ? 'gap-1 p-2.5 sm:gap-1.5 sm:p-4' : 'gap-1.5 p-4'}`}>
        {/* Liste sur téléphone : le prix passe à côté de la photo, où il tient sur une ligne. */}
        {liste && (
          <p className="text-mtm-accent sm:hidden">
            <span className="font-display text-base font-bold">{prix.montant}</span>
            <span className="ml-1 text-xs font-medium text-mtm-muted">{prix.suffixe}</span>
          </p>
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-mtm-primary">
          {typeLabel}
          <span className={liste ? 'max-sm:hidden' : ''}>
            <span aria-hidden="true" className="mx-1.5 text-mtm-border">
              ·
            </span>
            <span className="text-mtm-muted">{location.referenceInterne}</span>
          </span>
        </span>

        {/* Le lien de la fiche s'étend sur toute la carte : le bouton WhatsApp, au-dessus, reste cliquable à part. */}
        <h3 className={`font-display font-bold leading-snug text-mtm-text ${compact ? 'text-sm sm:text-base' : 'text-base'}`}>
          <Link
            to={ROUTES.locationDetail(location.id)}
            className="line-clamp-2 after:absolute after:inset-0 after:z-[1] focus-visible:outline-none"
          >
            {titre}
          </Link>
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

        {conditions && <p className="text-xs text-mtm-muted">{conditions}</p>}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-mtm-border pt-2">
          <p className={`inline-flex min-w-0 items-start gap-1.5 font-semibold text-mtm-success sm:items-center ${compact ? 'text-xs' : 'text-xs sm:text-[13px]'}`}>
            <CalendarCheck className="mt-px h-3.5 w-3.5 shrink-0 sm:mt-0" aria-hidden="true" />
            <span className="leading-tight sm:truncate">{courte ? `${location.nuitsMinimum} nuit${location.nuitsMinimum > 1 ? 's' : ''} minimum` : libre}</span>
          </p>
          {/* Un clic pour demander une visite : le message mentionne l'annonce. */}
          <a
            href={lienWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Demander une visite sur WhatsApp : ${titre}`}
            className="relative z-10 inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-mtm-success bg-mtm-success/10 px-3 text-xs font-bold text-mtm-success transition-colors hover:bg-mtm-success hover:text-white"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span className={liste ? 'max-sm:sr-only' : ''}>Visiter</span>
          </a>
        </div>
      </div>
    </div>
  );
}
