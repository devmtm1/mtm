import { Share2 } from 'lucide-react';
import { useToast } from '../ui/toast-store';

/**
 * Partage la fiche : le menu de partage du téléphone quand il existe (WhatsApp,
 * messages…), sinon copie du lien. Un acheteur montre souvent un bien à sa
 * famille avant de décider ; partager doit tenir en un toucher.
 */
export function ShareButton({ title, className = '' }: { title: string; className?: string }) {
  const toast = useToast();

  async function share(): Promise<void> {
    const url = window.location.href;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.show('Lien copié');
    } catch (error) {
      // Fermer le menu de partage n'est pas une erreur.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.show('Partage impossible : copiez le lien depuis la barre d’adresse', 'error');
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={`Partager ${title}`}
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-mtm-text shadow-card backdrop-blur transition-transform active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mtm-primary ${className}`}
    >
      <Share2 className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  );
}
