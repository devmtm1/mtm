import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientPageHeader } from '../../components/client/shell/ClientUi';
import { ClientMissionCard } from '../../components/client/ClientMissionCard';
import { NewMissionModal } from '../../components/client/NewMissionModal';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { LinkButton } from '../../components/ui/LinkButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { ROUTES } from '../../routes';

/**
 * Les vérifications foncières demandées par le client : où elles en sont,
 * ce que MTM a conclu, et le rapport à télécharger (section 14 du cahier
 * des charges : « le rapport doit être accessible depuis son espace »).
 */
export function ClientMissionsPage() {
  const { missions, missionsLoading, missionsError, refetchMissions } = useClientData();
  const [demandeOuverte, setDemandeOuverte] = useState(false);
  usePageMetadata({ title: 'Mes vérifications' });
  const list = missions ?? [];

  return (
    <div>
      <ClientPageHeader
        title="Mes vérifications"
        description={
          list.length > 0
            ? `${list.length} mission${list.length > 1 ? 's' : ''} de vérification foncière.`
            : undefined
        }
        action={
          <Button onClick={() => setDemandeOuverte(true)}>
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Demander une vérification
          </Button>
        }
      />
      {missionsLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      )}
      {missionsError && (
        <EmptyState title="Impossible de charger vos vérifications" description={missionsError} />
      )}
      {!missionsLoading && !missionsError && list.length === 0 && (
        <EmptyState
          title="Aucune vérification en cours"
          description="Vous pouvez nous confier la vérification d'un terrain avant d'acheter : visite sur place, contrôle des documents auprès des administrations, puis rapport écrit."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setDemandeOuverte(true)}>Demander une vérification</Button>
              <LinkButton to={ROUTES.demarches} variant="secondary">
                En savoir plus
              </LinkButton>
            </div>
          }
        />
      )}
      {!missionsLoading && !missionsError && list.length > 0 && (
        <div className="flex flex-col gap-4">
          {list.map((mission) => (
            <ClientMissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      )}
      {demandeOuverte && (
        <NewMissionModal
          onClose={() => setDemandeOuverte(false)}
          onCreated={refetchMissions}
        />
      )}
    </div>
  );
}
