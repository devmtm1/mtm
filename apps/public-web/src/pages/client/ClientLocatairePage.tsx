import { useState } from 'react';
import { AlertTriangle, FileText, MessageSquarePlus, Receipt } from 'lucide-react';
import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientCard, ClientPageHeader, ClientRow, IconBadge, ProgressBar } from '../../components/client/shell/ClientUi';
import { ShowMoreButton } from '../../components/client/shell/Disclosure';
import { etatPaiementIcone } from '../../components/client/shell/etat-paiement';
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
  const [toutesEcheances, setToutesEcheances] = useState(false);
  const [tousReglements, setTousReglements] = useState(false);
  const [signalement, setSignalement] = useState<{ bailId: string; nature: string } | null>(null);
  const baux = locataireBaux ?? [];
  const bailActif = baux.find((b) => b.statut === 'actif' || b.statut === 'preavis') ?? baux[0] ?? null;
  const paiements = locatairePaiements ?? [];
  const echanges = locataireIncidents ?? [];

  if (locataireLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
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

  // Un bail de deux ans compte vingt-quatre échéances : on montre ce qui reste
  // dû et les trois dernières réglées, le reste se déplie.
  const reglees = bailActif.echeances.filter((echeance) => echeance.statut === 'payee');
  const recentesReglees = new Set(reglees.slice(-3).map((echeance) => echeance.id));
  const echeancesVisibles = toutesEcheances
    ? bailActif.echeances
    : bailActif.echeances.filter((echeance) => echeance.statut !== 'payee' || recentesReglees.has(echeance.id));
  const echeancesMasquees = bailActif.echeances.length - echeancesVisibles.length;
  const reglementsVisibles = tousReglements ? paiements : paiements.slice(0, 4);

  return (
    <div className="flex flex-col gap-4">
      <ClientPageHeader
        title="Ma location"
        description={[bailActif.bien.adresse, bailActif.bien.commune].filter(Boolean).join(', ')}
        action={
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button className="px-3" onClick={() => setSignalement({ bailId: bailActif.id, nature: 'incident' })}>
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Signaler un incident
            </Button>
            <Button
              variant="secondary"
              className="px-3"
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
          {/* Ce qui reste à régler, en grand : la première chose qu'un locataire cherche. */}
          <div className="rounded-2xl bg-mtm-bg p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-mtm-muted">
              {solde.resteADevoir > 0 ? 'Reste à régler' : 'Solde'}
            </p>
            <p className={`mt-0.5 font-display text-3xl font-bold ${solde.resteADevoir > 0 ? 'text-mtm-warning' : 'text-mtm-success'}`}>
              {solde.resteADevoir > 0 ? formatMoney(solde.resteADevoir) : 'Loyers à jour'}
            </p>
            <ProgressBar
              className="mt-3"
              value={solde.loyersDus > 0 ? (solde.loyersRegles / solde.loyersDus) * 100 : 100}
              label="Loyers réglés"
            />
            <p className="mt-1.5 text-xs text-mtm-muted">
              {formatMoney(solde.loyersRegles)} réglés sur {formatMoney(solde.loyersDus)} appelés
              {solde.enAttenteDeValidation > 0 ? ` · dont ${formatMoney(solde.enAttenteDeValidation)} en cours de validation` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statut.tone}>{statut.label}</Badge>
            <Badge tone={situation.tone}>{situation.label}</Badge>
            <span className="text-xs text-mtm-muted">{bailActif.referenceInterne}</span>
          </div>
          <p className="text-sm text-mtm-muted">{situation.help || statut.help}</p>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Fait
              label="Loyer mensuel"
              value={formatMoney(bailActif.loyerMensuel)}
              hint={bailActif.charges ? `+ ${formatMoney(bailActif.charges)} charges` : undefined}
            />
            <Fait label="Loyers appelés" value={formatMoney(solde.loyersDus)} />
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
        <ul className="-my-1">
          {echeancesVisibles.map((echeance) => {
            const echeanceStatut = loyerEcheanceStatus(echeance.statut);
            const { icon, tone } = etatPaiementIcone(echeance.statut);
            return (
              <li key={echeance.id}>
                <ClientRow
                  icon={icon}
                  tone={tone}
                  title={new Date(echeance.periode).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                  subtitle={`${formatMoney(echeance.montantPaye)} / ${formatMoney(echeance.montantPrevu)}`}
                  trailing={<Badge tone={echeanceStatut.tone}>{echeanceStatut.label}</Badge>}
                />
              </li>
            );
          })}
        </ul>
        <ShowMoreButton
          hiddenCount={echeancesMasquees}
          expanded={toutesEcheances}
          onToggle={() => setToutesEcheances((ouvert) => !ouvert)}
          noun="échéances"
        />
      </ClientCard>

      {bailActif.documents.length > 0 && (
        <ClientCard title="Mes quittances et documents">
          <ul className="-my-1">
            {bailActif.documents.map((document) => (
              <li key={document.id}>
                <ClientRow
                  href={document.secureUrl}
                  icon={FileText}
                  title={document.title ?? locatifDocumentType(document.type)}
                  subtitle={formatDate(document.createdAt)}
                />
              </li>
            ))}
          </ul>
        </ClientCard>
      )}

      {paiements.length > 0 && (
        <ClientCard title="Mes règlements">
          <ul className="-my-1">
            {reglementsVisibles.map((paiement) => {
              const statutPaiement = paiementStatus(paiement.statut);
              const { tone } = etatPaiementIcone(paiement.statut);
              return (
                <li key={paiement.id}>
                  <ClientRow
                    icon={Receipt}
                    tone={tone}
                    title={formatMoney(paiement.montant)}
                    subtitle={formatDate(paiement.datePaiement)}
                    trailing={<Badge tone={statutPaiement.tone}>{statutPaiement.label}</Badge>}
                  />
                </li>
              );
            })}
          </ul>
          <ShowMoreButton
            hiddenCount={paiements.length - reglementsVisibles.length}
            expanded={tousReglements}
            onToggle={() => setTousReglements((ouvert) => !ouvert)}
            noun="règlements"
          />
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
          <ul className="-my-1 divide-y divide-mtm-border/70">
            {echanges.map((echange) => {
              const echangeStatut = incidentStatus(echange.statut);
              const Icone = echange.nature === 'demande' ? MessageSquarePlus : AlertTriangle;
              return (
                <li key={echange.id} className="flex items-start gap-3 py-3.5 first:pt-1">
                  <IconBadge icon={Icone} tone={echange.nature === 'demande' ? 'primary' : 'warning'} className="h-10 w-10" />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <span className="font-semibold text-mtm-text">
                        {signalementType(echange.nature, echange.type)}
                      </span>
                      <Badge tone={echangeStatut.tone}>{echangeStatut.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-mtm-muted">{echange.description}</p>
                    {echange.resolutionNotes && (
                      <p className="mt-1.5 rounded-xl bg-mtm-bg px-3 py-2 text-xs text-mtm-muted">
                        <span className="font-semibold text-mtm-text">Réponse MTM :</span> {echange.resolutionNotes}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-mtm-muted">
                      {echange.nature === 'demande' ? 'Demande' : 'Incident'} du {formatDate(echange.createdAt)}
                    </p>
                  </div>
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
