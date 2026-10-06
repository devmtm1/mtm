import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSiteContact } from '../../hooks/useSiteContact';
import { useIsMobile } from '../../hooks/useMediaQuery';

/**
 * Bouton WhatsApp flottant du site sur ordinateur. Sur mobile, l'application a
 * ses propres accès : le bouton d'actions rapides sur les écrans principaux, et
 * l'appel dans la barre d'action des fiches.
 */
export function WhatsAppButton() {
  const { whatsapp } = useSiteContact();
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  // L'espace client propose déjà WhatsApp dans son encart « Une question ? ».
  const inClientArea = pathname.split('/').filter(Boolean)[0] === 'espace-client';

  if (isMobile || inClientArea) return null;

  return (
    <a
      href={`https://wa.me/${whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discuter sur WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-mtm-success text-white shadow-card transition-transform hover:scale-105"
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
    </a>
  );
}
