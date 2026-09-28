import { MessageCircle } from 'lucide-react';

interface DemandeWhatsAppCtaProps {
  /** Numéro au format international sans « + » (ex. 221771551810). */
  numero: string;
  /** Message pré-rempli dans la conversation. */
  message: string;
}

/**
 * WhatsApp proposé juste avant le formulaire, canal privilégié de la
 * clientèle expatriée (section 4 du cahier des charges). Il vit dans son
 * propre composant parce qu'il apparaît à deux endroits de la page
 * « Démarches » : dans la fenêtre ouverte depuis le bouton d'appel, et dans
 * la section de bas de page. Sans cela, celui qui ouvre la fenêtre perdrait
 * ce chemin au moment précis où son intention est la plus forte.
 */
export function DemandeWhatsAppCta({ numero, message }: DemandeWhatsAppCtaProps) {
  return (
    <>
      <a
        href={`https://wa.me/${numero}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-md border border-mtm-success bg-mtm-success/5 px-4 py-3 text-sm font-semibold text-mtm-success transition-colors hover:bg-mtm-success/10"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        Discuter directement sur WhatsApp
      </a>

      <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-mtm-muted">
        <span className="h-px flex-1 bg-mtm-border" aria-hidden="true" />
        ou remplissez le formulaire
        <span className="h-px flex-1 bg-mtm-border" aria-hidden="true" />
      </div>
    </>
  );
}
