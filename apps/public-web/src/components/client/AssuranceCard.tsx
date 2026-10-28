import { useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ShieldPlus } from 'lucide-react';
import { ApiError } from '../../api/client';
import { deposerAssurance } from '../../api/clientPortal';
import { useAuth } from '../../contexts/auth-context-store';
import { useClientData } from '../../contexts/client-data-store';
import type { ClientAssurance } from '../../types/locatif';
import { etatAssurance, verifierDepot } from '../../utils/assurance';
import { formatDate } from '../../utils/format';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/toast-store';
import { ClientCard } from './shell/ClientUi';

function FormulaireDepot({ onClose }: { onClose: () => void }) {
  const { accessToken } = useAuth();
  const { refetchLocataireBaux } = useClientData();
  const toast = useToast();
  const champFichier = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [dateExpiration, setDateExpiration] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!accessToken) return;
    const probleme = verifierDepot(fichier, dateExpiration);
    if (probleme || !fichier) {
      setErreur(probleme);
      return;
    }
    setErreur(null);
    setEnvoi(true);
    try {
      await deposerAssurance(accessToken, fichier, dateExpiration);
      refetchLocataireBaux?.();
      toast.show('Attestation envoyée : MTM la vérifie');
      onClose();
    } catch (caught) {
      setErreur(caught instanceof ApiError ? caught.message : 'L’envoi a échoué. Réessayez dans un instant.');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void soumettre(event)}>
      <p className="text-sm text-mtm-muted">
        Déposez l’attestation délivrée par votre assureur (PDF ou photo lisible). MTM la vérifie, puis vous prévient.
      </p>
      <FormField label="Attestation d’assurance" htmlFor="assurance-fichier" required>
        <input
          id="assurance-fichier"
          ref={champFichier}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className={`${fieldInputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-mtm-primary-subtle file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-mtm-primary`}
          onChange={(event) => setFichier(event.target.files?.[0] ?? null)}
        />
      </FormField>
      <FormField label="Valable jusqu’au" htmlFor="assurance-date" required>
        <input
          id="assurance-date"
          type="date"
          className={fieldInputClass}
          value={dateExpiration}
          onChange={(event) => setDateExpiration(event.target.value)}
        />
      </FormField>
      {erreur && (
        <p className="text-sm font-medium text-mtm-error" role="alert">
          {erreur}
        </p>
      )}
      <Button type="submit" disabled={envoi}>
        {envoi ? 'Envoi…' : 'Envoyer mon attestation'}
      </Button>
    </form>
  );
}

/**
 * Assurance habitation du locataire : où en est son attestation, et le moyen d'en déposer une. Le bailleur exige
 * cette pièce ; plutôt que de la réclamer par message, le locataire la dépose ici et suit son contrôle.
 */
export function AssuranceCard({ assurance }: { assurance: ClientAssurance | null | undefined }) {
  const [ouvert, setOuvert] = useState(false);
  const etat = etatAssurance(assurance);

  const presentation = (() => {
    switch (etat.code) {
      case 'aucune':
        return {
          icone: ShieldPlus,
          teinte: 'bg-mtm-warning/10 text-mtm-warning',
          badge: <Badge tone="warning">À déposer</Badge>,
          texte: 'Votre bail prévoit une assurance habitation. Déposez votre attestation pour que MTM puisse la valider.',
          action: 'Déposer mon attestation',
        };
      case 'en_attente':
        return {
          icone: Clock,
          teinte: 'bg-mtm-primary-subtle text-mtm-primary',
          badge: <Badge tone="info">En cours de vérification</Badge>,
          texte: assurance ? `Reçue le ${formatDate(assurance.deposeLe)}. MTM la vérifie et vous prévient.` : '',
          action: null,
        };
      case 'valide':
        return {
          icone: etat.bientotExpiree ? AlertTriangle : CheckCircle2,
          teinte: etat.bientotExpiree ? 'bg-mtm-warning/10 text-mtm-warning' : 'bg-mtm-success/10 text-mtm-success',
          badge: <Badge tone={etat.bientotExpiree ? 'warning' : 'success'}>{etat.bientotExpiree ? 'Bientôt à renouveler' : 'Valide'}</Badge>,
          texte: assurance?.dateExpiration
            ? `Valable jusqu’au ${formatDate(assurance.dateExpiration)}${etat.bientotExpiree && etat.joursRestants !== null ? ` (dans ${etat.joursRestants} jour${etat.joursRestants > 1 ? 's' : ''})` : ''}.`
            : 'Votre attestation est validée.',
          action: etat.bientotExpiree ? 'Renouveler mon attestation' : null,
        };
      case 'expiree':
        return {
          icone: AlertTriangle,
          teinte: 'bg-mtm-accent-subtle text-mtm-accent',
          badge: <Badge tone="accent">Expirée</Badge>,
          texte: assurance?.dateExpiration ? `Elle était valable jusqu’au ${formatDate(assurance.dateExpiration)}. Déposez la nouvelle attestation.` : 'Déposez la nouvelle attestation.',
          action: 'Déposer une nouvelle attestation',
        };
      case 'rejetee':
        return {
          icone: AlertTriangle,
          teinte: 'bg-mtm-accent-subtle text-mtm-accent',
          badge: <Badge tone="accent">Refusée</Badge>,
          texte: etat.motif ? `Motif : ${etat.motif}` : 'MTM n’a pas pu valider cette attestation.',
          action: 'Déposer une nouvelle attestation',
        };
    }
  })();
  const Icone = presentation.icone;

  return (
    <ClientCard title="Assurance habitation">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${presentation.teinte}`}>
          <Icone className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {presentation.badge}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-mtm-muted">{presentation.texte}</p>
          {presentation.action && (
            <Button className="mt-3 w-full sm:w-auto" variant={etat.code === 'aucune' ? 'primary' : 'secondary'} onClick={() => setOuvert(true)}>
              {presentation.action}
            </Button>
          )}
        </div>
      </div>
      {ouvert && (
        <Modal title="Mon attestation d’assurance" onClose={() => setOuvert(false)}>
          <FormulaireDepot onClose={() => setOuvert(false)} />
        </Modal>
      )}
    </ClientCard>
  );
}
