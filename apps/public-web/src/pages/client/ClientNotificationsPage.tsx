import { BellOff, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientPageHeader, IconBadge } from '../../components/client/shell/ClientUi';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { depuisQuand, groupeParJour, iconeNotification, lienSur } from '../../utils/clientNotifications';
import type { ClientNotification } from '../../types/notification';

/**
 * Tout ce qui s'est passé sur le compte du client : paiement validé, réponse
 * de MTM, document disponible. Un toucher ouvre l'écran concerné et marque la
 * notification comme lue.
 */
export function ClientNotificationsPage() {
  const navigate = useNavigate();
  const { notifications, notificationsNonLues, marquerNotificationLue, toutMarquerNotificationsLues } = useClientData();
  usePageMetadata({ title: 'Notifications' });

  function ouvrir(notification: ClientNotification): void {
    if (!notification.readAt) void marquerNotificationLue(notification.id);
    const lien = lienSur(notification.lien);
    if (lien) navigate(lien);
  }

  return (
    <div>
      <ClientPageHeader
        title="Notifications"
        description={notificationsNonLues > 0 ? `${notificationsNonLues} non lue${notificationsNonLues > 1 ? 's' : ''}` : undefined}
        action={
          notificationsNonLues > 0 ? (
            <Button variant="secondary" className="w-full sm:w-auto" onClick={() => void toutMarquerNotificationsLues()}>
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Tout marquer comme lu
            </Button>
          ) : undefined
        }
      />

      {notifications === null && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      )}

      {notifications !== null && notifications.length === 0 && (
        <EmptyState
          icon={BellOff}
          title="Rien de nouveau pour le moment"
          description="Vous serez prévenu ici dès qu’un paiement est validé, que MTM répond à votre message ou qu’un document est disponible."
        />
      )}

      {notifications !== null && notifications.length > 0 && (
        <div className="flex flex-col gap-5">
          {groupeParJour(notifications).map((groupe) => (
            <section key={groupe.titre} aria-label={groupe.titre}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-mtm-muted">{groupe.titre}</h2>
              <ul className="flex flex-col gap-2">
                {groupe.items.map((notification) => {
                  const { icon, tone } = iconeNotification(notification.type, notification.niveau);
                  const nonLue = !notification.readAt;
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => ouvrir(notification)}
                        className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left shadow-card transition-transform active:scale-[0.98] ${
                          nonLue ? 'border-mtm-primary/30 bg-mtm-primary-subtle/50' : 'border-mtm-border/70 bg-mtm-surface'
                        }`}
                      >
                        <IconBadge icon={icon} tone={tone} className="h-10 w-10" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className={`text-[15px] ${nonLue ? 'font-bold' : 'font-semibold'} text-mtm-text`}>{notification.titre}</span>
                            {nonLue && (
                              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-mtm-accent">
                                <span className="sr-only">Non lue</span>
                              </span>
                            )}
                          </span>
                          {notification.message && <span className="mt-0.5 block text-sm text-mtm-muted">{notification.message}</span>}
                          <span className="mt-1 block text-xs text-mtm-muted">{depuisQuand(notification.createdAt)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
