import { useState } from 'react';
import { ArrowLeft, ChevronRight, KeyRound, LogOut, Mail, MessageCircle, Phone, type LucideIcon } from 'lucide-react';
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

      {/* Identité : l'avatar et le nom, sur le fond de la marque. */}
      <section className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-mtm-primary to-mtm-primary-dark p-5 text-white shadow-card lg:rounded-lg">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 font-display text-xl font-bold ring-2 ring-white/30">
          {initials || '?'}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="truncate text-sm text-white/80">{user?.email}</p>
          <p className="mt-0.5 text-xs text-white/75">Client MTM Immobilier</p>
        </div>
      </section>

      <ClientCard title="Sécurité">
        <button
          type="button"
          onClick={() => setPasswordOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl py-1 text-left transition-transform active:scale-[0.99]"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-mtm-text">Changer mon mot de passe</span>
            <span className="block text-xs text-mtm-muted">Au moins 12 caractères, avec majuscule, chiffre et caractère spécial.</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-mtm-muted" aria-hidden="true" />
        </button>
      </ClientCard>

      <ClientCard title="Votre conseiller">
        <p className="text-sm text-mtm-muted">Une question sur un dossier, un paiement ou un document ? MTM vous répond du lundi au samedi.</p>
        <ul className="mt-3 grid grid-cols-3 gap-2">
          <ContactTile href={toTelHref(contact.telephone)} icon={Phone} label="Appeler" tone="text-mtm-success" />
          <ContactTile href={`https://wa.me/${contact.whatsapp}`} icon={MessageCircle} label="WhatsApp" tone="text-mtm-success" external />
          <ContactTile href={`mailto:${contact.email}`} icon={Mail} label="E-mail" tone="text-mtm-primary" />
        </ul>
        <p className="mt-3 truncate text-xs text-mtm-muted">{contact.telephone} · {contact.email}</p>
      </ClientCard>

      <ClientCard title="Comment ça marche ?">
        <ol className="flex flex-col gap-2 text-sm text-mtm-muted">
          <li><strong className="text-mtm-text">1.</strong> Vous réservez un bien avec un acompte.</li>
          <li><strong className="text-mtm-text">2.</strong> Chaque paiement validé par MTM apparaît dans votre dossier, avec son reçu.</li>
          <li><strong className="text-mtm-text">3.</strong> Une fois le prix soldé, vous recevez vos documents définitifs.</li>
        </ol>
      </ClientCard>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Link
          to={ROUTES.home}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-mtm-border bg-mtm-surface px-4 py-3 text-sm font-semibold text-mtm-text transition-transform active:scale-[0.98] hover:border-mtm-primary hover:text-mtm-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour au site
        </Link>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-mtm-accent/40 bg-mtm-surface px-4 py-3 text-sm font-semibold text-mtm-accent transition-transform active:scale-[0.98] hover:bg-mtm-accent-subtle"
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

function ContactTile({ href, icon: Icon, label, tone, external = false }: { href: string; icon: LucideIcon; label: string; tone: string; external?: boolean }) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className="flex flex-col items-center gap-1.5 rounded-2xl border border-mtm-border bg-mtm-bg px-2 py-3 text-xs font-semibold text-mtm-text transition-transform active:scale-95"
      >
        <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
        {label}
      </a>
    </li>
  );
}
