import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { createLocataireIncident } from '../../api/clientPortal';
import { ApiError } from '../../api/client';
import { useAuth } from '../../contexts/auth-context-store';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';
import { Modal } from '../ui/Modal';

const TYPES_INCIDENT = [
  { value: 'plomberie', label: 'Plomberie' },
  { value: 'electricite', label: 'Électricité' },
  { value: 'serrurerie', label: 'Serrurerie' },
  { value: 'autre', label: 'Autre' },
];

const TYPES_DEMANDE = [
  { value: 'renouvellement_bail', label: 'Renouvellement du bail' },
  { value: 'attestation', label: 'Attestation' },
  { value: 'travaux', label: 'Travaux' },
  { value: 'depart', label: 'Départ' },
  { value: 'autre', label: 'Autre' },
];

/**
 * Signalement d'un incident ou dépôt d'une demande (sections 4 et 15 :
 * l'espace locataire couvre « incidents **et demandes** »). Les deux passent
 * par le même formulaire, avec leur propre référentiel de types.
 */
export function NewIncidentModal({
  bailId,
  nature = 'incident',
  onClose,
  onCreated,
}: {
  bailId: string;
  nature?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { accessToken } = useAuth();
  const estDemande = nature === 'demande';
  const types = estDemande ? TYPES_DEMANDE : TYPES_INCIDENT;
  const [type, setType] = useState(types[0].value);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!accessToken) return;
    const texte = description.trim();
    if (texte.length < 5) {
      setError('Décrivez votre situation en quelques mots (5 caractères minimum).');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createLocataireIncident(accessToken, bailId, { nature, type, description: texte });
      setSubmitted(true);
      onCreated();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "L'envoi a échoué. Merci de réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={estDemande ? 'Faire une demande' : 'Signaler un incident'} onClose={onClose}>
      {submitted ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-mtm-success" aria-hidden="true" />
          <p className="font-semibold text-mtm-text">
            {estDemande ? 'Demande transmise' : 'Incident signalé'}
          </p>
          <p className="text-sm text-mtm-muted">Notre équipe a été notifiée et reviendra vers vous.</p>
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <FormField label={estDemande ? 'Objet de la demande' : "Type d'incident"} htmlFor="incident-type">
            <select
              id="incident-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className={fieldInputClass}
            >
              {types.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label={estDemande ? 'Précisez votre demande' : 'Décrivez le problème'}
            htmlFor="incident-description"
            required
          >
            <textarea
              id="incident-description"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={fieldInputClass}
              placeholder={
                estDemande
                  ? 'Ex. : attestation de loyer pour mon employeur'
                  : "Ex. : fuite d'eau sous l'évier de la cuisine depuis hier"
              }
              required
            />
          </FormField>

          {error && (
            <p role="alert" className="text-sm font-medium text-mtm-error">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Envoi…' : estDemande ? 'Envoyer la demande' : 'Signaler'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
