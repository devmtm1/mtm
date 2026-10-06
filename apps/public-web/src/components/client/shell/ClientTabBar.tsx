import { useCallback, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Ellipsis, LogOut, type LucideIcon } from 'lucide-react';
import { MobileSheet } from '../../mobile/MobileSheet';
import { ROUTES } from '../../../routes';

export interface ClientTab {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
}

/** Au-delà, les onglets ne tiennent plus sur une ligne : le reste passe dans « Plus ». */
export const MAX_VISIBLE_TABS = 5;

const tabClass = (active: boolean): string =>
  `relative flex h-[4.25rem] w-full flex-col items-center justify-center gap-1 px-0.5 text-[11px] font-semibold leading-none transition-colors active:scale-95 ${
    active ? 'text-mtm-primary' : 'text-mtm-muted'
  }`;

function TabContent({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active: boolean }) {
  return (
    <>
      <Icon
        className={`h-[22px] w-[22px] transition-transform duration-200 ${active ? '-translate-y-0.5 scale-110' : ''}`}
        strokeWidth={active ? 2.4 : 2}
        aria-hidden="true"
      />
      <span className="max-w-full truncate whitespace-nowrap">{label}</span>
      <span
        aria-hidden="true"
        className={`absolute bottom-1.5 h-[3px] w-5 rounded-full bg-mtm-primary transition-all duration-200 ${
          active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'
        }`}
      />
    </>
  );
}

const isActive = (tab: ClientTab, pathname: string): boolean =>
  tab.end ? pathname === tab.to : pathname.startsWith(tab.to);

/**
 * Onglets de l'espace client sur mobile : jamais plus de cinq, libellés sur une
 * seule ligne. Quand l'utilisateur a davantage d'espaces (chantier, bien,
 * location…), les derniers se rangent derrière « Plus », avec la déconnexion.
 */
export function ClientTabBar({ tabs, onLogout }: { tabs: ClientTab[]; onLogout: () => void }) {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = useCallback(() => setMoreOpen(false), []);

  const overflow = tabs.length > MAX_VISIBLE_TABS;
  const visible = overflow ? tabs.slice(0, MAX_VISIBLE_TABS - 1) : tabs;
  const hidden = overflow ? tabs.slice(MAX_VISIBLE_TABS - 1) : [];
  const moreActive = moreOpen || hidden.some((tab) => isActive(tab, pathname));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-mtm-border/70 bg-mtm-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(31,41,55,0.07)] backdrop-blur-xl lg:hidden"
        aria-label="Espace client"
      >
        <ul className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${visible.length + (overflow ? 1 : 0)}, minmax(0, 1fr))` }}>
          {visible.map((tab) => (
            <li key={tab.to}>
              <NavLink to={tab.to} end={tab.end} className={({ isActive: active }) => tabClass(active)}>
                {({ isActive: active }) => <TabContent icon={tab.icon} label={tab.label} active={active} />}
              </NavLink>
            </li>
          ))}
          {overflow && (
            <li>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
                className={tabClass(moreActive)}
              >
                <TabContent icon={Ellipsis} label="Plus" active={moreActive} />
              </button>
            </li>
          )}
        </ul>
      </nav>

      {moreOpen && (
        <MobileSheet title="Mon espace" onClose={closeMore}>
          <ul className="flex flex-col gap-1 pb-2">
            {hidden.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  onClick={closeMore}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 active:scale-[0.98] active:bg-mtm-bg"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-[15px] font-semibold text-mtm-text">{label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-mtm-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-col gap-1 border-t border-mtm-border pt-3">
            <Link
              to={ROUTES.home}
              onClick={closeMore}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-semibold text-mtm-text active:bg-mtm-bg"
            >
              <ArrowLeft className="h-5 w-5 text-mtm-muted" aria-hidden="true" />
              Retour au site
            </Link>
            <button
              type="button"
              onClick={() => {
                closeMore();
                onLogout();
              }}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-[15px] font-semibold text-mtm-accent active:bg-mtm-bg"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              Se déconnecter
            </button>
          </div>
        </MobileSheet>
      )}
    </>
  );
}
