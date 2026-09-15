import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSiteContact } from '../../hooks/useSiteContact';

export function WhatsAppButton() {
  const { whatsapp } = useSiteContact();
  // La fiche terrain affiche une barre d'action fixe en bas sur mobile :
  // le bouton se décale pour ne pas la recouvrir.
  const segments = useLocation().pathname.split('/').filter(Boolean);
  const aboveActionBar = segments.length === 2 && segments[0] === 'terrains';
  // L'espace client propose déjà WhatsApp dans son encart « Une question ? » :
  // sur mobile, le bouton flottant y masquerait les montants et statuts.
  const inClientArea = segments[0] === 'espace-client';

  return (
    <a
      href={`https://wa.me/${whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discuter sur WhatsApp"
      className={`fixed right-4 z-40 h-12 w-12 items-center justify-center rounded-full bg-mtm-success text-white shadow-card transition-transform hover:scale-105 sm:right-5 ${
        inClientArea ? 'hidden lg:flex' : 'flex'
      } ${aboveActionBar ? 'bottom-[5.5rem] lg:bottom-5' : 'bottom-5'}`}
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
    </a>
  );
}
