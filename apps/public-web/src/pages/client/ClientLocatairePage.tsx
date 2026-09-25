import { useState } from 'react';
import { AlertTriangle, FileText, MessageSquarePlus } from 'lucide-react';
import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientCard, ClientPageHeader } from '../../components/client/shell/ClientUi';
import { NewIncidentModal } from '../../components/client/NewIncidentModal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatDate, formatMoney } from '../../utils/format';
import {
  bailStatus,
  cautionStatus,
  incidentStatus,
  locatifDocumentType,
  loyerEcheanceStatus,
  mouvementCautionType,
  paiementStatus,
  signalementType,
  situationPaiement,
} from '../../utils/labels';

/** Libellé et valeur, alignés en colonne : la brique de lecture de la page. */
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
 * Espace locataire (sections 4 et 15 du cahier des charges) : le bail et son
 * solde, la caution, les échéances, les quittances, les règlements, et les
 * échanges avec MTM — incidents comme demandes.
 */
export function ClientLocatairePage() {
  const {
    locataireBaux,
    locatairePaiements,
    locataireIncidents,
    locataireLoading,
    refetchLocataireIncidents,
  } = useClientData();
  usePageMetadata({ title: 'Ma location' });
  const [signalement, setSignalement] = useState<{ bailId: string; nature: string } | null>(null);
  const baux = locataireBaux ?? [];
  const bailActif = baux.find((b) => b.statut === 'actif' || b.statut === 'preavis') ?? baux[0] ?? null;
  const paiements = locatairePaiements ?? [];
  const echanges = locataireIncidents ?? [];

  if (locataireLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-56 rounded-lg" />
      </div>
    );
  }

  if (!bailActif) {
    return (
      <div className="flex flex-col gap-6">
        <ClientPageHeader title="Ma location" />
        <EmptyState
          title="Aucun bail pour l'instant"
          description="Dès qu'un bail sera enregistré à votre nom, vous retrouverez ici vos échéances, votre caution, vos quittances et vos demandes."
        />
      </div>
    );
  }

  const statut = bailStatus(bailActif.statut);
  const situation = situationPaiement(bailActif.situationPaiement);
  const caution = cautionStatus(bailActif.caution.statut);
  const { solde } = bailActif;

  return (
    <div className="flex flex-col gap-4">
      <ClientPageHeader
        title="Ma location"
        description={[bailActif.bien.adresse, bailActif.bien.commune].filter(Boolean).join(', ')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setSignalement({ bailId: bailActif.id, nature: 'incident' })}>
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Signaler un incident
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSignalement({ bailId: bailActif.id, nature: 'demande' })}
            >
              <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
              Faire une demande
            </Button>
          </div>
        }
      />

      {/* Mon bail : le statut, ce qui est dû, ce qui est réglé, la caution. */}
      <ClientCard title="Mon bail">
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statut.tone}>{statut.label}</Badge>
            <Badge tone={situation.tone}>{situation.label}</Badge>
            <span className="text-xs text-mtm-muted">{bailActif.referenceInterne}</span>
          </div>
          <p className="text-sm text-mtm-muted">{situation.help || statut.help}</p>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Fait
              label="Loyer mensuel"
              value={formatMoney(bailActif.loyerMensuel)}
              hint={bailActif.charges ? `+ ${formatMoney(bailActif.charges)} charges` : undefined}
            />
            <Fait label="Loyers appelés" value={formatMoney(solde.loyersDus)} />
            <Fait label="Loyers réglés" value={formatMoney(solde.loyersRegles)} />
            <Fait
              label={solde.resteADevoir > 0 ? 'Reste à régler' : 'Solde'}
              value={formatMoney(solde.resteADevoir)}
              hint={
                solde.enAttenteDeValidation > 0
                  ? `dont ${formatMoney(solde.enAttenteDeValidation)} en cours de validation`
                  : undefined
              }
            />
          </dl>

          {bailActif.preavisDepartPrevu && (
            <p className="text-sm text-mtm-text">
              Départ prévu le {formatDate(bailActif.preavisDepartPrevu)}.
            </p>
          )}

          {/* Caution : un état en une ligne, le détail au clic. */}
          <div className="border-t border-mtm-border pt-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-mtm-text">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
                  Caution
                </span>
                <span className="ml-2 font-semibold">{formatMoney(bailActif.caution.detenu)}</span>
                <span className="text-mtm-muted"> conservés en dépôt</span>
              </p>
              <Badge tone={caution.tone}>{caution.label}</Badge>
            </div>
            {bailActif.caution.mouvements.length > 0 && (
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-medium text-mtm-primary hover:underline">
                  Détail des mouvements ({bailActif.caution.mouvements.length})
                </summary>
                <ul className="mt-2 flex flex-col gap-1.5 border-l-2 border-mtm-border pl-3">
                  {bailActif.caution.mouvements.map((mouvement) => (
                    <li key={mouvement.id} className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium text-mtm-text">
                        {mouvementCautionType(mouvement.type)}
                      </span>
                      <span className="text-mtm-text">{formatMoney(mouvement.montant)}</span>
                      <span className="text-xs text-mtm-muted">{formatDate(mouvement.date)}</span>
                      {mouvement.justification && (
                        <span className="w-full text-xs text-mtm-muted">{mouvement.justification}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      </ClientCard>

      <ClientCard title="Mes échéances">
        <ul className="-my-1 divide-y divide-mtm-border">
          {bailActif.echeances.map((echeance) => {
            const echeanceStatut = loyerEcheanceStatus(echeance.statut);
            return (
              <li
                key={echeance.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
              >
                <span className="font-medium text-mtm-text">
                  {new Date(echeance.periode).toLocaleDateString('fr-FR', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-mtm-muted">
                  {formatMoney(echeance.montantPaye)} / {formatMoney(echeance.montantPrevu)}
                </span>
                <Badge tone={echeanceStatut.tone}>{echeanceStatut.label}</Badge>
              </li>
            );
          })}
        </ul>
      </ClientCard>

      {bailActif.documents.length > 0 && (
        <ClientCard title="Mes quittances et documents">
          <ul className="-my-1 divide-y divide-mtm-border">
            {bailActif.documents.map((document) => (
              <li key={document.id}>
                <a
                  href={document.secureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 py-2.5 text-sm font-medium text-mtm-text hover:text-mtm-primary"
                >
                  <FileText className="h-4 w-4 flex-none text-mtm-muted" aria-hidden="true" />
                  <span className="truncate">{document.title ?? locatifDocumentType(document.type)}</span>
                  <span className="ml-auto flex-none text-xs font-normal text-mtm-muted">
                    {formatDate(document.createdAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </ClientCard>
      )}

      {paiements.length > 0 && (
        <ClientCard title="Mes règlements">
          <ul className="-my-1 divide-y divide-mtm-border">
            {paiements.map((paiement) => {
              const statutPaiement = paiementStatus(paiement.statut);
              return (
                <li
                  key={paiement.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                >
                  <span className="text-mtm-muted">{formatDate(paiement.datePaiement)}</span>
                  <span className="font-semibold text-mtm-text">{formatMoney(paiement.montant)}</span>
                  <Badge tone={statutPaiement.tone}>{statutPaiement.label}</Badge>
                </li>
              );
            })}
          </ul>
        </ClientCard>
      )}

      {/* Incidents et demandes : un seul fil, chacun étiqueté. */}
      <ClientCard title="Mes échanges avec MTM">
        {echanges.length === 0 ? (
          <p className="text-sm text-mtm-muted">
            Rien en cours. Signalez un incident ou déposez une demande — attestation,
            renouvellement de bail, travaux — et nous vous répondons ici.
          </p>
        ) : (
          <ul className="-my-1 divide-y divide-mtm-border">
            {echanges.map((echange) => {
              const echangeStatut = incidentStatus(echange.statut);
              return (
                <li key={echange.id} className="py-2.5 text-sm">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
                      {echange.nature === 'demande' ? 'Demande' : 'Incident'}
                    </span>
                    <span className="font-medium text-mtm-text">
                      {signalementType(echange.nature, echange.type)}
                    </span>
                    <span className="text-xs text-mtm-muted">{formatDate(echange.createdAt)}</span>
                    <Badge tone={echangeStatut.tone}>{echangeStatut.label}</Badge>
                  </div>
                  <p className="mt-1 text-mtm-muted">{echange.description}</p>
                  {echange.resolutionNotes && (
                    <p className="mt-1 text-xs text-mtm-muted">
                      Réponse MTM : {echange.resolutionNotes}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </ClientCard>

      {signalement && (
        <NewIncidentModal
          bailId={signalement.bailId}
          nature={signalement.nature}
          onClose={() => setSignalement(null)}
          onCreated={refetchLocataireIncidents}
        />
      )}
    </div>
  );
}
