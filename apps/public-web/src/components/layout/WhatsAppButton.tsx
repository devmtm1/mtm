import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSiteContact } from '../../hooks/useSiteContact';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { ROUTES } from '../../routes';

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

  // Accueil : la vidéo de bannière porte l'adresse et l'e-mail dans sa bande du bas, là où se pose ce bouton. On ne le montre
  // qu'une fois la bannière quittée.
  const surAccueil = pathname === ROUTES.home;
  const [apresBanniere, setApresBanniere] = useState(false);
  useEffect(() => {
    if (!surAccueil) return;
    const suivre = (): void => setApresBanniere(window.scrollY > 160);
    suivre();
    window.addEventListener('scroll', suivre, { passive: true });
    return () => window.removeEventListener('scroll', suivre);
  }, [surAccueil]);
  const masque = surAccueil && !apresBanniere;

  if (isMobile || inClientArea) return null;

  return (
    <a
      href={`https://wa.me/${whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Discuter sur WhatsApp"
      aria-hidden={masque || undefined}
      tabIndex={masque ? -1 : undefined}
      className={`fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-mtm-success text-white shadow-card transition-[transform,opacity] hover:scale-105 motion-reduce:transition-none ${
        masque ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <MessageCircle className="h-6 w-6" aria-hidden="true" />
    </a>
  );
}
