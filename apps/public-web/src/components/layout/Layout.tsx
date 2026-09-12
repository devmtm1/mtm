import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { WhatsAppButton } from './WhatsAppButton';
import { ScrollManager } from './ScrollManager';
import { RouteAnnouncer } from './RouteAnnouncer';

const MAIN_ID = 'contenu-principal';

export function Layout() {
  // Clé sur le chemin seul : un changement de page rejoue l'animation
  // d'entrée, un changement de filtres (query string) sur la même page non.
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-mtm-bg text-mtm-text">
      <ScrollManager />

      {/* En-tête collant et navigation dense : un lien d'évitement épargne
          aux utilisateurs au clavier de traverser tout le menu à chaque page. */}
      <a
        href={`#${MAIN_ID}`}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-mtm-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Aller au contenu principal
      </a>

      <Header />
      {/* `tabIndex={-1}` rend le conteneur focusable par programme : c'est la
          cible du focus après chaque changement de route (voir RouteAnnouncer). */}
      <main id={MAIN_ID} tabIndex={-1} className="flex-1 outline-none">
        <div key={pathname} className="motion-safe:animate-page-in">
          <Outlet />
        </div>
      </main>
      <Footer />
      <WhatsAppButton />
      <RouteAnnouncer mainId={MAIN_ID} />
    </div>
  );
}
