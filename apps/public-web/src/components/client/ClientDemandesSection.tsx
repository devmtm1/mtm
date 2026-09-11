import { CalendarCheck, MessageSquare } from 'lucide-react';
import { useClientDemandes } from '../../hooks/useClientPortal';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../utils/format';

/**
 * « Demandes » de l'espace client (section 4 du CDC) : messages de contact et
 * demandes de réservation soumis depuis le site public, rattachés au client
 * par son adresse e-mail.
 */
export function ClientDemandesSection({ token }: { token: string | null }) {
  const { data, loading, error } = useClientDemandes(token);

  const isEmpty = data && data.messages.length === 0 && data.reservations.length === 0;

  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-bold text-mtm-text">Mes demandes</h2>
      <p className="mt-1 text-sm text-mtm-muted">
        Les messages et demandes de réservation que vous nous avez envoyés.
      </p>

      <div className="mt-4">
        {loading && <Spinner label="Chargement de vos demandes..." />}
        {error && <EmptyState title="Impossible de charger vos demandes" description={error} />}
        {isEmpty && (
          <EmptyState
            title="Aucune demande envoyée"
            description="Vos demandes de visite, d'information ou de réservation apparaîtront ici."
          />
        )}

        {data && !isEmpty && (
          <ul className="flex flex-col gap-3">
            {data.reservations.map((demande) => (
              <li
                key={demande.id}
                className="flex items-start gap-3 rounded-lg border border-mtm-border bg-mtm-surface p-4 shadow-card"
              >
                <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-mtm-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-mtm-text">
                      Demande de réservation
                      {demande.terrain ? ` · ${demande.terrain.nom}` : ''}
                    </p>
                    <Badge tone={demande.statut === 'traitee' ? 'success' : 'warning'}>
                      {demande.statut === 'traitee' ? 'Traitée' : 'En cours de traitement'}
                    </Badge>
                  </div>
                  {demande.message && <p className="mt-1 text-sm text-mtm-muted">{demande.message}</p>}
                  <p className="mt-1 text-xs text-mtm-muted">Envoyée le {formatDate(demande.createdAt)}</p>
                </div>
              </li>
            ))}

            {data.messages.map((demande) => (
              <li
                key={demande.id}
                className="flex items-start gap-3 rounded-lg border border-mtm-border bg-mtm-surface p-4 shadow-card"
              >
                <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-mtm-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-mtm-text">
                      {demande.sujet ?? 'Message'}
                      {demande.terrain ? ` · ${demande.terrain.nom}` : ''}
                    </p>
                    <Badge tone={demande.traite ? 'success' : 'warning'}>
                      {demande.traite ? 'Lue par MTM' : 'En attente de lecture'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-mtm-muted">{demande.message}</p>
                  <p className="mt-1 text-xs text-mtm-muted">Envoyé le {formatDate(demande.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
