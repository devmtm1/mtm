import { useState } from 'react';
import { AlertTriangle, FileText, KeyRound, PiggyBank } from 'lucide-react';
import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientPageHeader } from '../../components/client/shell/ClientUi';
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

/**
 * Espace locataire (sections 4 et 15 du cahier des charges) : le bail, son
 * solde, les échéances, la caution et son historique, les quittances publiées,
 * les paiements, puis les incidents et demandes adressés à MTM.
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
  const signalements = locataireIncidents ?? [];
  const incidents = signalements.filter((item) => item.nature !== 'demande');
  const demandes = signalements.filter((item) => item.nature === 'demande');

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

  return (
    <div className="flex flex-col gap-6">
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
              <FileText className="h-4 w-4" aria-hidden="true" />
              Faire une demande
            </Button>
          </div>
        }
      />

      <article className="overflow-hidden rounded-lg border border-mtm-border bg-mtm-surface shadow-card">
        <header className="flex flex-col gap-2 border-b border-mtm-border px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
              {bailActif.referenceInterne}
            </p>
            <h3 className="mt-0.5 flex items-center gap-2 font-display text-lg font-bold text-mtm-text">
              <KeyRound className="h-5 w-5 text-mtm-primary" aria-hidden="true" />
              {bailActif.bien.adresse}
            </h3>
          </div>
          <div className="flex flex-none flex-wrap gap-2">
            <Badge tone={statut.tone}>{statut.label}</Badge>
            <Badge tone={situation.tone}>{situation.label}</Badge>
          </div>
        </header>
        <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
          <p className="text-sm text-mtm-muted">{situation.help || statut.help}</p>
          {bailActif.preavisDepartPrevu && (
            <p className="text-sm text-mtm-text">
              Départ prévu le {formatDate(bailActif.preavisDepartPrevu)}
            </p>
          )}
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-md bg-mtm-bg px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">Loyer mensuel</dt>
              <dd className="mt-0.5 font-semibold text-mtm-text">{formatMoney(bailActif.loyerMensuel)}</dd>
            </div>
            {bailActif.charges !== null && (
              <div className="rounded-md bg-mtm-bg px-3 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">Charges</dt>
                <dd className="mt-0.5 font-semibold text-mtm-text">{formatMoney(bailActif.charges)}</dd>
              </div>
            )}
            <div className="rounded-md bg-mtm-bg px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">Loyers appelés</dt>
              <dd className="mt-0.5 font-semibold text-mtm-text">
                {formatMoney(bailActif.solde.loyersDus)}
              </dd>
            </div>
            <div className="rounded-md bg-mtm-bg px-3 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">Loyers réglés</dt>
              <dd className="mt-0.5 font-semibold text-mtm-text">
                {formatMoney(bailActif.solde.loyersRegles)}
              </dd>
            </div>
            <div className="rounded-md bg-mtm-bg px-3 py-2 sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
                {bailActif.solde.resteADevoir > 0 ? 'Reste à régler' : 'Solde'}
              </dt>
              <dd className="mt-0.5 font-semibold text-mtm-text">
                {formatMoney(bailActif.solde.resteADevoir)}
                {bailActif.solde.enAttenteDeValidation > 0 && (
                  <span className="ml-2 text-xs font-normal text-mtm-muted">
                    dont {formatMoney(bailActif.solde.enAttenteDeValidation)} en cours de validation
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </article>

      {/* Caution : exigée dans l'espace locataire par la section 4. */}
      <div>
        <h2 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-mtm-text">
          <PiggyBank className="h-4 w-4 text-mtm-primary" aria-hidden="true" />
          Ma caution
        </h2>
        <div className="rounded-lg border border-mtm-border bg-mtm-surface px-4 py-3.5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-mtm-text">
              <span className="font-semibold">{formatMoney(bailActif.caution.detenu)}</span> conservés
              en dépôt
              {bailActif.caution.montantPrevu > 0 && (
                <span className="text-mtm-muted">
                  {' '}
                  · prévue au bail {formatMoney(bailActif.caution.montantPrevu)}
                </span>
              )}
            </p>
            <Badge tone={caution.tone}>{caution.label}</Badge>
          </div>
          <p className="mt-1 text-xs text-mtm-muted">{caution.help}</p>
          {bailActif.caution.mouvements.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5 border-t border-mtm-border pt-3">
              {bailActif.caution.mouvements.map((mouvement) => (
                <li key={mouvement.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-semibold text-mtm-text">
                    {mouvementCautionType(mouvement.type)}
                  </span>
                  <span className="text-mtm-text">{formatMoney(mouvement.montant)}</span>
                  <span className="text-mtm-muted">{formatDate(mouvement.date)}</span>
                  {mouvement.justification && (
                    <span className="w-full text-xs text-mtm-muted">{mouvement.justification}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-display text-base font-bold text-mtm-text">Échéances</h2>
        <ul className="flex flex-col gap-1.5">
          {bailActif.echeances.map((echeance) => {
            const echeanceStatut = loyerEcheanceStatus(echeance.statut);
            return (
              <li
                key={echeance.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-mtm-border bg-mtm-surface px-3 py-2.5 text-sm"
              >
                <span className="font-semibold text-mtm-text">
                  {new Date(echeance.periode).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </span>
                <span className="text-mtm-muted">
                  {formatMoney(echeance.montantPaye)} / {formatMoney(echeance.montantPrevu)}
                </span>
                <Badge tone={echeanceStatut.tone}>{echeanceStatut.label}</Badge>
              </li>
            );
          })}
        </ul>
      </div>

      {bailActif.documents.length > 0 && (
        <div>
          <h2 className="mb-2 font-display text-base font-bold text-mtm-text">Quittances et documents</h2>
          <ul className="flex flex-col gap-1.5">
            {bailActif.documents.map((document) => (
              <li key={document.id}>
                <a
                  href={document.secureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md border border-mtm-border bg-mtm-surface px-3 py-2.5 text-sm font-medium text-mtm-text transition hover:border-mtm-primary"
                >
                  <FileText className="h-4 w-4 flex-none text-mtm-primary" aria-hidden="true" />
                  <span className="truncate">{document.title ?? locatifDocumentType(document.type)}</span>
                  <span className="ml-auto flex-none text-xs text-mtm-muted">
                    {formatDate(document.createdAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {paiements.length > 0 && (
        <div>
          <h2 className="mb-2 font-display text-base font-bold text-mtm-text">Historique des paiements</h2>
          <ul className="flex flex-col gap-1.5">
            {paiements.map((paiement) => {
              const statutPaiement = paiementStatus(paiement.statut);
              return (
                <li
                  key={paiement.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-mtm-border bg-mtm-surface px-3 py-2.5 text-sm"
                >
                  <span className="text-mtm-muted">{formatDate(paiement.datePaiement)}</span>
                  <span className="font-semibold text-mtm-text">{formatMoney(paiement.montant)}</span>
                  <Badge tone={statutPaiement.tone}>{statutPaiement.label}</Badge>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-display text-base font-bold text-mtm-text">Mes incidents signalés</h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-mtm-muted">Aucun incident signalé.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {incidents.map((incident) => {
              const incidentStatut = incidentStatus(incident.statut);
              return (
                <li key={incident.id} className="rounded-md border border-mtm-border bg-mtm-surface px-3 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-mtm-text">
                      {signalementType(incident.nature, incident.type)}
                    </span>
                    <Badge tone={incidentStatut.tone}>{incidentStatut.label}</Badge>
                  </div>
                  <p className="mt-1 text-mtm-muted">{incident.description}</p>
                  {incident.resolutionNotes && (
                    <p className="mt-1 text-xs text-mtm-muted">Réponse MTM : {incident.resolutionNotes}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Demandes : le second canal exigé par les sections 4 et 15. */}
      <div>
        <h2 className="mb-2 font-display text-base font-bold text-mtm-text">Mes demandes</h2>
        {demandes.length === 0 ? (
          <p className="text-sm text-mtm-muted">
            Aucune demande en cours. Utilisez « Faire une demande » pour une attestation, un
            renouvellement de bail ou des travaux.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {demandes.map((demande) => {
              const demandeStatut = incidentStatus(demande.statut);
              return (
                <li key={demande.id} className="rounded-md border border-mtm-border bg-mtm-surface px-3 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-mtm-text">
                      {signalementType(demande.nature, demande.type)}
                    </span>
                    <Badge tone={demandeStatut.tone}>{demandeStatut.label}</Badge>
                  </div>
                  <p className="mt-1 text-mtm-muted">{demande.description}</p>
                  {demande.resolutionNotes && (
                    <p className="mt-1 text-xs text-mtm-muted">Réponse MTM : {demande.resolutionNotes}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

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
