import { useMemo, useState } from 'react';
import { CalendarClock, CalendarDays, Download, FileText, Info, MapPin, Receipt } from 'lucide-react';
import type { ClientDossier } from '../../types/clientPortal';
import { construireFrise, echeanceAMettreEnAvant } from '../../utils/clientFrise';
import { formatDate, formatMoney } from '../../utils/format';
import { documentIcone } from '../../utils/documentIcon';
import { documentType, dossierStatus, paymentMode, reservationStatus } from '../../utils/labels';
import { Badge } from '../ui/Badge';
import { ClientRow, ProgressBar } from './shell/ClientUi';
import { ClientDisclosure } from './shell/Disclosure';
import { Frise, type FriseItem } from './shell/Frise';

function Section({ icon: Icon, title, children }: { icon: typeof Receipt; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mtm-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {title}
      </h4>
      {children}
    </section>
  );
}

/**
 * Un dossier de vente vu par le client, en carte repliable. Replié : le bien,
 * le statut, l'avancement du paiement et la prochaine échéance. Déplié :
 * l'explication du statut, la réservation, l'échéancier en frise, les
 * paiements validés et les documents à télécharger.
 */
export function ClientDossierCard({ dossier, defaultOpen = false }: { dossier: ClientDossier; defaultOpen?: boolean }) {
  const status = dossierStatus(dossier.statut);
  const price = dossier.prixVente ?? 0;
  const paid = dossier.montantPaye;
  const remaining = Math.max(0, price - paid);
  const progress = price > 0 ? (paid / price) * 100 : 0;
  const location = [dossier.terrain?.commune, dossier.terrain?.region].filter(Boolean).join(', ');
  const activeReservation =
    dossier.reservations.find((reservation) => reservation.statut === 'active' || reservation.statut === 'confirmee') ??
    dossier.reservations[0];

  const frise = useMemo(() => construireFrise(dossier.echeances), [dossier.echeances]);
  const enAvant = echeanceAMettreEnAvant(frise);
  const reglees = frise.filter((etape) => etape.etat === 'reglee');
  const [reglesVisibles, setReglesVisibles] = useState(false);
  // Une seule échéance réglée tient dans la liste ; au-delà, elles se replient.
  const replierReglees = reglees.length > 1 && !reglesVisibles;

  const items: FriseItem[] = frise
    .filter((etape) => !(replierReglees && etape.etat === 'reglee'))
    .map((etape) => ({
      key: etape.numero,
      etat: etape.etat,
      titre: (
        <>
          {etape.numero}. {formatDate(etape.dateEcheance)}
        </>
      ),
      detail:
        etape.etat === 'retard'
          ? `En retard de ${etape.joursRetard} jour${etape.joursRetard > 1 ? 's' : ''}`
          : etape.etat === 'prochaine'
            ? etape.reste < etape.montantPrevu
              ? `Prochaine échéance · reste ${formatMoney(etape.reste)}`
              : 'Prochaine échéance'
            : etape.etat === 'reglee'
              ? 'Réglée'
              : undefined,
      droite: formatMoney(etape.montantPrevu),
    }));

  return (
    <ClientDisclosure
      defaultOpen={defaultOpen}
      summary={
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-display text-[17px] font-bold text-mtm-text">
                {dossier.terrain?.nom ?? 'Dossier de vente'}
              </h3>
              {location && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-mtm-muted">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{location}</span>
                </p>
              )}
            </div>
            <Badge tone={status.tone} className="shrink-0">
              {status.label}
            </Badge>
          </div>

          <ProgressBar value={progress} label="Avancement du paiement" className="mt-3" />
          <p className="mt-1.5 text-xs text-mtm-muted">
            <span className="font-semibold text-mtm-success">{formatMoney(paid)}</span> payés sur {formatMoney(price || null)}
            {remaining > 0 ? ` · reste ${formatMoney(remaining)}` : price > 0 ? ' · dossier soldé' : ''}
          </p>

          {enAvant && (
            <p
              className={`mt-2.5 flex items-start gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold ${
                enAvant.etat === 'retard' ? 'bg-mtm-accent-subtle text-mtm-accent' : 'bg-mtm-primary-subtle text-mtm-primary'
              }`}
            >
              <CalendarClock className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {enAvant.etat === 'retard' ? 'En retard' : 'Prochaine échéance'} · {formatMoney(enAvant.reste)}{' '}
                {enAvant.etat === 'retard' ? 'était dû le' : 'avant le'} {formatDate(enAvant.dateEcheance)}
              </span>
            </p>
          )}
        </>
      }
    >
      <p className="flex items-start gap-2 rounded-xl bg-mtm-bg px-3 py-2.5 text-sm text-mtm-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-mtm-primary" aria-hidden="true" />
        <span>
          {status.help}
          <span className="mt-1 block text-xs">
            {dossier.referenceInterne ?? 'Dossier de vente'}
            {dossier.terrain ? ` · ${dossier.terrain.referenceInterne}` : ''} · ouvert le {formatDate(dossier.createdAt)}
          </span>
        </span>
      </p>

      {activeReservation && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-mtm-primary-subtle px-3.5 py-3 text-sm">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-mtm-primary" aria-hidden="true" />
          <div>
            <p className="font-semibold text-mtm-text">
              Réservation {reservationStatus(activeReservation.statut).label.toLowerCase()}
              {activeReservation.montantAcompte > 0 ? ` · acompte ${formatMoney(activeReservation.montantAcompte)}` : ''}
            </p>
            <p className="text-xs text-mtm-muted">
              {activeReservation.statut === 'active' ? 'Valable jusqu’au ' : 'Date limite : '}
              {formatDate(activeReservation.dateExpiration)} — {reservationStatus(activeReservation.statut).help}
            </p>
          </div>
        </div>
      )}

      {dossier.echeances.length > 0 && (
        <div className="mt-5">
          <Section icon={CalendarDays} title="Échéancier convenu">
            {replierReglees && (
              <button
                type="button"
                onClick={() => setReglesVisibles(true)}
                className="mb-2 flex w-full items-center justify-between rounded-xl border border-mtm-border px-3 py-2.5 text-left text-[13px] font-semibold text-mtm-success active:scale-[0.99]"
              >
                <span>{reglees.length} échéances déjà réglées</span>
                <span className="text-xs font-semibold text-mtm-primary">Voir</span>
              </button>
            )}
            <Frise items={items} label="Échéancier du dossier" />
          </Section>
        </div>
      )}

      <Section icon={Receipt} title="Paiements validés">
        {dossier.paiements.length === 0 ? (
          <p className="text-sm text-mtm-muted">Aucun paiement enregistré pour le moment.</p>
        ) : (
          <ul>
            {dossier.paiements.map((paiement, index) => (
              <li key={index}>
                <ClientRow
                  icon={Receipt}
                  tone="success"
                  title={formatMoney(paiement.montant)}
                  subtitle={`${formatDate(paiement.datePaiement)} · ${paymentMode(paiement.mode)}`}
                  trailing={<span className="text-xs font-semibold text-mtm-success">Validé</span>}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={FileText} title="Documents">
        {dossier.documents.length === 0 ? (
          <p className="text-sm text-mtm-muted">Vos reçus et contrats apparaîtront ici.</p>
        ) : (
          <ul>
            {dossier.documents.map((document) => (
              <li key={document.id}>
                <ClientRow
                  href={document.secureUrl}
                  icon={documentIcone(document.type)}
                  title={document.title ?? documentType(document.type)}
                  subtitle={documentType(document.type)}
                  trailing={<Download className="h-4 w-4 shrink-0 text-mtm-primary" aria-label="Télécharger" />}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </ClientDisclosure>
  );
}
