import { Plus } from 'lucide-react';
import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientCard, ClientPageHeader } from '../../components/client/shell/ClientUi';
import { ClientDemandesList } from '../../components/client/ClientDemandesSection';
import { LinkButton } from '../../components/ui/LinkButton';
import { ROUTES } from '../../routes';

/** Messages et demandes de réservation envoyés à MTM, avec leur prise en charge. */
export function ClientDemandesPage() {
  const { demandes, demandesLoading, demandesError } = useClientData();
  usePageMetadata({ title: 'Mes demandes' });

  const newRequest = (
    <LinkButton to={ROUTES.contact} variant="secondary">
      <Plus className="h-4 w-4" aria-hidden="true" />
      Nouvelle demande
    </LinkButton>
  );

  return (
    <div>
      <ClientPageHeader title="Mes demandes" description="Vos messages et demandes de réservation, et leur prise en charge." action={newRequest} />
      <ClientCard>
        <ClientDemandesList data={demandes} loading={demandesLoading} error={demandesError} emptyAction={newRequest} />
      </ClientCard>
    </div>
  );
}
