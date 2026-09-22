import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { createClientMission } from '../../api/clientPortal';
import { ApiError } from '../../api/client';
import { useAuth } from '../../contexts/auth-context-store';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';
import { Modal } from '../ui/Modal';
import { TerrainPicker, type TerrainChoice } from './TerrainPicker';

/** Ce que le client peut demander, dans ses mots. */
const TYPES = [
  {
    value: 'verification_fonciere',
    label: 'Vérification complète',
    help: 'Le terrain et sa situation administrative : la formule la plus demandée.',
  },
  {
    value: 'verification_physique',
    label: 'Visite du terrain',
    help: 'Nous allons sur place constater l’état réel et prendre des photos.',
  },
  {
    value: 'verification_administrative',
    label: 'Contrôle des documents',
    help: 'Nous vérifions le titre auprès des administrations compétentes.',
  },
  {
    value: 'accompagnement_achat',
    label: 'Accompagnement à l’achat',
    help: 'Vérification puis accompagnement jusqu’à la signature.',
  },
];

const URGENCES = [
  { value: 'normale', label: 'Pas d’urgence particulière' },
  { value: 'urgente', label: 'Urgent — j’ai une échéance proche' },
  { value: 'tres_urgente', label: 'Très urgent — transaction imminente' },
];

/**
 * Demande de vérification foncière déposée depuis l'espace client
 * (section 14 du cahier des charges). Aucune coordonnée à ressaisir :
 * l'identité vient du compte. MTM chiffre ensuite la mission et revient vers
 * le client — le prix et le délai ne se décident pas ici.
 */
export function NewMissionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { accessToken } = useAuth();
  const [type, setType] = useState(TYPES[0].value);
  const [objectif, setObjectif] = useState('');
  const [terrain, setTerrain] = useState<TerrainChoice | null>(null);
  const [localisation, setLocalisation] = useState('');
  const [commune, setCommune] = useState('');
  const [pieces, setPieces] = useState('');
  const [urgence, setUrgence] = useState('normale');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!accessToken) return;
    const texte = objectif.trim();
    if (texte.length < 10 || texte.length > 2000) {
      setError('Décrivez votre demande en quelques phrases (10 caractères minimum).');
      return;
    }
    if (!terrain && !localisation.trim()) {
      setError('Indiquez le terrain concerné, ou au moins l’endroit où il se trouve.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createClientMission(accessToken, {
        typeVerification: type,
        objectif: texte,
        terrainId: terrain?.id,
        localisation: localisation.trim() || undefined,
        commune: commune.trim() || undefined,
        piecesFournies: pieces.trim() || undefined,
        urgence,
      });
      setSubmitted(true);
      onCreated();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "L'envoi a échoué. Merci de réessayer.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Demander une vérification" onClose={onClose}>
      {submitted ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-mtm-success" aria-hidden="true" />
          <p className="font-semibold text-mtm-text">Demande enregistrée</p>
          <p className="text-sm text-mtm-muted">
            Notre équipe revient vers vous avec le délai et le coût de la mission. Vous suivrez son
            avancement dans cet onglet.
          </p>
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-mtm-text">
              Que souhaitez-vous faire vérifier ?
            </legend>
            <div className="grid grid-cols-1 gap-2">
              {TYPES.map(({ value, label, help }) => (
                <label
                  key={value}
                  className={`flex cursor-pointer flex-col gap-0.5 rounded-md border px-3 py-2.5 transition-colors ${
                    type === value
                      ? 'border-mtm-primary bg-mtm-primary-subtle'
                      : 'border-mtm-border hover:border-mtm-primary/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="mission-type"
                    value={value}
                    checked={type === value}
                    onChange={() => setType(value)}
                    className="sr-only"
                  />
                  <span
                    className={`text-sm font-semibold ${type === value ? 'text-mtm-primary' : 'text-mtm-text'}`}
                  >
                    {label}
                  </span>
                  <span className="text-xs text-mtm-muted">{help}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <FormField label="Terrain de notre catalogue (facultatif)" htmlFor="mission-terrain">
            <TerrainPicker
              id="mission-terrain"
              value={terrain}
              onChange={setTerrain}
              pinned={[]}
              availableOnly={false}
              placeholder="Référence, nom ou commune…"
            />
          </FormField>

          <FormField label="Où se trouve le terrain ?" htmlFor="mission-localisation">
            <input
              id="mission-localisation"
              type="text"
              value={localisation}
              onChange={(event) => setLocalisation(event.target.value)}
              className={fieldInputClass}
              placeholder="Quartier, repère, indication du vendeur"
            />
          </FormField>

          <FormField label="Commune" htmlFor="mission-commune">
            <input
              id="mission-commune"
              type="text"
              value={commune}
              onChange={(event) => setCommune(event.target.value)}
              className={fieldInputClass}
              placeholder="Mbour, Dakar, Saly…"
            />
          </FormField>

          <FormField label="Ce que vous voulez vérifier" htmlFor="mission-objectif" required>
            <textarea
              id="mission-objectif"
              rows={4}
              value={objectif}
              onChange={(event) => setObjectif(event.target.value)}
              className={fieldInputClass}
              placeholder="Ex. : on me propose ce terrain depuis la France. Je veux être sûr qu'il existe, qu'il est libre et que le titre est authentique avant d'envoyer l'argent."
              required
            />
          </FormField>

          <FormField label="Documents dont vous disposez" htmlFor="mission-pieces">
            <input
              id="mission-pieces"
              type="text"
              value={pieces}
              onChange={(event) => setPieces(event.target.value)}
              className={fieldInputClass}
              placeholder="Copie du titre, photos, coordonnées du vendeur…"
            />
          </FormField>

          <FormField label="Votre délai" htmlFor="mission-urgence">
            <select
              id="mission-urgence"
              value={urgence}
              onChange={(event) => setUrgence(event.target.value)}
              className={fieldInputClass}
            >
              {URGENCES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>

          {error && (
            <p role="alert" className="text-sm font-medium text-mtm-error">
              {error}
            </p>
          )}

          <p className="text-xs text-mtm-muted">
            Le coût et le délai vous seront communiqués après étude de votre demande : rien ne vous
            est facturé à cette étape.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Envoi…' : 'Envoyer ma demande'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
