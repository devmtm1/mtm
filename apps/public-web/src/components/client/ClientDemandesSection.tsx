import { CalendarCheck, MessageSquare } from 'lucide-react';
import type { ClientDemandes } from '../../types/clientPortal';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { Badge } from '../ui/Badge';
import { formatDate } from '../../utils/format';

export interface DemandeItem {
  id: string;
  kind: 'reservation' | 'message';
  title: string;
  message: string | null;
  createdAt: string;
  done: boolean;
  doneLabel: string;
  pendingLabel: string;
}

/**
 * « Demandes » de l'espace client (section 4 du CDC) : messages de contact et
 * demandes de réservation soumis depuis le site public, rattachés au client
 * par son adresse e-mail. Les plus récentes en premier.
 */
function buildDemandeItems(data: ClientDemandes | null): DemandeItem[] {
  if (!data) return [];
  return [
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
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

interface ClientDemandesListProps {
  data: ClientDemandes | null;
  loading: boolean;
  error: string | null;
  /** N'afficher que les plus récentes (aperçu sur l'accueil). */
  limit?: number;
  emptyAction?: React.ReactNode;
}

export function ClientDemandesList({ data, loading, error, limit, emptyAction }: ClientDemandesListProps) {
  const items = buildDemandeItems(data).slice(0, limit ?? Infinity);

  if (loading) return <Spinner label="Chargement de vos demandes..." />;
  if (error) return <EmptyState title="Impossible de charger vos demandes" description={error} />;
  if (items.length === 0) {
    return (
      <EmptyState
        title="Aucune demande envoyée"
        description="Vos demandes de visite, d'information ou de réservation apparaîtront ici."
        action={emptyAction}
      />
    );
  }

  return (
    <ul className="divide-y divide-mtm-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mtm-primary-subtle text-mtm-primary">
            {item.kind === 'reservation' ? (
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            ) : (
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <p className="min-w-0 truncate text-sm font-semibold text-mtm-text">{item.title}</p>
              <Badge tone={item.done ? 'success' : 'warning'}>{item.done ? item.doneLabel : item.pendingLabel}</Badge>
            </div>
            {item.message && <p className="mt-0.5 line-clamp-2 text-sm text-mtm-muted">{item.message}</p>}
            <p className="mt-1 text-xs text-mtm-muted">Envoyée le {formatDate(item.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
