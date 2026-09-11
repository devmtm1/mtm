import { Suspense, lazy, type ComponentType, type ReactNode } from 'react';
import { Route, BrowserRouter, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PageFallback } from './components/layout/PageFallback';
import { AuthProvider } from './contexts/AuthContext';
import { RequireClientAuth } from './components/auth/RequireClientAuth';
import { ROUTES } from './routes';

/**
 * Les pages secondaires sont chargées à la demande : elles n'ont pas à peser
 * sur le premier affichage. C'est surtout vrai du catalogue et de la fiche
 * terrain, qui embarquent Leaflet — auparavant inclus dans le bundle unique,
 * donc téléchargé même sur des pages sans carte. Accueil et page 404 restent
 * dans le bundle principal : ce sont les points d'entrée, leur différer le
 * chargement ajouterait un aller-retour réseau au pire moment.
 */
function lazyPage(loader: () => Promise<ComponentType>): ComponentType {
  return lazy(() => loader().then((Page) => ({ default: Page })));
}

const LAZY_ROUTES: { path: string; Page: ComponentType }[] = [
  { path: ROUTES.catalog, Page: lazyPage(() => import('./pages/CatalogPage').then((m) => m.CatalogPage)) },
  {
    path: '/terrains/:id',
    Page: lazyPage(() => import('./pages/TerrainDetailPage').then((m) => m.TerrainDetailPage)),
  },
  { path: ROUTES.about, Page: lazyPage(() => import('./pages/AboutPage').then((m) => m.AboutPage)) },
  {
    path: ROUTES.gestionLocative,
    Page: lazyPage(() => import('./pages/GestionLocativePage').then((m) => m.GestionLocativePage)),
  },
  {
    path: ROUTES.construction,
    Page: lazyPage(() => import('./pages/ConstructionPage').then((m) => m.ConstructionPage)),
  },
  {
    path: ROUTES.demarches,
    Page: lazyPage(() => import('./pages/DemarchesPage').then((m) => m.DemarchesPage)),
  },
  {
    path: ROUTES.realisations,
    Page: lazyPage(() => import('./pages/RealisationsPage').then((m) => m.RealisationsPage)),
  },
  {
    path: ROUTES.projetsAVenir,
    Page: lazyPage(() => import('./pages/ProjetsAVenirPage').then((m) => m.ProjetsAVenirPage)),
  },
  {
    path: ROUTES.actualites,
    Page: lazyPage(() => import('./pages/ActualitesPage').then((m) => m.ActualitesPage)),
  },
  { path: ROUTES.contact, Page: lazyPage(() => import('./pages/ContactPage').then((m) => m.ContactPage)) },
  { path: ROUTES.clientLogin, Page: lazyPage(() => import('./pages/LoginPage').then((m) => m.LoginPage)) },
];

const ClientPortalPage = lazyPage(() =>
  import('./pages/ClientPortalPage').then((m) => m.ClientPortalPage),
);

function Deferred({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path={ROUTES.home} element={<HomePage />} />

            {LAZY_ROUTES.map(({ path, Page }) => (
              <Route
                key={path}
                path={path}
                element={
                  <Deferred>
                    <Page />
                  </Deferred>
                }
              />
            ))}

            <Route
              path={ROUTES.clientPortal}
              element={
                <RequireClientAuth>
                  <Deferred>
                    <ClientPortalPage />
                  </Deferred>
                </RequireClientAuth>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
