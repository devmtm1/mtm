import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { createClientMission } from '../../api/clientPortal';
import { ApiError } from '../../api/client';
import { useAuth } from '../../contexts/auth-context-store';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/toast-store';
import { ProgressBar } from './shell/ClientUi';
import { TerrainPicker, type TerrainChoice } from './TerrainPicker';

/** Ce que le client peut demander, dans ses mots. */
const TYPES = [
  {
    value: 'verification_fonciere',
    label: 'Vérification complète',
    help: 'Le bien et sa situation administrative : la formule la plus demandée.',
  },
  {
    value: 'verification_physique',
    label: 'Visite sur place',
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

const ETAPES = ['Votre besoin', 'Le bien', 'Les détails'] as const;

/**
 * Demande de vérification foncière déposée depuis l'espace client
 * (section 14 du cahier des charges), en trois courtes étapes : ce que l'on
 * veut faire vérifier, où se trouve le bien, puis les détails. Aucune
 * coordonnée à ressaisir : l'identité vient du compte. MTM chiffre ensuite la
 * mission et revient vers le client — le prix et le délai ne se décident pas ici.
 */
export function NewMissionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { accessToken } = useAuth();
  const toast = useToast();
  const [etape, setEtape] = useState(0);
  const [type, setType] = useState(TYPES[0].value);
  const [objectif, setObjectif] = useState('');
  const [terrain, setTerrain] = useState<TerrainChoice | null>(null);
  const [localisation, setLocalisation] = useState('');
  const [commune, setCommune] = useState('');
  const [region, setRegion] = useState('');
  const [budget, setBudget] = useState('');
  const [pieces, setPieces] = useState('');
  const [urgence, setUrgence] = useState('normale');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const derniere = etape === ETAPES.length - 1;

  /** Ce qui bloque le passage à l'étape suivante, dit en une phrase. */
  function problemeEtape(numero: number): string | null {
    if (numero === 1 && !terrain && !localisation.trim()) {
      return 'Indiquez le bien concerné, ou au moins l’endroit où il se trouve.';
    }
    if (numero === 2) {
      const texte = objectif.trim();
      if (texte.length < 10 || texte.length > 2000) {
        return 'Décrivez votre demande en quelques phrases (10 caractères minimum).';
      }
    }
    return null;
  }

  function suivant(): void {
    const probleme = problemeEtape(etape);
    if (probleme) {
      setError(probleme);
      return;
    }
    setError(null);
    setEtape((courante) => Math.min(courante + 1, ETAPES.length - 1));
  }

  function retour(): void {
    setError(null);
    setEtape((courante) => Math.max(courante - 1, 0));
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!derniere) {
      suivant();
      return;
    }
    if (!accessToken) return;
    const probleme = problemeEtape(1) ?? problemeEtape(2);
    if (probleme) {
      setError(probleme);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const budgetSaisi = budget.trim() ? Number(budget) : undefined;
      await createClientMission(accessToken, {
        typeVerification: type,
        objectif: objectif.trim(),
        terrainId: terrain?.id,
        localisation: localisation.trim() || undefined,
        commune: commune.trim() || undefined,
        region: region.trim() || undefined,
        piecesFournies: pieces.trim() || undefined,
        urgence,
        budgetAnnonce:
          budgetSaisi !== undefined && Number.isFinite(budgetSaisi) ? budgetSaisi : undefined,
      });
      onCreated();
      toast.show('Demande enregistrée : MTM revient vers vous avec le délai et le coût');
      onClose();
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
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <div>
          <p className="text-xs font-semibold text-mtm-muted">
            Étape {etape + 1} sur {ETAPES.length} · {ETAPES[etape]}
          </p>
          <ProgressBar
            className="mt-1.5"
            value={((etape + 1) / ETAPES.length) * 100}
            label={`Étape ${etape + 1} sur ${ETAPES.length}`}
            tone="primary"
          />
        </div>

        {etape === 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-mtm-text">
              Que souhaitez-vous faire vérifier ?
            </legend>
            <div className="grid grid-cols-1 gap-2">
              {TYPES.map(({ value, label, help }) => (
                <label
                  key={value}
                  className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border px-3.5 py-3 transition-colors active:scale-[0.99] ${
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
        )}

        {etape === 1 && (
          <>
            <FormField label="Bien de notre catalogue (facultatif)" htmlFor="mission-terrain">
              <TerrainPicker
                id="mission-terrain"
                value={terrain}
                onChange={setTerrain}
                pinned={[]}
                availableOnly={false}
                placeholder="Référence, nom ou commune…"
              />
            </FormField>

            <FormField label="Où se trouve le bien ?" htmlFor="mission-localisation">
              <input
                id="mission-localisation"
                type="text"
                value={localisation}
                onChange={(event) => setLocalisation(event.target.value)}
                className={fieldInputClass}
                placeholder="Quartier, repère, indication du vendeur"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Commune" htmlFor="mission-commune">
                <input
                  id="mission-commune"
                  type="text"
                  value={commune}
                  onChange={(event) => setCommune(event.target.value)}
                  className={fieldInputClass}
                  placeholder="Mbour, Saly…"
                />
              </FormField>
              <FormField label="Région" htmlFor="mission-region">
                <input
                  id="mission-region"
                  type="text"
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className={fieldInputClass}
                  placeholder="Thiès, Dakar…"
                />
              </FormField>
            </div>
          </>
        )}

        {etape === 2 && (
          <>
            <FormField label="Ce que vous voulez vérifier" htmlFor="mission-objectif" required>
              <textarea
                id="mission-objectif"
                rows={4}
                value={objectif}
                onChange={(event) => setObjectif(event.target.value)}
                className={fieldInputClass}
                placeholder="Ex. : on me propose ce bien depuis la France. Je veux être sûr qu'il existe, qu'il est libre et que le titre est authentique avant d'envoyer l'argent."
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

            <FormField label="Votre budget d'achat (facultatif)" htmlFor="mission-budget">
              <input
                id="mission-budget"
                type="number"
                min={0}
                inputMode="numeric"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                className={fieldInputClass}
                placeholder="En FCFA"
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

            <p className="text-xs text-mtm-muted">
              Le coût et le délai vous seront communiqués après étude de votre demande : rien ne vous
              est facturé à cette étape.
            </p>
          </>
        )}

        {error && (
          <p role="alert" className="text-sm font-medium text-mtm-error">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          {etape > 0 ? (
            <Button variant="secondary" type="button" onClick={retour} className="px-4">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Retour
            </Button>
          ) : (
            <Button variant="secondary" type="button" onClick={onClose} className="px-4">
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={submitting} className="flex-1">
            {derniere ? (submitting ? 'Envoi…' : 'Envoyer ma demande') : 'Continuer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
