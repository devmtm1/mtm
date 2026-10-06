import { Building2, FileText, KeyRound, TrendingUp, Wallet } from 'lucide-react';
import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientCard, ClientPageHeader, ClientRow, StatTile } from '../../components/client/shell/ClientUi';
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
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (biens.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <ClientPageHeader title="Mon bien" />
        <EmptyState
          icon={Building2}
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
        <section aria-label="Ma gérance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon={KeyRound} value={`${proprietaireSynthese.loues} / ${proprietaireSynthese.biens}`} label="Biens loués" />
          <StatTile icon={TrendingUp} value={formatMoney(proprietaireSynthese.loyersDus)} label="Loyers appelés" />
          <StatTile icon={Wallet} value={formatMoney(proprietaireSynthese.loyersEncaisses)} label="Encaissés" tone="success" />
          <StatTile
            icon={Wallet}
            value={formatMoney(proprietaireSynthese.solde)}
            label={
              proprietaireSynthese.echeancesImpayees > 0
                ? `À recouvrer · ${proprietaireSynthese.echeancesImpayees} échéance${proprietaireSynthese.echeancesImpayees > 1 ? 's' : ''}`
                : 'À recouvrer'
            }
            tone={proprietaireSynthese.solde > 0 ? 'warning' : 'neutral'}
          />
        </section>
      )}

      {biens.map((bien) => {
        const statutBien = bienLocatifStatus(bien.statut);
        const situation = bien.bail ? situationPaiement(bien.bail.situationPaiement) : null;
        return (
          <ClientCard key={bien.id}>
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2.5 font-display text-base font-bold text-mtm-text">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
                      <Building2 className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
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
          <ul className="-my-1">
            {documents.map((document) => (
              <li key={document.id}>
                <ClientRow
                  href={document.secureUrl}
                  icon={FileText}
                  title={document.title ?? locatifDocumentType(document.type)}
                  subtitle={`${document.bailLocatif.bienLocatif.referenceInterne} · ${formatDate(document.createdAt)}`}
                />
              </li>
            ))}
          </ul>
        </ClientCard>
      )}
    </div>
  );
}
