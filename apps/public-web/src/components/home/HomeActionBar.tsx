import { KeyRound, MessageCircle, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSiteContact } from '../../hooks/useSiteContact';
import { ROUTES } from '../../routes';

/**
 * Barre d'action fixe de l'accueil sur mobile : les deux gestes qui comptent
 * (voir nos biens, écrire sur WhatsApp) restent sous le pouce quelle que
 * soit la section affichée. Remplace le bouton WhatsApp flottant sur cette page.
 */
export function HomeActionBar() {
  const { whatsapp } = useSiteContact();
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-mtm-border bg-mtm-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(31,41,55,0.08)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-[1.3fr_1fr_auto] gap-2">
        {/* La location d'abord : c'est l'activité principale de MTM. */}
        <Link
          to={ROUTES.locations}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-mtm-accent px-3 py-2.5 text-sm font-semibold text-white"
        >
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          Louer
        </Link>
        <Link
          to={ROUTES.catalog}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-mtm-primary px-3 py-2.5 text-sm font-semibold text-white"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Nos biens
        </Link>
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-mtm-success bg-mtm-success/10 px-3 py-2.5 text-mtm-success"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
