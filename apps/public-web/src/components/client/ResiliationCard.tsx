import { useState } from 'react';
import { DoorOpen } from 'lucide-react';
import { ApiError } from '../../api/client';
import { cancelLocataireResiliation } from '../../api/clientPortal';
import { useAuth } from '../../contexts/auth-context-store';
import type { ClientBailLocataire, ClientResiliation } from '../../types/locatif';
import { formatDate } from '../../utils/format';
import { motifResiliation, resiliationStatus } from '../../utils/labels';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useToast } from '../ui/toast-store';
import { ClientCard } from './shell/ClientUi';
import { ResiliationModal } from './ResiliationModal';

/**
 * « Quitter mon logement » : la demande de résiliation du locataire, son état
 * (en attente, acceptée avec la date de départ retenue, refusée avec la raison),
 * et le moyen de la retirer tant que MTM ne l'a pas traitée.
 */
export function ResiliationCard({
  bail,
  demandes,
  preavisJours,
  onChanged,
}: {
  bail: ClientBailLocataire;
  demandes: ClientResiliation[];
  preavisJours: number;
  onChanged: () => void;
}) {
  const { accessToken } = useAuth();
  const toast = useToast();
  const [ouvert, setOuvert] = useState(false);
  const [retrait, setRetrait] = useState(false);

  const duBail = demandes.filter((demande) => demande.bailLocatifId === bail.id);
  const enCours = duBail.find((demande) => demande.statut === 'en_attente') ?? null;
  const derniere = duBail[0] ?? null;
  // Un préavis déjà ouvert ou un bail clos : plus rien à demander.
  const peutDemander = bail.statut === 'actif' && !enCours;

  async function retirer(demande: ClientResiliation): Promise<void> {
    if (!accessToken || !window.confirm('Retirer votre demande de résiliation ?')) return;
    setRetrait(true);
    try {
      await cancelLocataireResiliation(accessToken, demande.id);
      onChanged();
      toast.show('Demande retirée');
    } catch (caught) {
      toast.show(caught instanceof ApiError ? caught.message : 'Le retrait a échoué. Merci de réessayer.');
    } finally {
      setRetrait(false);
    }
  }

  if (!peutDemander && !derniere) return null;

  const statut = derniere ? resiliationStatus(derniere.statut) : null;

  return (
    <ClientCard title="Quitter mon logement">
      <div className="flex flex-col gap-3 text-sm">
        {derniere && statut ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-mtm-bg p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-semibold text-mtm-text">
                <DoorOpen className="h-4 w-4 text-mtm-primary" aria-hidden="true" />
                Demande du {formatDate(derniere.dateDemande)}
              </span>
              <Badge tone={statut.tone}>{statut.label}</Badge>
            </div>
            <p className="text-mtm-muted">
              Départ souhaité le {formatDate(derniere.dateDepartSouhaitee)}
              {derniere.motif ? ` · ${motifResiliation(derniere.motif)}` : ''}
            </p>
            {derniere.statut === 'acceptee' && derniere.dateDepartRetenue && (
              <p className="font-semibold text-mtm-success">
                Accepté : votre départ est fixé au {formatDate(derniere.dateDepartRetenue)}. Votre préavis est ouvert.
              </p>
            )}
            {derniere.reponse && (
              <p className="rounded-xl bg-white px-3 py-2 text-xs text-mtm-muted">
                <span className="font-semibold text-mtm-text">Réponse MTM :</span> {derniere.reponse}
              </p>
            )}
            {enCours && (
              <div>
                <Button variant="secondary" className="px-3" disabled={retrait} onClick={() => void retirer(enCours)}>
                  {retrait ? 'Retrait…' : 'Retirer ma demande'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-mtm-muted">
            Vous souhaitez quitter ce logement ? Faites votre demande ici : MTM l’étudie, ouvre le préavis ({preavisJours} jours
            habituellement) et vous répond dans cet espace.
          </p>
        )}
        {peutDemander && (
          <div>
            <Button variant={derniere ? 'secondary' : 'primary'} className="px-4" onClick={() => setOuvert(true)}>
              Demander la résiliation
            </Button>
          </div>
        )}
      </div>

      {ouvert && (
        <ResiliationModal bailId={bail.id} preavisJours={preavisJours} onClose={() => setOuvert(false)} onCreated={onChanged} />
      )}
    </ClientCard>
  );
}
