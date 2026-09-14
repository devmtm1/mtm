import { useState } from 'react';
import { FolderOpen, KeyRound, LogOut, Mail, MessageCircle, Phone, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context-store';
import { useClientPortal } from '../hooks/useClientPortal';
import { toTelHref, useSiteContact } from '../hooks/useSiteContact';
import { ClientDemandesSection } from '../components/client/ClientDemandesSection';
import { ClientDossierCard } from '../components/client/ClientDossierCard';
import { ChangePasswordForm } from '../components/auth/ChangePasswordForm';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { LinkButton } from '../components/ui/LinkButton';
import { Modal } from '../components/ui/Modal';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { formatMoney } from '../utils/format';
import { ROUTES } from '../routes';

/**
 * Espace client (section 4 du CDC) : l'état de ses dossiers en un coup d'œil
 * (en cours, payé, reste à payer), le détail de chaque dossier, ses demandes,
 * et de quoi joindre son conseiller.
 */
export function ClientPortalPage() {
  const { user, accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const contact = useSiteContact();
  const { data: dossiers, loading, error } = useClientPortal(accessToken);
  const [passwordOpen, setPasswordOpen] = useState(false);
  usePageMetadata({ title: 'Mon espace client' });

  async function handleLogout(): Promise<void> {
    await logout();
    navigate(ROUTES.home);
  }

  const list = dossiers ?? [];
  const open = list.filter((dossier) => !['solde', 'annule'].includes(dossier.statut));
  const totalPaid = list.reduce((sum, dossier) => sum + dossier.montantPaye, 0);
  const totalRemaining = list
    .filter((dossier) => dossier.statut !== 'annule')
    .reduce((sum, dossier) => sum + Math.max(0, (dossier.prixVente ?? 0) - dossier.montantPaye), 0);

  return (
    <div className="bg-mtm-bg">
      <section className="border-b border-mtm-border bg-mtm-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-mtm-primary">Espace client</span>
            <h1 className="mt-1 font-display text-3xl font-bold text-mtm-text">
              Bonjour {user?.firstName ?? ''}
            </h1>
            <p className="mt-1 text-sm text-mtm-muted">
              {user?.lastName ? `${user.firstName} ${user.lastName} · ` : ''}
              {user?.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setPasswordOpen(true)}>
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Mot de passe
            </Button>
            <Button variant="ghost" onClick={() => void handleLogout()}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Se déconnecter
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {loading ? (
            [0, 1, 2].map((index) => <Skeleton key={index} className="h-24 rounded-lg" />)
          ) : (
            <>
              <Kpi
                icon={<FolderOpen className="h-5 w-5" aria-hidden="true" />}
                value={String(open.length)}
                label={open.length > 1 ? 'Dossiers en cours' : 'Dossier en cours'}
                hint={list.length > open.length ? `${list.length - open.length} clos` : 'Suivis par votre conseiller'}
              />
              <Kpi
                icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
                value={formatMoney(totalPaid)}
                label="Total payé"
                hint="Paiements validés par MTM"
                tone="success"
              />
              <Kpi
                icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
                value={formatMoney(totalRemaining)}
                label="Reste à payer"
                hint={totalRemaining > 0 ? 'Sur l’ensemble de vos dossiers' : 'Rien à régler'}
              />
            </>
          )}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-8">
            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-mtm-text">Mes dossiers</h2>
                {list.length > 0 && (
                  <span className="text-sm text-mtm-muted">
                    {list.length} dossier{list.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {loading && (
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-56 rounded-lg" />
                  <Skeleton className="h-56 rounded-lg" />
                </div>
              )}
              {error && <EmptyState title="Impossible de charger vos dossiers" description={error} />}
              {!loading && !error && list.length === 0 && (
                <EmptyState
                  title="Aucun dossier pour le moment"
                  description="Vos dossiers de vente apparaîtront ici dès qu'un conseiller MTM vous en aura rattaché un."
                  action={<LinkButton to={ROUTES.catalog} variant="secondary">Découvrir les terrains</LinkButton>}
                />
              )}
              {!loading && !error && list.length > 0 && (
                <div className="flex flex-col gap-4">
                  {list.map((dossier) => (
                    <ClientDossierCard key={dossier.id} dossier={dossier} />
                  ))}
                </div>
              )}
            </section>

            <ClientDemandesSection token={accessToken} />
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border border-mtm-border bg-mtm-surface p-5 shadow-card">
              <h2 className="font-display text-base font-bold text-mtm-text">Une question ?</h2>
              <p className="mt-1 text-sm text-mtm-muted">
                Votre conseiller MTM vous répond du lundi au samedi.
              </p>
              <ul className="mt-4 flex flex-col gap-2 text-sm">
                <li>
                  <a href={toTelHref(contact.telephone)} className="flex items-center gap-2.5 rounded-md border border-mtm-border px-3 py-2 font-semibold text-mtm-text transition-colors hover:border-mtm-primary hover:text-mtm-primary">
                    <Phone className="h-4 w-4 text-mtm-primary" aria-hidden="true" />
                    {contact.telephone}
                  </a>
                </li>
                <li>
                  <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-md border border-mtm-border px-3 py-2 font-semibold text-mtm-text transition-colors hover:border-mtm-primary hover:text-mtm-primary">
                    <MessageCircle className="h-4 w-4 text-mtm-primary" aria-hidden="true" />
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 rounded-md border border-mtm-border px-3 py-2 font-semibold text-mtm-text transition-colors hover:border-mtm-primary hover:text-mtm-primary">
                    <Mail className="h-4 w-4 text-mtm-primary" aria-hidden="true" />
                    <span className="truncate">{contact.email}</span>
                  </a>
                </li>
              </ul>
            </div>
            <div className="rounded-lg bg-mtm-primary-dark p-5 text-white">
              <h2 className="font-display text-base font-bold">Comment ça marche ?</h2>
              <ol className="mt-3 flex flex-col gap-2 text-sm text-white/85">
                <li><strong className="text-white">1.</strong> Vous réservez un terrain avec un acompte.</li>
                <li><strong className="text-white">2.</strong> Chaque paiement validé apparaît ici avec son reçu.</li>
                <li><strong className="text-white">3.</strong> Une fois soldé, vous recevez vos documents définitifs.</li>
              </ol>
            </div>
          </aside>
        </div>
      </div>

      {passwordOpen && (
        <Modal title="Changer mon mot de passe" onClose={() => setPasswordOpen(false)}>
          <ChangePasswordForm onSuccess={() => setPasswordOpen(false)} />
        </Modal>
      )}
    </div>
  );
}

function Kpi({
  icon,
  value,
  label,
  hint,
  tone = 'primary',
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  hint: string;
  tone?: 'primary' | 'success';
}) {
  const iconClass = tone === 'success' ? 'bg-mtm-success/10 text-mtm-success' : 'bg-mtm-primary-subtle text-mtm-primary';
  const valueClass = tone === 'success' ? 'text-mtm-success' : 'text-mtm-text';
  return (
    <div className="flex items-center gap-4 rounded-lg border border-mtm-border bg-mtm-surface px-4 py-4 shadow-card">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${iconClass}`}>{icon}</span>
      <div className="min-w-0">
        <p className={`truncate font-display text-xl font-bold ${valueClass}`}>{value}</p>
        <p className="text-sm font-semibold text-mtm-text">{label}</p>
        <p className="text-xs text-mtm-muted">{hint}</p>
      </div>
    </div>
  );
}
