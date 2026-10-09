import { useCallback, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Building2, Home, Info, KeyRound, LayoutGrid, type LucideIcon } from 'lucide-react';
import { ROUTES } from '../../routes';
import { ServicesSheet } from './ServicesSheet';
import { isServiceRoute } from './services-links';

/** Hauteur de la barre, que la mise en page réserve en bas des écrans. */
export const TAB_BAR_HEIGHT = '4.25rem';

interface LinkTab {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const tabClass = (active: boolean): string =>
  `relative flex h-[4.25rem] w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors active:scale-95 ${
    active ? 'text-mtm-primary' : 'text-mtm-muted'
  }`;

/** Icône, libellé et trait sous l'onglet actif : l'état ne repose pas sur la seule couleur. */
function TabContent({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active: boolean }) {
  return (
    <>
      <Icon
        className={`h-[22px] w-[22px] transition-transform duration-200 ${active ? '-translate-y-0.5 scale-110' : ''}`}
        strokeWidth={active ? 2.4 : 2}
        aria-hidden="true"
      />
      {label}
      <span
        aria-hidden="true"
        className={`absolute bottom-1.5 h-[3px] w-5 rounded-full bg-mtm-primary transition-all duration-200 ${
          active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
        }`}
      />
    </>
  );
}

/**
 * Barre d'onglets de l'application mobile, composée de ce que MTM propose :
 * l'accueil, les biens à vendre, les locations, les services (gestion locative,
 * construction, démarches) et la présentation de MTM (À propos, avec son
 * équipe). L'espace client reste à un geste, via l'icône du compte dans la
 * barre du haut et le menu ; pour joindre l'équipe, le bouton d'actions
 * rapides est toujours à portée de pouce.
 */
export function MobileTabBar() {
  const { pathname } = useLocation();
  const [servicesOpen, setServicesOpen] = useState(false);
  const closeServices = useCallback(() => setServicesOpen(false), []);

  const before: LinkTab[] = [
    { to: ROUTES.home, label: 'Accueil', icon: Home, end: true },
    { to: ROUTES.catalog, label: 'Biens', icon: Building2 },
    { to: ROUTES.locations, label: 'Locations', icon: KeyRound },
  ];
  const apropos: LinkTab = { to: ROUTES.about, label: 'À propos', icon: Info };
  const servicesActive = servicesOpen || isServiceRoute(pathname);

  return (
    <>
      <nav
        aria-label="Navigation de l’application"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-mtm-border/70 bg-mtm-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(31,41,55,0.07)] backdrop-blur-xl lg:hidden"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5">
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
            <NavLink to={apropos.to} className={({ isActive }) => tabClass(isActive)}>
              {({ isActive }) => <TabContent icon={apropos.icon} label={apropos.label} active={isActive} />}
            </NavLink>
          </li>
        </ul>
      </nav>

      {servicesOpen && <ServicesSheet onClose={closeServices} />}
    </>
  );
}
