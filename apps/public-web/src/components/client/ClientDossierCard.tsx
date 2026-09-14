import { CalendarClock, CalendarDays, FileText, MapPin, Receipt } from 'lucide-react';
import type { ClientDossier } from '../../types/clientPortal';
import { formatDate, formatMoney } from '../../utils/format';
import { documentType, dossierStatus, echeanceStatus, paymentMode, reservationStatus } from '../../utils/labels';
import { Badge } from '../ui/Badge';

/**
 * Un dossier de vente vu par le client : où en est-il (statut expliqué,
 * avancement du paiement), ce qui a été payé, la réservation en cours et
 * l'échéancier convenu et les documents à télécharger.
 */
export function ClientDossierCard({ dossier }: { dossier: ClientDossier }) {
  const status = dossierStatus(dossier.statut);
  const price = dossier.prixVente ?? 0;
  const paid = dossier.montantPaye;
  const remaining = Math.max(0, price - paid);
  const progress = price > 0 ? Math.min(100, Math.round((paid / price) * 100)) : 0;
  const location = [dossier.terrain?.commune, dossier.terrain?.region].filter(Boolean).join(', ');
  const activeReservation = dossier.reservations.find((reservation) => reservation.statut === 'active' || reservation.statut === 'confirmee') ?? dossier.reservations[0];

  return (
    <article className="overflow-hidden rounded-lg border border-mtm-border bg-mtm-surface shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-mtm-border px-5 py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mtm-muted">
            {dossier.referenceInterne ?? 'Dossier de vente'} · ouvert le {formatDate(dossier.createdAt)}
          </p>
          <h3 className="mt-0.5 truncate font-display text-lg font-bold text-mtm-text">
            {dossier.terrain?.nom ?? 'Dossier de vente'}
          </h3>
          {dossier.terrain && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-mtm-muted">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {dossier.terrain.referenceInterne}
              {location ? ` · ${location}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={status.tone}>{status.label}</Badge>
          <span className="max-w-[260px] text-right text-xs text-mtm-muted">{status.help}</span>
        </div>
      </header>

      <div className="grid gap-5 px-5 py-4 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-mtm-muted">Déjà payé</p>
              <p className="font-display text-xl font-bold text-mtm-success">{formatMoney(paid)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-mtm-muted">Prix de vente</p>
              <p className="font-display text-xl font-bold text-mtm-text">{formatMoney(price || null)}</p>
            </div>
          </div>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-mtm-border"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Avancement du paiement"
          >
            <div className="h-full rounded-full bg-mtm-success transition-[width]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-mtm-muted">
            {progress}% payé
            {remaining > 0 ? ` · reste ${formatMoney(remaining)}` : price > 0 ? ' · dossier soldé' : ''}
          </p>

          {dossier.echeances.length > 0 && (
            <section className="mt-4">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-mtm-muted">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                Échéancier convenu
              </h4>
              <ul className="mt-1.5 divide-y divide-mtm-border text-sm">
                {dossier.echeances.map((echeance) => {
                  const state = echeanceStatus(echeance.statut);
                  const due = Math.max(0, echeance.montantPrevu - echeance.montantPaye);
                  return (
                    <li key={echeance.numero} className="flex items-center justify-between gap-3 py-1.5">
                      <span className="min-w-0 text-mtm-muted">
                        <span className="font-semibold text-mtm-text">{echeance.numero}.</span> {formatDate(echeance.dateEcheance)}
                        {echeance.statut === 'partielle' && (
                          <span className="block text-xs">reste {formatMoney(due)}</span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="whitespace-nowrap font-semibold text-mtm-text">{formatMoney(echeance.montantPrevu)}</span>
                        <Badge tone={state.tone} className="whitespace-nowrap">{state.label}</Badge>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {activeReservation && (
            <div className="mt-4 flex items-start gap-2.5 rounded-md bg-mtm-primary-subtle px-3.5 py-3 text-sm">
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
        </div>

        <div className="flex flex-col gap-4 md:border-l md:border-mtm-border md:pl-5">
          <section>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-mtm-muted">
              <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
              Paiements validés
            </h4>
            {dossier.paiements.length === 0 ? (
              <p className="mt-1.5 text-sm text-mtm-muted">Aucun paiement enregistré pour le moment.</p>
            ) : (
              <ul className="mt-1.5 divide-y divide-mtm-border text-sm">
                {dossier.paiements.map((paiement, index) => (
                  <li key={index} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="text-mtm-muted">
                      {formatDate(paiement.datePaiement)} · {paymentMode(paiement.mode)}
                    </span>
                    <span className="shrink-0 whitespace-nowrap font-semibold text-mtm-text">{formatMoney(paiement.montant)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-mtm-muted">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Documents
            </h4>
            {dossier.documents.length === 0 ? (
              <p className="mt-1.5 text-sm text-mtm-muted">Vos reçus et contrats apparaîtront ici.</p>
            ) : (
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {dossier.documents.map((document) => (
                  <li key={document.id}>
                    <a
                      href={document.secureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-mtm-border px-2.5 py-1.5 text-xs font-semibold text-mtm-primary transition-colors hover:border-mtm-primary hover:bg-mtm-primary-subtle"
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      {document.title ?? documentType(document.type)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </article>
  );
}
