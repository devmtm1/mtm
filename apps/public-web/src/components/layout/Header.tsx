import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Heart, User } from 'lucide-react';
import { ROUTES } from '../../routes';
import { useAuth } from '../../contexts/auth-context-store';
import { useFavorites } from '../../hooks/useFavorites';
import { PRIMARY_LINKS, SERVICE_LINKS } from './nav-links';

// Lien actif : couleur + filet sous le libellé, pour que l'état ne repose pas
// sur la seule couleur (lisibilité, daltonisme).
function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `relative whitespace-nowrap py-1 text-sm font-semibold transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-mtm-primary after:transition-transform after:duration-200 ${
    isActive
      ? 'text-mtm-primary after:scale-x-100'
      : 'text-mtm-text hover:text-mtm-primary after:scale-x-0 hover:after:scale-x-100'
  }`;
}

/**
 * En-tête de l'interface ordinateur. Sur téléphone et petite tablette, c'est
 * la barre d'application (`MobileAppBar`) qui prend le relais, avec son menu.
 */
export function Header() {
  const [servicesOpen, setServicesOpen] = useState(false);
  const { user } = useAuth();
  const { count: favoris } = useFavorites();
  const { pathname } = useLocation();
  const clientLabel = user ? user.firstName : 'Espace client';
  const servicesActive = SERVICE_LINKS.some((link) => pathname.startsWith(link.to));

  // Tout changement de route referme le menu déroulant, quelle que soit la
  // façon dont la navigation a été déclenchée (clic, clavier, bouton Retour).
  useEffect(() => {
    setServicesOpen(false);
  }, [pathname]);

  // Échap referme le menu déroulant, comme attendu de tout menu au clavier.
  useEffect(() => {
    if (!servicesOpen) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setServicesOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [servicesOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-mtm-border bg-mtm-surface/95 shadow-[0_1px_0_rgba(31,41,55,0.04)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <NavLink to={ROUTES.home} className="flex items-center gap-2.5">
          <img src="/logomtm.jpeg" alt="MTM Immobilier" className="h-11 w-11 rounded-full object-cover" />
          {/* Entre lg et xl, le menu n'a plus la place du nom : le logo seul suffit. */}
          <span className="hidden whitespace-nowrap font-display text-lg font-bold lg:hidden xl:inline">
            <span className="text-mtm-accent">MTM</span> <span className="text-mtm-primary">Immobilier</span>
          </span>
        </NavLink>

        <nav className="flex items-center gap-4 whitespace-nowrap xl:gap-5">
          {/* « Accueil » reste dans le menu mobile ; sur ordinateur, le logo y mène. */}
          {PRIMARY_LINKS.filter((link) => link.to !== ROUTES.home).map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass}>
              {link.label}
            </NavLink>
          ))}

          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button
              type="button"
              className={`flex items-center gap-1 py-1 text-sm font-semibold transition-colors hover:text-mtm-primary ${
                servicesActive ? 'text-mtm-primary' : 'text-mtm-text'
              }`}
              onClick={() => setServicesOpen((open) => !open)}
              aria-expanded={servicesOpen}
            >
              Services
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            {servicesOpen && (
              <div className="absolute left-0 top-full w-56 rounded-md border border-mtm-border bg-mtm-surface py-2 shadow-card-hover motion-safe:animate-slide-down">
                {SERVICE_LINKS.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setServicesOpen(false)}
                    className="block px-4 py-2 text-sm text-mtm-text hover:bg-mtm-bg hover:text-mtm-primary"
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          <NavLink to={ROUTES.actualites} className={navLinkClass}>
            Actualités
          </NavLink>
          {/* Les favoris se gardent sans compte : un visiteur qui a touché un
              cœur doit pouvoir les retrouver depuis l'ordinateur aussi. */}
          {favoris > 0 && (
            <NavLink
              to={ROUTES.favoris}
              aria-label={`Mes favoris (${favoris})`}
              className="relative flex items-center text-mtm-text hover:text-mtm-accent"
            >
              <Heart className="h-5 w-5" aria-hidden="true" />
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-mtm-accent px-1 text-[10px] font-bold leading-none text-white">
                {favoris}
              </span>
            </NavLink>
          )}
          <NavLink to={ROUTES.clientPortal} className="flex items-center gap-1.5 text-sm font-semibold text-mtm-text hover:text-mtm-primary">
            <User className="h-4 w-4" aria-hidden="true" />
            {clientLabel}
          </NavLink>
          <NavLink
            to={ROUTES.contact}
            className="rounded-md bg-mtm-primary px-4 py-2 text-sm font-semibold text-white hover:bg-mtm-primary-dark"
          >
            Contact
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
