import { Link, NavLink } from 'react-router-dom';
import {
  Building2,
  ChevronRight,
  FileSearch,
  Heart,
  Home,
  Info,
  KeyRound,
  Mail,
  MessageCircle,
  Newspaper,
  Phone,
  Sparkles,
  Hammer,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '../../routes';
import { useAuth } from '../../contexts/auth-context-store';
import { toTelHref, useSiteContact } from '../../hooks/useSiteContact';
import { useFavorites } from '../../hooks/useFavorites';
import { InstallAppRow } from './InstallAppRow';
import { MobileSheet } from './MobileSheet';

/** Icône de chaque destination : le menu se lit à l'image autant qu'au texte. */
const ICONS: Record<string, LucideIcon> = {
  [ROUTES.home]: Home,
  [ROUTES.catalog]: Building2,
  [ROUTES.locations]: KeyRound,
  [ROUTES.realisations]: Sparkles,
  [ROUTES.projetsAVenir]: Hammer,
  [ROUTES.about]: Info,
  [ROUTES.actualites]: Newspaper,
  [ROUTES.gestionLocative]: KeyRound,
  [ROUTES.construction]: Hammer,
  [ROUTES.demarches]: FileSearch,
};

const MAIN_LINKS = [
  { to: ROUTES.home, label: 'Accueil' },
  { to: ROUTES.catalog, label: 'Nos biens à vendre' },
  { to: ROUTES.locations, label: 'Locations' },
  { to: ROUTES.realisations, label: 'Nos réalisations' },
  { to: ROUTES.projetsAVenir, label: 'Projets à venir' },
  { to: ROUTES.about, label: 'À propos' },
  { to: ROUTES.actualites, label: 'Actualités' },
];

const SERVICE_LINKS = [
  { to: ROUTES.gestionLocative, label: 'Gestion locative' },
  { to: ROUTES.construction, label: 'Construction' },
  { to: ROUTES.demarches, label: 'Démarches administratives' },
];

function rowClass({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-semibold transition-colors active:scale-[0.98] ${
    isActive ? 'bg-mtm-primary-subtle text-mtm-primary' : 'text-mtm-text active:bg-mtm-bg'
  }`;
}

function LinkRow({ to, label, onNavigate }: { to: string; label: string; onNavigate: () => void }) {
  const Icon = ICONS[to] ?? ChevronRight;
  return (
    <li>
      <NavLink to={to} end={to === ROUTES.home} className={rowClass} onClick={onNavigate}>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="flex-1">{label}</span>
        <ChevronRight className="h-4 w-4 text-mtm-muted" aria-hidden="true" />
      </NavLink>
    </li>
  );
}

/** Menu complet de l'application mobile : destinations, services, contact direct et favoris. */
export function MobileMenuSheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { count: favoris } = useFavorites();
  const contact = useSiteContact();

  return (
    <MobileSheet title="Menu" onClose={onClose} from="right">
      <Link
        to={user ? ROUTES.clientPortal : ROUTES.clientLogin}
        onClick={onClose}
        className="mb-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-mtm-primary to-mtm-primary-dark p-4 text-white shadow-card active:scale-[0.98]"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">
            {user ? `${user.firstName} ${user.lastName}` : 'Espace client'}
          </span>
          <span className="block text-xs text-white/80">
            {user ? 'Mes dossiers, documents et demandes' : 'Suivez vos dossiers et documents'}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 text-white/80" aria-hidden="true" />
      </Link>

      <nav aria-label="Navigation principale">
        <ul className="flex flex-col gap-0.5">
          {MAIN_LINKS.map((link) => (
            <LinkRow key={link.to} {...link} onNavigate={onClose} />
          ))}
        </ul>

        <p className="mb-1 mt-5 px-3 text-xs font-bold uppercase tracking-wider text-mtm-muted">Nos services</p>
        <ul className="flex flex-col gap-0.5">
          {SERVICE_LINKS.map((link) => (
            <LinkRow key={link.to} {...link} onNavigate={onClose} />
          ))}
        </ul>
      </nav>

      <p className="mb-2 mt-5 px-3 text-xs font-bold uppercase tracking-wider text-mtm-muted">Nous joindre</p>
      <div className="grid grid-cols-3 gap-2">
        <a
          href={toTelHref(contact.telephone)}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-mtm-border bg-mtm-surface px-2 py-3 text-xs font-semibold text-mtm-text active:scale-95"
        >
          <Phone className="h-5 w-5 text-mtm-success" aria-hidden="true" />
          Appeler
        </a>
        <a
          href={`https://wa.me/${contact.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-mtm-border bg-mtm-surface px-2 py-3 text-xs font-semibold text-mtm-text active:scale-95"
        >
          <MessageCircle className="h-5 w-5 text-mtm-success" aria-hidden="true" />
          WhatsApp
        </a>
        <a
          href={`mailto:${contact.email}`}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-mtm-border bg-mtm-surface px-2 py-3 text-xs font-semibold text-mtm-text active:scale-95"
        >
          <Mail className="h-5 w-5 text-mtm-primary" aria-hidden="true" />
          E-mail
        </a>
      </div>


      <Link
        to={ROUTES.favoris}
        onClick={onClose}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-mtm-border px-3 py-3 text-[15px] font-semibold text-mtm-text active:scale-[0.98] active:bg-mtm-bg"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mtm-accent-subtle text-mtm-accent">
          <Heart className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="flex-1">Mes favoris</span>
        {favoris > 0 && (
          <span className="rounded-full bg-mtm-accent px-2 py-0.5 text-xs font-bold text-white">{favoris}</span>
        )}
        <ChevronRight className="h-4 w-4 text-mtm-muted" aria-hidden="true" />
      </Link>

      <InstallAppRow />
    </MobileSheet>
  );
}
