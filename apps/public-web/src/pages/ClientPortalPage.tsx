import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageIntro } from '../components/layout/PageIntro';
import { useAuth } from '../contexts/auth-context-store';
import { useClientPortal } from '../hooks/useClientPortal';
import { ClientDemandesSection } from '../components/client/ClientDemandesSection';
import { ArticleListSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatMoney, formatDate } from '../utils/format';
import { ROUTES } from '../routes';

export function ClientPortalPage() {
  const { user, accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const { data: dossiers, loading, error } = useClientPortal(accessToken);
  usePageMetadata({ title: 'Mon espace client' });

  async function handleLogout(): Promise<void> {
    await logout();
    navigate(ROUTES.home);
  }

  return (
    <div className="bg-mtm-surface">
      <PageIntro eyebrow="Espace client" title={`Bonjour ${user?.firstName ?? ''}`} />

      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div className="mb-6 flex justify-end">
          <Button variant="secondary" onClick={() => void handleLogout()}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Se déconnecter
          </Button>
        </div>

        {loading && <ArticleListSkeleton count={2} />}
        {error && <EmptyState title="Impossible de charger vos dossiers" description={error} />}
        {!loading && !error && dossiers && dossiers.length === 0 && (
          <EmptyState
            title="Aucun dossier pour le moment"
            description="Vos dossiers de vente apparaîtront ici dès qu'un commercial MTM vous en aura rattaché un."
          />
        )}

        {!loading && !error && dossiers && dossiers.length > 0 && (
          <h2 className="mb-4 font-display text-lg font-bold text-mtm-text">Mes dossiers</h2>
        )}

        {!loading && !error && dossiers && dossiers.length > 0 && (
          <div className="flex flex-col gap-6">
            {dossiers.map((dossier) => (
              <article
                key={dossier.id}
                className="rounded-lg border border-mtm-border bg-mtm-surface p-6 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-mtm-muted">
                      {dossier.referenceInterne ?? 'Dossier'}
                    </p>
                    <h2 className="font-display text-lg font-bold text-mtm-text">
                      {dossier.terrain?.nom ?? 'Terrain non renseigné'}
                    </h2>
                    {dossier.terrain && (
                      <p className="text-sm text-mtm-muted">
                        {[dossier.terrain.commune, dossier.terrain.region].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <Badge tone="primary">{dossier.statut}</Badge>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-mtm-border pt-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-mtm-muted">Prix de vente</dt>
                    <dd className="text-sm font-semibold text-mtm-text">{formatMoney(dossier.prixVente)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-mtm-muted">Déjà payé</dt>
                    <dd className="text-sm font-semibold text-mtm-success">
                      {formatMoney(dossier.montantPaye)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-mtm-muted">Ouvert le</dt>
                    <dd className="text-sm font-semibold text-mtm-text">{formatDate(dossier.createdAt)}</dd>
                  </div>
                </dl>

                {dossier.reservations.length > 0 && (
                  <div className="mt-4 border-t border-mtm-border pt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-mtm-muted">
                      Réservation
                    </h3>
                    {dossier.reservations.map((reservation, index) => (
                      <p key={index} className="mt-1 text-sm text-mtm-text">
                        Acompte {formatMoney(reservation.montantAcompte)} · statut {reservation.statut} ·
                        expire le {formatDate(reservation.dateExpiration)}
                      </p>
                    ))}
                  </div>
                )}

                {dossier.paiements.length > 0 && (
                  <div className="mt-4 border-t border-mtm-border pt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-mtm-muted">
                      Paiements validés
                    </h3>
                    <ul className="mt-1 flex flex-col gap-1">
                      {dossier.paiements.map((paiement, index) => (
                        <li key={index} className="text-sm text-mtm-text">
                          {formatMoney(paiement.montant)} · {paiement.mode} · {formatDate(paiement.datePaiement)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {dossier.documents.length > 0 && (
                  <div className="mt-4 border-t border-mtm-border pt-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-mtm-muted">
                      Documents
                    </h3>
                    <ul className="mt-1 flex flex-col gap-1">
                      {dossier.documents.map((document) => (
                        <li key={document.id}>
                          <a
                            href={document.secureUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-mtm-primary hover:underline"
                          >
                            {document.title ?? document.type}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        <ClientDemandesSection token={accessToken} />
      </section>
    </div>
  );
}
