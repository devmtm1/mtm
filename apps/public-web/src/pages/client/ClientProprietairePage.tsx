import { Building2, FileText } from 'lucide-react';
import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientPageHeader } from '../../components/client/shell/ClientUi';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatDate, formatMoney } from '../../utils/format';
import {
  bienLocatifStatus,
  locatifDocumentType,
  situationPaiement,
} from '../../utils/labels';

/**
 * Espace propriétaire (section 15 du cahier des charges) : les biens confiés,
 * le locataire en place, les loyers appelés, encaissés, le solde restant et les
 * relevés de gestion publiés par MTM.
 *
 * Les dépenses engagées pour le compte du propriétaire relèvent du module
 * comptabilité (J3.1) : elles compléteront ce solde en solde net.
 */
export function ClientProprietairePage() {
  const { proprietaireBiens, proprietaireSynthese, proprietaireDocuments, proprietaireLoading } =
    useClientData();
  usePageMetadata({ title: 'Mon bien' });
  const biens = proprietaireBiens ?? [];
  const documents = proprietaireDocuments ?? [];
  const rapports = documents.filter(
    (document) => document.type === 'releve_gestion' || document.type === 'rapport',
  );
  const autresDocuments = documents.filter(
    (document) => document.type !== 'releve_gestion' && document.type !== 'rapport',
  );

  return (
    <div className="flex flex-col gap-6">
      <ClientPageHeader
        title="Mon bien"
        description={
          biens.length > 0
            ? `${biens.length} bien${biens.length > 1 ? 's' : ''} confié${biens.length > 1 ? 's' : ''} à MTM.`
            : undefined
        }
      />

      {proprietaireLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 rounded-lg" />
        </div>
      )}

      {!proprietaireLoading && biens.length === 0 && (
        <EmptyState
          title="Aucun bien confié pour l'instant"
          description="Dès qu'un bien vous appartenant sera enregistré par MTM, il apparaîtra ici avec le suivi des loyers et votre solde."
        />
      )}

      {/* Synthèse du portefeuille : loyers appelés, encaissés, solde (section 15). */}
      {!proprietaireLoading && proprietaireSynthese && biens.length > 0 && (
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className="rounded-md border border-mtm-border bg-mtm-surface px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">Biens loués</dt>
            <dd className="mt-0.5 font-display text-lg font-bold text-mtm-text">
              {proprietaireSynthese.loues}
              <span className="text-sm font-normal text-mtm-muted"> / {proprietaireSynthese.biens}</span>
            </dd>
          </div>
          <div className="rounded-md border border-mtm-border bg-mtm-surface px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">Loyers appelés</dt>
            <dd className="mt-0.5 font-semibold text-mtm-text">
              {formatMoney(proprietaireSynthese.loyersDus)}
            </dd>
          </div>
          <div className="rounded-md border border-mtm-border bg-mtm-surface px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">Encaissés</dt>
            <dd className="mt-0.5 font-semibold text-mtm-success">
              {formatMoney(proprietaireSynthese.loyersEncaisses)}
            </dd>
          </div>
          <div className="rounded-md border border-mtm-border bg-mtm-surface px-3 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
              Reste à recouvrer
            </dt>
            <dd className="mt-0.5 font-semibold text-mtm-text">
              {formatMoney(proprietaireSynthese.solde)}
              {proprietaireSynthese.echeancesImpayees > 0 && (
                <span className="ml-1 text-xs font-normal text-mtm-muted">
                  ({proprietaireSynthese.echeancesImpayees} échéance
                  {proprietaireSynthese.echeancesImpayees > 1 ? 's' : ''})
                </span>
              )}
            </dd>
          </div>
        </dl>
      )}

      {!proprietaireLoading && biens.length > 0 && (
        <div className="flex flex-col gap-4">
          {biens.map((bien) => {
            const statutBien = bienLocatifStatus(bien.statut);
            const situation = bien.bail ? situationPaiement(bien.bail.situationPaiement) : null;
            return (
              <article
                key={bien.id}
                className="overflow-hidden rounded-lg border border-mtm-border bg-mtm-surface shadow-card"
              >
                <header className="flex flex-col gap-2 border-b border-mtm-border px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
                      {bien.referenceInterne}
                    </p>
                    <h3 className="mt-0.5 flex items-center gap-2 font-display text-lg font-bold text-mtm-text">
                      <Building2 className="h-5 w-5 text-mtm-primary" aria-hidden="true" />
                      {bien.adresse}
                    </h3>
                    <p className="mt-1 text-sm text-mtm-muted">
                      {[bien.commune, bien.region].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <div className="flex flex-none flex-wrap gap-2">
                    <Badge tone={statutBien.tone}>{statutBien.label}</Badge>
                    {situation && <Badge tone={situation.tone}>{situation.label}</Badge>}
                  </div>
                </header>
                <div className="px-4 py-4 sm:px-5">
                  {bien.bail ? (
                    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                      <div className="rounded-md bg-mtm-bg px-3 py-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
                          Locataire
                        </dt>
                        <dd className="mt-0.5 font-semibold text-mtm-text">{bien.bail.locataire ?? '—'}</dd>
                      </div>
                      <div className="rounded-md bg-mtm-bg px-3 py-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
                          Loyer mensuel
                        </dt>
                        <dd className="mt-0.5 font-semibold text-mtm-text">
                          {formatMoney(bien.bail.loyerMensuel)}
                        </dd>
                      </div>
                      <div className="rounded-md bg-mtm-bg px-3 py-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
                          Loyers appelés
                        </dt>
                        <dd className="mt-0.5 font-semibold text-mtm-text">
                          {formatMoney(bien.bail.loyersDus)}
                        </dd>
                      </div>
                      <div className="rounded-md bg-mtm-bg px-3 py-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
                          Loyers encaissés
                        </dt>
                        <dd className="mt-0.5 font-semibold text-mtm-success">
                          {formatMoney(bien.bail.loyersEncaisses)}
                        </dd>
                      </div>
                      <div className="rounded-md bg-mtm-bg px-3 py-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
                          Solde restant
                        </dt>
                        <dd className="mt-0.5 font-semibold text-mtm-text">
                          {formatMoney(bien.bail.solde)}
                        </dd>
                      </div>
                      {bien.bail.preavisDepartPrevu && (
                        <div className="rounded-md bg-mtm-bg px-3 py-2">
                          <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
                            Départ prévu
                          </dt>
                          <dd className="mt-0.5 font-semibold text-mtm-text">
                            {formatDate(bien.bail.preavisDepartPrevu)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="text-sm text-mtm-muted">Aucun bail en cours sur ce bien.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Relevés de gestion : les « rapports » attendus par le backlog J2.1. */}
      {rapports.length > 0 && (
        <div>
          <h2 className="mb-2 font-display text-base font-bold text-mtm-text">Relevés de gestion</h2>
          <ul className="flex flex-col gap-1.5">
            {rapports.map((document) => (
              <li key={document.id}>
                <a
                  href={document.secureUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md border border-mtm-border px-3 py-2 text-sm font-medium text-mtm-text transition-colors hover:border-mtm-primary hover:text-mtm-primary"
                >
                  <FileText className="h-4 w-4 flex-none text-mtm-primary" aria-hidden="true" />
                  <span className="truncate">
                    {document.title ?? locatifDocumentType(document.type)}
                    <span className="ml-1 text-xs font-normal text-mtm-muted">
                      {document.bailLocatif.bienLocatif.referenceInterne}
                    </span>
                  </span>
                  <span className="ml-auto flex-none text-xs text-mtm-muted">
                    {formatDate(document.createdAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {autresDocuments.length > 0 && (
        <div>
          <h2 className="mb-2 font-display text-base font-bold text-mtm-text">Documents</h2>
          <ul className="flex flex-col gap-1.5">
            {autresDocuments.map((document) => (
              <li key={document.id}>
                <a
                  href={document.secureUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md border border-mtm-border px-3 py-2 text-sm font-medium text-mtm-text transition-colors hover:border-mtm-primary hover:text-mtm-primary"
                >
                  <FileText className="h-4 w-4 flex-none text-mtm-muted" aria-hidden="true" />
                  <span className="truncate">
                    {document.title ?? locatifDocumentType(document.type)}
                  </span>
                  <span className="ml-auto flex-none text-xs text-mtm-muted">
                    {formatDate(document.createdAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
