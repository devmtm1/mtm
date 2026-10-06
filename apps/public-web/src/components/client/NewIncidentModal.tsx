import { useState } from 'react';
import type { FormEvent } from 'react';
import { createLocataireIncident } from '../../api/clientPortal';
import { ApiError } from '../../api/client';
import { useAuth } from '../../contexts/auth-context-store';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/toast-store';

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
  const toast = useToast();
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
      onCreated();
      toast.show(estDemande ? 'Demande transmise : MTM vous répond ici' : 'Incident signalé : notre équipe est prévenue');
      onClose();
      return;
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "L'envoi a échoué. Merci de réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={estDemande ? 'Faire une demande' : 'Signaler un incident'} onClose={onClose}>
        <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-mtm-text">
              {estDemande ? 'Objet de la demande' : "Type d'incident"}
            </legend>
            <div className="flex flex-wrap gap-2">
              {types.map(({ value, label }) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors active:scale-95 ${
                    type === value
                      ? 'border-mtm-primary bg-mtm-primary-subtle text-mtm-primary'
                      : 'border-mtm-border text-mtm-text hover:border-mtm-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="incident-type"
                    value={value}
                    checked={type === value}
                    onChange={() => setType(value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

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
    </Modal>
  );
}
