import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { createLocataireResiliation } from '../../api/clientPortal';
import { useAuth } from '../../contexts/auth-context-store';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/toast-store';
import { MOTIFS_RESILIATION } from '../../utils/labels';
import { ajouterJours, aujourdhui } from '../../utils/sejour';
import { formatDate } from '../../utils/format';

/**
 * Demande de résiliation du bail : la date de départ souhaitée, le motif et un
 * mot pour MTM. La demande n'a pas d'effet par elle-même : MTM l'étudie, ouvre le
 * préavis à la date retenue (ou explique son refus) et répond dans l'espace.
 */
export function ResiliationModal({
  bailId,
  preavisJours,
  onClose,
  onCreated,
}: {
  bailId: string;
  preavisJours: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { accessToken } = useAuth();
  const toast = useToast();
  const aujourdHui = aujourdhui();
  const dateHabituelle = ajouterJours(aujourdHui, preavisJours);
  const [dateDepart, setDateDepart] = useState(dateHabituelle);
  const [motif, setMotif] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!accessToken) return;
    if (!dateDepart || dateDepart < aujourdHui) {
      setErreur('Choisissez une date de départ à partir d’aujourd’hui.');
      return;
    }
    setErreur(null);
    setEnvoi(true);
    try {
      await createLocataireResiliation(accessToken, bailId, {
        dateDepartSouhaitee: dateDepart,
        motif: motif || undefined,
        message: message.trim() || undefined,
      });
      onCreated();
      toast.show('Demande envoyée : MTM vous répond dans cet espace');
      onClose();
    } catch (caught) {
      setErreur(caught instanceof ApiError ? caught.message : 'L’envoi a échoué. Merci de réessayer.');
    } finally {
      setEnvoi(false);
    }
  }

  const avantPreavis = dateDepart < dateHabituelle;

  return (
    <Modal title="Demander la résiliation de mon bail" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(event) => void envoyer(event)} noValidate>
        <p className="rounded-xl bg-mtm-bg px-3.5 py-3 text-sm text-mtm-muted">
          Le préavis habituel est de <strong className="text-mtm-text">{preavisJours} jours</strong>, soit un départ au plus tôt
          le <strong className="text-mtm-text">{formatDate(dateHabituelle)}</strong>. MTM étudie votre demande puis vous répond ici ;
          votre bail continue normalement jusqu’à sa réponse.
        </p>

        <FormField label="Date de départ souhaitée" htmlFor="resiliation-date" required>
          <input
            id="resiliation-date"
            type="date"
            className={fieldInputClass}
            min={aujourdHui}
            value={dateDepart}
            onChange={(event) => setDateDepart(event.target.value)}
          />
        </FormField>
        {avantPreavis && (
          <p className="-mt-2 text-xs text-mtm-warning">
            Cette date est avant la fin du préavis habituel : MTM peut la refuser ou la décaler.
          </p>
        )}

        <FormField label="Motif (facultatif)" htmlFor="resiliation-motif">
          <select id="resiliation-motif" className={fieldInputClass} value={motif} onChange={(event) => setMotif(event.target.value)}>
            <option value="">Je préfère ne pas préciser</option>
            {Object.entries(MOTIFS_RESILIATION).map(([valeur, libelle]) => (
              <option key={valeur} value={valeur}>
                {libelle}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Un mot pour MTM (facultatif)" htmlFor="resiliation-message">
          <textarea
            id="resiliation-message"
            rows={3}
            maxLength={2000}
            className={fieldInputClass}
            placeholder="Précisions sur votre départ, état des lieux souhaité…"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </FormField>

        {erreur && (
          <p role="alert" className="rounded-xl bg-mtm-error/10 px-3.5 py-2.5 text-sm font-medium text-mtm-error">
            {erreur}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={envoi}>
            {envoi ? 'Envoi…' : 'Envoyer ma demande'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
