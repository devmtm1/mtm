import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/auth-context-store';
import { telechargerRecu } from '../../api/clientPortal';
import { useToast } from '../ui/toast-store';

/** Télécharge le reçu PDF d'un paiement validé. Le fichier est protégé : il est récupéré avec le jeton du client. */
export function BoutonRecu({ nature, paiementId }: { nature: 'vente' | 'loyer'; paiementId: string }) {
  const { accessToken } = useAuth();
  const toast = useToast();
  const [enCours, setEnCours] = useState(false);

  async function telecharger(): Promise<void> {
    if (!accessToken || enCours) return;
    setEnCours(true);
    try {
      const fichier = await telechargerRecu(accessToken, nature, paiementId);
      const adresse = URL.createObjectURL(fichier);
      const lien = document.createElement('a');
      lien.href = adresse;
      lien.download = 'recu-de-paiement.pdf';
      lien.click();
      window.setTimeout(() => URL.revokeObjectURL(adresse), 10_000);
    } catch {
      toast.show('Le reçu n’a pas pu être téléchargé. Réessayez dans un instant.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void telecharger()}
      disabled={enCours}
      aria-label="Télécharger le reçu de ce paiement"
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-mtm-border bg-mtm-surface px-2.5 text-xs font-semibold text-mtm-primary transition-colors hover:border-mtm-primary disabled:opacity-60"
    >
      {enCours ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
      Reçu
    </button>
  );
}
