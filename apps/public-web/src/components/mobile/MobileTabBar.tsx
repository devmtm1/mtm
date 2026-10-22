import { useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Building2, Home, KeyRound, LayoutGrid, Newspaper, type LucideIcon } from 'lucide-react';
import { ROUTES } from '../../routes';
import { ServicesSheet } from './ServicesSheet';
import { isServiceRoute } from './services-links';
import { montrerBarre, reinitialiserBarre, useBarreVisible } from './barre-flottante';

/**
 * Place que la barre occupe en bas de l'écran (sa hauteur plus sa marge) : la mise en page la
 * réserve sous le pied de page, et le bouton d'actions rapides se pose au-dessus.
 */
export const TAB_BAR_HEIGHT = '4.75rem';

interface LinkTab {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const tabClass = (active: boolean): string =>
  `relative flex h-16 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors active:scale-95 ${
    active ? 'text-mtm-primary' : 'text-mtm-muted'
  }`;

/** Icône sur une pastille colorée pour l'onglet actif, libellé dessous : l'état ne repose pas sur la seule couleur. */
function TabContent({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active: boolean }) {
  return (
    <>
      <span
        className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200 ${
          active ? 'bg-mtm-primary-subtle' : ''
        }`}
      >
        <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
      </span>
      {label}
    </>
  );
}

/**
 * Barre d'onglets de l'application mobile, composée de ce que MTM propose :
 * l'accueil, les biens à vendre, les locations, les services (gestion locative,
 * construction, démarches) et les vidéos de conseils et d'actualités. « À propos »
 * (avec l'équipe) reste dans le menu et le pied de page. L'espace client reste à un geste, via l'icône du compte dans la
 * barre du haut et le menu ; pour joindre l'équipe, le bouton d'actions
 * rapides est toujours à portée de pouce.
 */
export function MobileTabBar() {
  const { pathname } = useLocation();
  const [servicesOpen, setServicesOpen] = useState(false);
  const closeServices = useCallback(() => setServicesOpen(false), []);
  const barreVisible = useBarreVisible();
  // Nouvelle page : on repart en haut, la barre est de retour.
  useEffect(() => reinitialiserBarre(), [pathname]);

  const before: LinkTab[] = [
    { to: ROUTES.home, label: 'Accueil', icon: Home, end: true },
    { to: ROUTES.catalog, label: 'Biens', icon: Building2 },
    { to: ROUTES.locations, label: 'Locations', icon: KeyRound },
  ];
  const actualites: LinkTab = { to: ROUTES.actualites, label: 'Actualités', icon: Newspaper };
  const servicesActive = servicesOpen || isServiceRoute(pathname);

  return (
    <>
      <nav
        aria-label="Navigation de l’application"
        // Barre flottante : détachée des bords, contour fin, coins très arrondis. Elle se range vers
        // le bas quand on lit, et revient à la remontée (ou si le focus clavier y entre).
        className={`fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-[1.75rem] border border-mtm-border bg-mtm-surface/90 shadow-[0_10px_32px_rgba(31,41,55,0.18)] ring-1 ring-white/60 backdrop-blur-xl transition-transform duration-300 ease-out motion-reduce:transition-none lg:hidden ${
          barreVisible ? 'translate-y-0' : 'translate-y-[calc(100%+1.75rem+env(safe-area-inset-bottom))]'
        }`}
        onFocusCapture={montrerBarre}
      >
        <ul className="grid grid-cols-5 px-1">
          {before.map((tab) => (
            <li key={tab.label}>
              <NavLink to={tab.to} end={tab.end} className={({ isActive }) => tabClass(isActive)}>
                {({ isActive }) => <TabContent icon={tab.icon} label={tab.label} active={isActive} />}
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setServicesOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={servicesOpen}
              className={tabClass(servicesActive)}
            >
              <TabContent icon={LayoutGrid} label="Services" active={servicesActive} />
            </button>
          </li>
          <li>
            <NavLink to={actualites.to} className={({ isActive }) => tabClass(isActive)}>
              {({ isActive }) => <TabContent icon={actualites.icon} label={actualites.label} active={isActive} />}
            </NavLink>
          </li>
        </ul>
      </nav>

      {servicesOpen && <ServicesSheet onClose={closeServices} />}
    </>
  );
}
