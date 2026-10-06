import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSiteContact } from '../../hooks/useSiteContact';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { isDetailRoute } from '../mobile/mobile-routes';

export function WhatsAppButton() {
  const { whatsapp } = useSiteContact();
  const isMobile = useIsMobile();
  // La fiche terrain affiche une barre d'action fixe en bas sur mobile :
  // le bouton se décale pour ne pas la recouvrir.
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  const aboveActionBar = segments.length === 2 && (segments[0] === 'terrains' || segments[0] === 'locations');
  // L'espace client propose déjà WhatsApp dans son encart « Une question ? » :
  // sur mobile, le bouton flottant y masquerait les montants et statuts.
  const inClientArea = segments[0] === 'espace-client';
  // L'accueil a sa propre barre d'action (Voir nos biens / WhatsApp).
  const onHome = segments.length === 0;

  // Sur mobile, le bouton d'actions rapides (WhatsApp compris) remplace ce bouton
  // sur les écrans principaux ; il ne reste que sur les fiches, qui n'ont pas
  // ce bouton et dont la barre d'action fixe est au-dessus.
  if (isMobile && !isDetailRoute(pathname)) return null;

  return (
    <a
      href={`https://wa.me/${whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discuter sur WhatsApp"
      className={`fixed right-4 z-40 h-12 w-12 items-center justify-center rounded-full bg-mtm-success text-white shadow-card transition-transform hover:scale-105 sm:right-5 ${
        inClientArea || onHome ? 'hidden lg:flex' : 'flex'
      } ${aboveActionBar ? 'bottom-[5.5rem] lg:bottom-5' : 'bottom-5'}`}
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
    </a>
  );
}
