import type { ReactNode } from 'react';
import { Phone } from 'lucide-react';
import { toTelHref, useSiteContact } from '../../hooks/useSiteContact';

interface DetailActionBarProps {
  /** Petit libellé au-dessus du prix (« Prix public », « Loyer / mois »). Sans prix, l'action prend toute la largeur. */
  label?: string;
  price?: string;
  /** Action principale de l'écran (un bouton). */
  children: ReactNode;
}

/**
 * Barre d'action fixe en bas des fiches sur mobile : le prix, un appel direct
 * et l'action principale restent sous le pouce, comme dans une application.
 * Masquée dès lg : le panneau latéral prend le relais.
 */
export function DetailActionBar({ label, price, children }: DetailActionBarProps) {
  const contact = useSiteContact();

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-3xl border-t border-mtm-border/70 bg-mtm-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_28px_rgba(31,41,55,0.12)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        {price && (
          <div className="min-w-0 flex-1">
            {label && <p className="text-[11px] font-semibold uppercase tracking-wide text-mtm-muted">{label}</p>}
            <p className="truncate font-display text-base font-bold leading-tight sm:text-lg text-mtm-primary">{price}</p>
          </div>
        )}
        <a
          href={toTelHref(contact.telephone)}
          aria-label="Appeler MTM Immobilier"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-mtm-border bg-mtm-surface text-mtm-success active:scale-90"
        >
          <Phone className="h-5 w-5" aria-hidden="true" />
        </a>
        <div className={price ? 'shrink-0' : 'min-w-0 flex-1 [&>*]:w-full'}>{children}</div>
      </div>
    </div>
  );
}
