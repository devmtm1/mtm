import { useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientCard, ClientPageHeader, ClientRow } from '../../components/client/shell/ClientUi';
import { ShowMoreButton } from '../../components/client/shell/Disclosure';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { documentIcone } from '../../utils/documentIcon';
import { LIBELLES_ORIGINE, rassemblerDocuments, type OrigineDocument } from '../../utils/clientDocuments';
import { formatDate } from '../../utils/format';
import { documentType, locatifDocumentType } from '../../utils/labels';
import { ROUTES } from '../../routes';

const PAR_PAGE = 8;

/**
 * Tous les documents du client au même endroit : reçus et contrats d'achat, quittances et contrat de bail, relevés de
 * gérance. Chacun reste aussi présenté dans son espace, avec son contexte ; ici on le retrouve sans chercher.
 */
export function ClientDocumentsPage() {
  const { dossiers, dossiersLoading, locataireBaux, locataireLoading, proprietaireDocuments, proprietaireLoading } = useClientData();
  usePageMetadata({ title: 'Mes documents' });
  const [filtre, setFiltre] = useState<OrigineDocument | 'tous'>('tous');
  const [tous, setTous] = useState(false);

  const documents = useMemo(
    () =>
      rassemblerDocuments({
        dossiers,
        baux: locataireBaux,
        releves: proprietaireDocuments,
        liens: { vente: ROUTES.clientDossiers, bail: ROUTES.clientLocataire, releve: ROUTES.clientProprietaire },
      }),
    [dossiers, locataireBaux, proprietaireDocuments],
  );
  const origines = useMemo(() => [...new Set(documents.map((document) => document.origine))], [documents]);
  const filtres = filtre === 'tous' ? documents : documents.filter((document) => document.origine === filtre);
  const visibles = tous ? filtres : filtres.slice(0, PAR_PAGE);
  const chargement = dossiersLoading || locataireLoading || proprietaireLoading;

  return (
    <div className="flex flex-col gap-4">
      <ClientPageHeader
        title="Mes documents"
        description={documents.length > 0 ? `${documents.length} document${documents.length > 1 ? 's' : ''}, du plus récent au plus ancien.` : undefined}
      />

      {chargement && documents.length === 0 && <Skeleton className="h-48 rounded-2xl" />}

      {!chargement && documents.length === 0 && (
        <EmptyState
          icon={FileText}
          title="Aucun document pour le moment"
          description="Vos contrats, reçus, quittances et relevés apparaîtront ici dès que MTM les aura mis à votre disposition."
        />
      )}

      {documents.length > 0 && (
        <>
          {origines.length > 1 && (
            <div role="group" aria-label="Filtrer par espace" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
              {(['tous', ...origines] as const).map((origine) => (
                <button
                  key={origine}
                  type="button"
                  aria-pressed={filtre === origine}
                  onClick={() => {
                    setFiltre(origine);
                    setTous(false);
                  }}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${
                    filtre === origine
                      ? 'border-mtm-primary bg-mtm-primary text-white'
                      : 'border-mtm-border bg-mtm-surface text-mtm-muted hover:border-mtm-primary hover:text-mtm-primary'
                  }`}
                >
                  {origine === 'tous' ? 'Tous' : LIBELLES_ORIGINE[origine]}
                </button>
              ))}
            </div>
          )}

          <ClientCard>
            <ul className="-my-1 divide-y divide-mtm-border/70">
              {visibles.map((document) => (
                <li key={document.id}>
                  <ClientRow
                    href={document.url}
                    icon={documentIcone(document.type)}
                    title={document.titre ?? (document.origine === 'vente' ? documentType(document.type) : locatifDocumentType(document.type))}
                    subtitle={`${LIBELLES_ORIGINE[document.origine]} · ${document.objet} · ${formatDate(document.date)}`}
                    trailing={<Download className="h-4 w-4 shrink-0 text-mtm-primary" aria-label="Télécharger" />}
                  />
                </li>
              ))}
            </ul>
            <ShowMoreButton hiddenCount={filtres.length - visibles.length} expanded={tous} onToggle={() => setTous((ouvert) => !ouvert)} noun="documents" />
          </ClientCard>
        </>
      )}
    </div>
  );
}
