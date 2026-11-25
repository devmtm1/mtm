import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { ApiError } from '../../api/client';
import { accepterProtocoleEnLigne } from '../../api/clientPortal';
import { useAuth } from '../../contexts/auth-context-store';
import type { ClientDossierProtocole } from '../../types/clientPortal';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/toast-store';

/**
 * Acceptation en ligne du protocole : le client lit le document, saisit son nom complet et coche « j'ai lu et j'accepte ».
 * MTM conserve la date, le nom saisi, l'adresse de connexion et l'empreinte du document accepté.
 */
export function AccepterProtocoleModal({
  protocole,
  onClose,
  onAccepte,
}: {
  protocole: ClientDossierProtocole;
  onClose: () => void;
  onAccepte: () => void;
}) {
  const { accessToken } = useAuth();
  const toast = useToast();
  const [nom, setNom] = useState('');
  const [lu, setLu] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function accepter(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!accessToken || envoi) return;
    if (nom.trim().length < 3) {
      setErreur('Saisissez votre nom complet.');
      return;
    }
    if (!lu) {
      setErreur('Cochez la case pour confirmer que vous avez lu le document.');
      return;
    }
    setErreur(null);
    setEnvoi(true);
    try {
      await accepterProtocoleEnLigne(accessToken, protocole.id, nom.trim());
      toast.show('Protocole accepté : votre conseiller en est informé');
      onAccepte();
      onClose();
    } catch (caught) {
      setErreur(
        caught instanceof ApiError
          ? caught.message
          : "L'acceptation a échoué. Merci de réessayer.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modal title="Accepter mon protocole" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => void accepter(event)}
      >
        <p className="text-sm text-mtm-muted">
          Lisez d’abord le document. En l’acceptant, vous confirmez être
          d’accord avec son contenu ; MTM conserve la date, votre nom et
          l’empreinte du document accepté.
        </p>
        {protocole.documentUrl && (
          <a
            href={protocole.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-mtm-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Lire « {protocole.titre ?? 'le protocole'} »
          </a>
        )}
        <FormField label="Votre nom complet" htmlFor="accepter-nom" required>
          <input
            id="accepter-nom"
            value={nom}
            onChange={(event) => setNom(event.target.value)}
            maxLength={200}
            autoComplete="name"
            className="min-h-11 rounded-xl border border-mtm-border bg-mtm-surface px-3 text-[15px] text-mtm-text"
          />
        </FormField>
        <label className="flex items-start gap-2 text-sm text-mtm-text">
          <input
            type="checkbox"
            checked={lu}
            onChange={(event) => setLu(event.target.checked)}
            className="mt-1 h-4 w-4"
          />
          J’ai lu le document et je l’accepte.
        </label>
        {erreur && (
          <p className="text-sm font-medium text-mtm-error" role="alert">
            {erreur}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={envoi}>
            {envoi ? 'Envoi…' : 'J’accepte'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
