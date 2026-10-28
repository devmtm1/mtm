import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  // Venu de « Une question sur ce bien » : la demande s'ouvre déjà orientée sur ce bien.
  const [params, setParams] = useSearchParams();
  const bienEvoque = params.get('bien');
  const [open, setOpen] = useState(bienEvoque !== null);
  usePageMetadata({ title: 'Mes demandes' });
  // Sans demande, l'état vide porte déjà le bouton : pas de second bouton juste au-dessus.
  const aDesDemandes = (demandes?.messages.length ?? 0) + (demandes?.reservations.length ?? 0) > 0;

  const newRequest = (
    <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      Nouvelle demande
    </Button>
  );

  return (
    <div>
      <ClientPageHeader
        title="Mes demandes"
        description="Vos messages et demandes de réservation, et leur prise en charge."
        action={aDesDemandes ? newRequest : undefined}
      />
      <ClientCard>
        <ClientDemandesList data={demandes} loading={demandesLoading} error={demandesError} emptyAction={newRequest} />
      </ClientCard>
      {open && (
        <NewDemandeModal
          initialMessage={bienEvoque ? `À propos du bien ${bienEvoque} : ` : ''}
          onClose={() => {
            setOpen(false);
            if (bienEvoque) setParams({}, { replace: true });
          }}
        />
      )}
    </div>
  );
}
