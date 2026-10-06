import { NavLink } from 'react-router-dom';
import { Heart, Home, MessageCircle, UserRound, type LucideIcon } from 'lucide-react';
import { ROUTES } from '../../routes';
import { useAuth } from '../../contexts/auth-context-store';
import { useFavorites } from '../../hooks/useFavorites';

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Pastille de compte (favoris enregistrés) : jamais affichée à zéro. */
  badge?: number;
}

/** Hauteur de la barre, que la mise en page réserve en bas des écrans. */
export const TAB_BAR_HEIGHT = '4.25rem';

/**
 * Barre d'onglets de l'application mobile : accueil, favoris, messages, profil.
 * « Messages » et « Profil » mènent à l'espace du client connecté, et à la page
 * de contact ou de connexion pour un visiteur.
 */
export function MobileTabBar() {
  const { user } = useAuth();
  const { count } = useFavorites();
  const estClient = Boolean(user?.roles.includes('client'));

  const tabs: Tab[] = [
    { to: ROUTES.home, label: 'Accueil', icon: Home, end: true },
    { to: ROUTES.favoris, label: 'Favoris', icon: Heart, badge: count },
    {
      to: estClient ? ROUTES.clientDemandes : ROUTES.contact,
      label: 'Messages',
      icon: MessageCircle,
    },
    {
      to: user ? ROUTES.clientCompte : ROUTES.clientLogin,
      label: 'Profil',
      icon: UserRound,
    },
  ];

  return (
    <nav
      aria-label="Navigation de l’application"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-mtm-border/70 bg-mtm-surface/92 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(31,41,55,0.07)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {tabs.map(({ to, label, icon: Icon, end, badge }) => (
          <li key={label}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex h-[4.25rem] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors active:scale-95 ${
                  isActive ? 'text-mtm-primary' : 'text-mtm-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon
                      className={`h-[22px] w-[22px] transition-transform duration-200 ${isActive ? '-translate-y-0.5 scale-110' : ''}`}
                      strokeWidth={isActive ? 2.4 : 2}
                      aria-hidden="true"
                    />
                    {badge !== undefined && badge > 0 && (
                      <span
                        className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-mtm-accent px-1 text-[10px] font-bold leading-none text-white"
                        aria-label={`${badge} favori${badge > 1 ? 's' : ''}`}
                      >
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </span>
                  {label}
                  {/* Trait sous l'onglet actif : l'état ne repose pas sur la seule couleur. */}
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-1.5 h-[3px] w-5 rounded-full bg-mtm-primary transition-all duration-200 ${
                      isActive ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
                    }`}
                  />
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
