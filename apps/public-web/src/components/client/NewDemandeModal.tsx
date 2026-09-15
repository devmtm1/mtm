import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarCheck, CheckCircle2, Info, MessageSquare } from 'lucide-react';
import { createClientDemande, type ClientDemandeType } from '../../api/clientPortal';
import { ApiError } from '../../api/client';
import { useAuth } from '../../contexts/auth-context-store';
import { useClientData } from '../../contexts/client-data-store';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';
import { Modal } from '../ui/Modal';
import { TerrainPicker, type TerrainChoice } from './TerrainPicker';

const TYPES: { value: ClientDemandeType; label: string; help: string; icon: typeof Info }[] = [
  { value: 'information', label: 'Une question', help: 'Sur un dossier, un paiement, un document…', icon: Info },
  { value: 'visite', label: 'Une visite', help: 'Voir un terrain sur place ou en vidéo.', icon: CalendarCheck },
  { value: 'reservation', label: 'Réserver', help: 'Bloquer un terrain disponible avec un acompte.', icon: MessageSquare },
];

/**
 * Nouvelle demande depuis l'espace client. Aucune coordonnée à ressaisir :
 * l'identité vient du compte, et la demande apparaît aussitôt dans l'onglet
 * « Demandes » avec sa prise en charge.
 */
export function NewDemandeModal({ onClose }: { onClose: () => void }) {
  const { accessToken } = useAuth();
  const { dossiers, refetchDemandes } = useClientData();
  const [type, setType] = useState<ClientDemandeType>('information');
  const [terrain, setTerrain] = useState<TerrainChoice | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Terrains des dossiers du client, proposés en premier dans la recherche.
  const myTerrains = useMemo<TerrainChoice[]>(
    () =>
      (dossiers ?? [])
        .map((dossier) => dossier.terrain)
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .map((item) => ({
          id: item.id,
          referenceInterne: item.referenceInterne,
          nom: item.nom,
          location: [item.commune, item.region].filter(Boolean).join(', ') || undefined,
          mine: true,
        })),
    [dossiers],
  );

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!accessToken) return;
    const text = message.trim();
    if (type === 'reservation' && !terrain) {
      setError('Choisissez le terrain que vous souhaitez réserver.');
      return;
    }
    if (text.length < 10 || text.length > 2000) {
      setError('Votre message doit contenir entre 10 et 2000 caractères.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createClientDemande(accessToken, { type, message: text, terrainId: terrain?.id });
      setSubmitted(true);
      refetchDemandes();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "L'envoi a échoué. Merci de réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Nouvelle demande" onClose={onClose}>
      {submitted ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-mtm-success" aria-hidden="true" />
          <p className="font-semibold text-mtm-text">Demande envoyée</p>
          <p className="text-sm text-mtm-muted">
            Votre conseiller MTM vous répond rapidement. Vous pouvez suivre sa prise en charge dans
            l'onglet « Demandes ».
          </p>
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-mtm-text">Je souhaite…</legend>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(({ value, label, icon: Icon }) => (
                <label
                  key={value}
                  className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-center text-xs font-semibold transition-colors ${
                    type === value
                      ? 'border-mtm-primary bg-mtm-primary-subtle text-mtm-primary'
                      : 'border-mtm-border text-mtm-text hover:border-mtm-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="demande-type"
                    value={value}
                    checked={type === value}
                    onChange={() => {
                      setType(value);
                      // Un terrain d'un dossier ne se réserve pas à nouveau.
                      if (value === 'reservation' && terrain?.mine) setTerrain(null);
                    }}
                    className="sr-only"
                  />
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-mtm-muted">{TYPES.find((item) => item.value === type)?.help}</p>
          </fieldset>

          <FormField
            label={type === 'reservation' ? 'Terrain à réserver' : 'Terrain concerné (facultatif)'}
            htmlFor="demande-terrain"
            required={type === 'reservation'}
          >
            <TerrainPicker
              id="demande-terrain"
              value={terrain}
              onChange={setTerrain}
              pinned={myTerrains}
              availableOnly={type === 'reservation'}
              placeholder={type === 'reservation' ? 'Rechercher un terrain disponible…' : 'Référence, nom ou commune…'}
            />
          </FormField>

          <FormField label="Votre message" htmlFor="demande-message" required>
            <textarea
              id="demande-message"
              rows={4}
              className={fieldInputClass}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                type === 'visite'
                  ? 'Ex. Je suis disponible samedi matin pour une visite.'
                  : type === 'reservation'
                    ? 'Ex. Je souhaite réserver ce terrain et convenir de l’acompte.'
                    : 'Ex. Pouvez-vous me confirmer la date de la prochaine échéance ?'
              }
            />
          </FormField>

          {error && (
            <p className="text-sm font-medium text-mtm-error" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Envoi en cours...' : 'Envoyer la demande'}
          </Button>
        </form>
      )}
    </Modal>
  );
}
