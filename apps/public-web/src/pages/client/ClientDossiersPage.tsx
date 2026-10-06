import { FolderOpen, Wallet } from 'lucide-react';
import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientPageHeader, StatTile } from '../../components/client/shell/ClientUi';
import { ClientDossierCard } from '../../components/client/ClientDossierCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LinkButton } from '../../components/ui/LinkButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatMoney } from '../../utils/format';
import { ROUTES } from '../../routes';

/**
 * Tous les dossiers du client : un résumé de ses paiements, puis une carte
 * repliable par dossier (échéancier, paiements, réservation, documents). Avec
 * un seul dossier, il s'ouvre d'emblée.
 */
export function ClientDossiersPage() {
  const { dossiers, dossiersLoading, dossiersError } = useClientData();
  usePageMetadata({ title: 'Mes dossiers' });
  const list = dossiers ?? [];
  const actifs = list.filter((dossier) => dossier.statut !== 'annule');
  const totalPaid = actifs.reduce((sum, dossier) => sum + dossier.montantPaye, 0);
  const totalRemaining = actifs.reduce((sum, dossier) => sum + Math.max(0, (dossier.prixVente ?? 0) - dossier.montantPaye), 0);

  return (
    <div>
      <ClientPageHeader
        title="Mes dossiers"
        description={list.length > 0 ? `${list.length} dossier${list.length > 1 ? 's' : ''} suivi${list.length > 1 ? 's' : ''} par votre conseiller.` : undefined}
      />
      {dossiersLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      )}
      {dossiersError && <EmptyState title="Impossible de charger vos dossiers" description={dossiersError} />}
      {!dossiersLoading && !dossiersError && list.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          title="Aucun dossier pour le moment"
          description="Vos dossiers de vente apparaîtront ici dès qu'un conseiller MTM vous en aura rattaché un."
          action={<LinkButton to={ROUTES.catalog} variant="secondary">Découvrir nos biens</LinkButton>}
        />
      )}
      {!dossiersLoading && !dossiersError && list.length > 0 && (
        <div className="flex flex-col gap-4">
          <section aria-label="Résumé de mes paiements" className="grid grid-cols-2 gap-3">
            <StatTile icon={Wallet} value={formatMoney(totalPaid)} label="Déjà payé" tone="success" />
            <StatTile icon={Wallet} value={formatMoney(totalRemaining)} label="Reste à payer" tone={totalRemaining > 0 ? 'warning' : 'neutral'} />
          </section>
          {list.map((dossier) => (
            <ClientDossierCard key={dossier.id} dossier={dossier} defaultOpen={list.length === 1} />
          ))}
        </div>
      )}
    </div>
  );
}
