import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientCard, ClientPageHeader } from '../../components/client/shell/ClientUi';
import { ClientDemandesList } from '../../components/client/ClientDemandesSection';
import { NewDemandeModal } from '../../components/client/NewDemandeModal';
import { Button } from '../../components/ui/Button';

/** Messages et demandes de réservation envoyés à MTM, avec leur prise en charge. */
export function ClientDemandesPage() {
  const { demandes, demandesLoading, demandesError } = useClientData();
  const [open, setOpen] = useState(false);
  usePageMetadata({ title: 'Mes demandes' });

  const newRequest = (
    <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      Nouvelle demande
    </Button>
  );

  return (
    <div>
      <ClientPageHeader title="Mes demandes" description="Vos messages et demandes de réservation, et leur prise en charge." action={newRequest} />
      <ClientCard>
        <ClientDemandesList data={demandes} loading={demandesLoading} error={demandesError} emptyAction={newRequest} />
      </ClientCard>
      {open && <NewDemandeModal onClose={() => setOpen(false)} />}
    </div>
  );
}
