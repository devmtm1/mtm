import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientPageHeader } from '../../components/client/shell/ClientUi';
import { ClientDossierCard } from '../../components/client/ClientDossierCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LinkButton } from '../../components/ui/LinkButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { ROUTES } from '../../routes';

/** Tous les dossiers du client, dans le détail : paiements, échéancier, réservation, documents. */
export function ClientDossiersPage() {
  const { dossiers, dossiersLoading, dossiersError } = useClientData();
  usePageMetadata({ title: 'Mes dossiers' });
  const list = dossiers ?? [];

  return (
    <div>
      <ClientPageHeader
        title="Mes dossiers"
        description={list.length > 0 ? `${list.length} dossier${list.length > 1 ? 's' : ''} suivi${list.length > 1 ? 's' : ''} par votre conseiller.` : undefined}
      />
      {dossiersLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      )}
      {dossiersError && <EmptyState title="Impossible de charger vos dossiers" description={dossiersError} />}
      {!dossiersLoading && !dossiersError && list.length === 0 && (
        <EmptyState
          title="Aucun dossier pour le moment"
          description="Vos dossiers de vente apparaîtront ici dès qu'un conseiller MTM vous en aura rattaché un."
          action={<LinkButton to={ROUTES.catalog} variant="secondary">Découvrir les terrains</LinkButton>}
        />
      )}
      {!dossiersLoading && !dossiersError && list.length > 0 && (
        <div className="flex flex-col gap-4">
          {list.map((dossier) => (
            <ClientDossierCard key={dossier.id} dossier={dossier} />
          ))}
        </div>
      )}
    </div>
  );
}
