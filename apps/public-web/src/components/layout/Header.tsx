import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, User, X } from 'lucide-react';
import { ROUTES } from '../../routes';
import { useAuth } from '../../contexts/auth-context-store';

const PRIMARY_LINKS = [
  { to: ROUTES.home, label: 'Accueil' },
  { to: ROUTES.catalog, label: 'Nos terrains' },
  { to: ROUTES.realisations, label: 'Nos réalisations' },
  { to: ROUTES.projetsAVenir, label: 'Projets à venir' },
  { to: ROUTES.about, label: 'À propos' },
];

const SERVICE_LINKS = [
  { to: ROUTES.gestionLocative, label: 'Gestion locative' },
  { to: ROUTES.construction, label: 'Construction' },
  { to: ROUTES.demarches, label: 'Démarches administratives' },
];

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `text-sm font-semibold transition-colors ${
    isActive ? 'text-mtm-primary' : 'text-mtm-text hover:text-mtm-primary'
  }`;
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const { user } = useAuth();
  const { pathname } = useLocation();
  const clientLabel = user ? user.firstName : 'Espace client';

  // Filet de sécurité : tout changement de route referme les menus, quelle
  // que soit la façon dont la navigation a été déclenchée (clic, clavier,
  // bouton Retour du navigateur).
  useEffect(() => {
    setMobileOpen(false);
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
    <header className="sticky top-0 z-40 border-b border-mtm-border bg-mtm-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <NavLink to={ROUTES.home} className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <img src="/logomtm.jpeg" alt="MTM Immobilier" className="h-11 w-11 rounded-full object-cover" />
          <span className="font-display text-lg font-bold text-mtm-text">MTM Immobilier</span>
        </NavLink>

        <nav className="hidden items-center gap-6 lg:flex">
          {PRIMARY_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClass} end={link.to === ROUTES.home}>
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
              className="flex items-center gap-1 text-sm font-semibold text-mtm-text hover:text-mtm-primary"
              onClick={() => setServicesOpen((open) => !open)}
              aria-expanded={servicesOpen}
            >
              Services
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
            {servicesOpen && (
              <div className="absolute left-0 top-full w-56 rounded-md border border-mtm-border bg-mtm-surface py-2 shadow-card">
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

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-mtm-text lg:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="border-t border-mtm-border bg-mtm-surface px-4 pb-4 lg:hidden">
          <ul className="flex flex-col gap-1 pt-2">
            {[...PRIMARY_LINKS, ...SERVICE_LINKS, { to: ROUTES.actualites, label: 'Actualités' }, { to: ROUTES.clientPortal, label: clientLabel }, { to: ROUTES.contact, label: 'Contact' }].map(
              (link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    className="block rounded-md px-3 py-2.5 text-sm font-semibold text-mtm-text hover:bg-mtm-bg hover:text-mtm-primary"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </NavLink>
                </li>
              ),
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
