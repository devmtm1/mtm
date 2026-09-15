import { useState } from 'react';
import { ArrowLeft, ChevronRight, KeyRound, LogOut, Mail, MessageCircle, Phone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context-store';
import { toTelHref, useSiteContact } from '../../hooks/useSiteContact';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientCard, ClientPageHeader } from '../../components/client/shell/ClientUi';
import { ChangePasswordForm } from '../../components/auth/ChangePasswordForm';
import { Modal } from '../../components/ui/Modal';
import { ROUTES } from '../../routes';

/** Identité, sécurité du compte, conseiller, et sortie de l'espace client. */
export function ClientAccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const contact = useSiteContact();
  const [passwordOpen, setPasswordOpen] = useState(false);
  usePageMetadata({ title: 'Mon compte' });

  async function handleLogout(): Promise<void> {
    await logout();
    navigate(ROUTES.home);
  }

  const initials = `${user?.firstName.charAt(0) ?? ''}${user?.lastName.charAt(0) ?? ''}`.toUpperCase();

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <ClientPageHeader title="Mon compte" />

      <ClientCard>
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-mtm-primary font-display text-lg font-bold text-white">
            {initials || '?'}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold text-mtm-text">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-sm text-mtm-muted">{user?.email}</p>
            <p className="mt-0.5 text-xs text-mtm-muted">Client MTM Immobilier</p>
          </div>
        </div>
      </ClientCard>

      <ClientCard title="Sécurité">
        <button
          type="button"
          onClick={() => setPasswordOpen(true)}
          className="flex w-full items-center gap-3 rounded-md py-1 text-left hover:text-mtm-primary"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mtm-primary-subtle text-mtm-primary">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-mtm-text">Changer mon mot de passe</span>
            <span className="block text-xs text-mtm-muted">Au moins 12 caractères, avec majuscule, chiffre et caractère spécial.</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-mtm-muted" aria-hidden="true" />
        </button>
      </ClientCard>

      <ClientCard title="Votre conseiller">
        <p className="text-sm text-mtm-muted">Une question sur un dossier, un paiement ou un document ? MTM vous répond du lundi au samedi.</p>
        <ul className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <li>
            <a href={toTelHref(contact.telephone)} className="flex items-center gap-2.5 rounded-md border border-mtm-border px-3 py-2.5 font-semibold text-mtm-text hover:border-mtm-primary hover:text-mtm-primary">
              <Phone className="h-4 w-4 shrink-0 text-mtm-primary" aria-hidden="true" />
              <span className="truncate">{contact.telephone}</span>
            </a>
          </li>
          <li>
            <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-md border border-mtm-border px-3 py-2.5 font-semibold text-mtm-text hover:border-mtm-primary hover:text-mtm-primary">
              <MessageCircle className="h-4 w-4 shrink-0 text-mtm-primary" aria-hidden="true" />
              WhatsApp
            </a>
          </li>
          <li>
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 rounded-md border border-mtm-border px-3 py-2.5 font-semibold text-mtm-text hover:border-mtm-primary hover:text-mtm-primary">
              <Mail className="h-4 w-4 shrink-0 text-mtm-primary" aria-hidden="true" />
              <span className="truncate">{contact.email}</span>
            </a>
          </li>
        </ul>
      </ClientCard>

      <ClientCard title="Comment ça marche ?">
        <ol className="flex flex-col gap-2 text-sm text-mtm-muted">
          <li><strong className="text-mtm-text">1.</strong> Vous réservez un terrain avec un acompte.</li>
          <li><strong className="text-mtm-text">2.</strong> Chaque paiement validé par MTM apparaît dans votre dossier, avec son reçu.</li>
          <li><strong className="text-mtm-text">3.</strong> Une fois le prix soldé, vous recevez vos documents définitifs.</li>
        </ol>
      </ClientCard>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Link
          to={ROUTES.home}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-mtm-border bg-mtm-surface px-4 py-2.5 text-sm font-semibold text-mtm-text hover:border-mtm-primary hover:text-mtm-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour au site
        </Link>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-mtm-accent/40 bg-mtm-surface px-4 py-2.5 text-sm font-semibold text-mtm-accent hover:bg-mtm-accent-subtle"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Se déconnecter
        </button>
      </div>

      {passwordOpen && (
        <Modal title="Changer mon mot de passe" onClose={() => setPasswordOpen(false)}>
          <ChangePasswordForm onSuccess={() => setPasswordOpen(false)} />
        </Modal>
      )}
    </div>
  );
}
