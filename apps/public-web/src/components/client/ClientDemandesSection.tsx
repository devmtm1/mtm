import { CalendarCheck, MessageSquare } from 'lucide-react';
import { useClientDemandes } from '../../hooks/useClientPortal';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { Badge } from '../ui/Badge';
import { LinkButton } from '../ui/LinkButton';
import { ROUTES } from '../../routes';
import { formatDate } from '../../utils/format';

/**
 * « Demandes » de l'espace client (section 4 du CDC) : messages de contact et
 * demandes de réservation soumis depuis le site public, rattachés au client
 * par son adresse e-mail. Les plus récentes en premier.
 */
export function ClientDemandesSection({ token }: { token: string | null }) {
  const { data, loading, error } = useClientDemandes(token);

  const items = data
    ? [
        ...data.reservations.map((demande) => ({
          id: `r-${demande.id}`,
          kind: 'reservation' as const,
          title: `Demande de réservation${demande.terrain ? ` · ${demande.terrain.nom}` : ''}`,
          message: demande.message,
          createdAt: demande.createdAt,
          done: demande.statut === 'traitee',
          doneLabel: 'Traitée',
          pendingLabel: 'En cours de traitement',
        })),
        ...data.messages.map((demande) => ({
          id: `m-${demande.id}`,
          kind: 'message' as const,
          title: `${demande.sujet ?? 'Message'}${demande.terrain ? ` · ${demande.terrain.nom}` : ''}`,
          message: demande.message,
          createdAt: demande.createdAt,
          done: demande.traite,
          doneLabel: 'Prise en charge',
          pendingLabel: 'En attente',
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  return (
    <section className="rounded-lg border border-mtm-border bg-mtm-surface shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-mtm-border px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-bold text-mtm-text">Mes demandes</h2>
          <p className="text-sm text-mtm-muted">Vos messages et demandes de réservation, et leur prise en charge.</p>
        </div>
        <LinkButton to={ROUTES.contact} variant="secondary">
          Nouvelle demande
        </LinkButton>
      </header>

      <div className="px-5 py-4">
        {loading && <Spinner label="Chargement de vos demandes..." />}
        {error && <EmptyState title="Impossible de charger vos demandes" description={error} />}
        {data && items.length === 0 && (
          <EmptyState
            title="Aucune demande envoyée"
            description="Vos demandes de visite, d'information ou de réservation apparaîtront ici."
          />
        )}

        {items.length > 0 && (
          <ul className="divide-y divide-mtm-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mtm-primary-subtle text-mtm-primary">
                  {item.kind === 'reservation' ? (
                    <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-mtm-text">{item.title}</p>
                    <Badge tone={item.done ? 'success' : 'warning'}>{item.done ? item.doneLabel : item.pendingLabel}</Badge>
                  </div>
                  {item.message && <p className="mt-0.5 line-clamp-2 text-sm text-mtm-muted">{item.message}</p>}
                  <p className="mt-1 text-xs text-mtm-muted">Envoyée le {formatDate(item.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
