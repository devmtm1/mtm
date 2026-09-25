import { Building2, FileText } from 'lucide-react';
import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientCard, ClientPageHeader } from '../../components/client/shell/ClientUi';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatDate, formatMoney } from '../../utils/format';
import { bienLocatifStatus, locatifDocumentType, situationPaiement } from '../../utils/labels';

/** Libellé et valeur, alignés en colonne. */
function Fait({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-mtm-text">
        {value}
        {hint && <span className="ml-1 text-xs font-normal text-mtm-muted">{hint}</span>}
      </dd>
    </div>
  );
}

/**
 * Espace propriétaire (section 15 du cahier des charges) : les biens confiés,
 * le locataire en place, les loyers appelés et encaissés, le solde restant et
 * les relevés de gestion publiés par MTM.
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

  if (proprietaireLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (biens.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <ClientPageHeader title="Mon bien" />
        <EmptyState
          title="Aucun bien confié pour l'instant"
          description="Dès qu'un bien vous appartenant sera enregistré par MTM, il apparaîtra ici avec le suivi des loyers et votre solde."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ClientPageHeader
        title="Mon bien"
        description={`${biens.length} bien${biens.length > 1 ? 's' : ''} confié${biens.length > 1 ? 's' : ''} à MTM.`}
      />

      {/* Le portefeuille en quatre chiffres. */}
      {proprietaireSynthese && (
        <ClientCard title="Ma gérance">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Fait
              label="Biens loués"
              value={`${proprietaireSynthese.loues} / ${proprietaireSynthese.biens}`}
            />
            <Fait label="Loyers appelés" value={formatMoney(proprietaireSynthese.loyersDus)} />
            <Fait label="Encaissés" value={formatMoney(proprietaireSynthese.loyersEncaisses)} />
            <Fait
              label="Reste à recouvrer"
              value={formatMoney(proprietaireSynthese.solde)}
              hint={
                proprietaireSynthese.echeancesImpayees > 0
                  ? `${proprietaireSynthese.echeancesImpayees} échéance${proprietaireSynthese.echeancesImpayees > 1 ? 's' : ''}`
                  : undefined
              }
            />
          </dl>
        </ClientCard>
      )}

      {biens.map((bien) => {
        const statutBien = bienLocatifStatus(bien.statut);
        const situation = bien.bail ? situationPaiement(bien.bail.situationPaiement) : null;
        return (
          <ClientCard key={bien.id}>
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 font-display text-base font-bold text-mtm-text">
                    <Building2 className="h-4 w-4 flex-none text-mtm-primary" aria-hidden="true" />
                    {bien.adresse}
                  </h2>
                  <p className="mt-0.5 text-sm text-mtm-muted">
                    {[bien.commune, bien.region].filter(Boolean).join(', ')} · {bien.referenceInterne}
                  </p>
                </div>
                <div className="flex flex-none flex-wrap gap-2">
                  <Badge tone={statutBien.tone}>{statutBien.label}</Badge>
                  {situation && <Badge tone={situation.tone}>{situation.label}</Badge>}
                </div>
              </div>

              {bien.bail ? (
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <Fait label="Locataire" value={bien.bail.locataire ?? '—'} />
                  <Fait label="Loyer mensuel" value={formatMoney(bien.bail.loyerMensuel)} />
                  <Fait label="Encaissé" value={formatMoney(bien.bail.loyersEncaisses)} />
                  <Fait
                    label="Solde"
                    value={formatMoney(bien.bail.solde)}
                    hint={
                      bien.bail.preavisDepartPrevu
                        ? `départ le ${formatDate(bien.bail.preavisDepartPrevu)}`
                        : undefined
                    }
                  />
                </dl>
              ) : (
                <p className="text-sm text-mtm-muted">Aucun bail en cours sur ce bien.</p>
              )}
            </div>
          </ClientCard>
        );
      })}

      {documents.length > 0 && (
        <ClientCard title="Mes relevés et documents">
          <ul className="-my-1 divide-y divide-mtm-border">
            {documents.map((document) => (
              <li key={document.id}>
                <a
                  href={document.secureUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 py-2.5 text-sm font-medium text-mtm-text hover:text-mtm-primary"
                >
                  <FileText className="h-4 w-4 flex-none text-mtm-muted" aria-hidden="true" />
                  <span className="truncate">
                    {document.title ?? locatifDocumentType(document.type)}
                    <span className="ml-1 text-xs font-normal text-mtm-muted">
                      {document.bailLocatif.bienLocatif.referenceInterne}
                    </span>
                  </span>
                  <span className="ml-auto flex-none text-xs font-normal text-mtm-muted">
                    {formatDate(document.createdAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </ClientCard>
      )}
    </div>
  );
}
