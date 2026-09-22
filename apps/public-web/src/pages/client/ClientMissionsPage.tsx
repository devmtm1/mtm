import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientPageHeader } from '../../components/client/shell/ClientUi';
import { ClientMissionCard } from '../../components/client/ClientMissionCard';
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
  const { missions, missionsLoading, missionsError } = useClientData();
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
            <LinkButton to={ROUTES.demarches} variant="secondary">
              En savoir plus
            </LinkButton>
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
    </div>
  );
}
