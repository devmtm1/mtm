import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Menu, UserRound } from 'lucide-react';
import { ROUTES } from '../../routes';
import { useAuth } from '../../contexts/auth-context-store';
import { MobileMenuSheet } from './MobileMenuSheet';
import { isDetailRoute } from './mobile-routes';

/**
 * Barre supérieure de l'application mobile : la marque sur les écrans
 * principaux, un bouton retour sur les écrans de détail, puis l'accès au compte
 * et au menu. Reste collée en haut, comme dans une application native.
 */
export function MobileAppBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const detail = isDetailRoute(pathname);

  // Tout changement d'écran referme le menu, que la navigation vienne d'un lien
  // ou du bouton Retour du navigateur.
  useEffect(() => setMenuOpen(false), [pathname]);

  // Retour : l'écran précédent s'il existe dans l'application, sinon le parent
  // logique (quelqu'un qui arrive par un lien partagé n'a pas d'historique).
  function goBack(): void {
    if (window.history.length > 1) navigate(-1);
    else navigate(pathname.startsWith('/locations') ? ROUTES.locations : ROUTES.catalog);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-mtm-border/70 bg-mtm-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between gap-3 px-4">
          {detail ? (
            <button
              type="button"
              onClick={goBack}
              aria-label="Retour"
              className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-mtm-text active:scale-90 active:bg-mtm-bg"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>
          ) : (
            <Link to={ROUTES.home} className="flex min-w-0 items-center gap-2.5" aria-label="MTM Immobilier, accueil">
              <img src="/logomtm.jpeg" alt="" className="h-9 w-9 rounded-full object-cover shadow-card" />
              <span className="truncate font-display text-[17px] font-bold leading-none">
                <span className="text-mtm-accent">MTM</span> <span className="text-mtm-primary">Immobilier</span>
              </span>
            </Link>
          )}

          <div className="flex items-center gap-1">
            <Link
              to={user ? ROUTES.clientPortal : ROUTES.clientLogin}
              aria-label={user ? 'Mon espace client' : 'Se connecter à l’espace client'}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-mtm-text active:scale-90 active:bg-mtm-bg"
            >
              <UserRound className="h-[22px] w-[22px]" aria-hidden="true" />
              {user && (
                <span
                  aria-hidden="true"
                  className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-mtm-surface bg-mtm-success"
                />
              )}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu"
              aria-haspopup="dialog"
              className="-mr-1 flex h-10 w-10 items-center justify-center rounded-full text-mtm-text active:scale-90 active:bg-mtm-bg"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && <MobileMenuSheet onClose={closeMenu} />}
    </>
  );
}
