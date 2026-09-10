import { Route, BrowserRouter, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { TerrainDetailPage } from './pages/TerrainDetailPage';
import { AboutPage } from './pages/AboutPage';
import { GestionLocativePage } from './pages/GestionLocativePage';
import { ConstructionPage } from './pages/ConstructionPage';
import { DemarchesPage } from './pages/DemarchesPage';
import { RealisationsPage } from './pages/RealisationsPage';
import { ProjetsAVenirPage } from './pages/ProjetsAVenirPage';
import { ActualitesPage } from './pages/ActualitesPage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/LoginPage';
import { ClientPortalPage } from './pages/ClientPortalPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AuthProvider } from './contexts/AuthContext';
import { RequireClientAuth } from './components/auth/RequireClientAuth';
import { ROUTES } from './routes';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route path={ROUTES.catalog} element={<CatalogPage />} />
            <Route path="/terrains/:id" element={<TerrainDetailPage />} />
            <Route path={ROUTES.about} element={<AboutPage />} />
            <Route path={ROUTES.gestionLocative} element={<GestionLocativePage />} />
            <Route path={ROUTES.construction} element={<ConstructionPage />} />
            <Route path={ROUTES.demarches} element={<DemarchesPage />} />
            <Route path={ROUTES.realisations} element={<RealisationsPage />} />
            <Route path={ROUTES.projetsAVenir} element={<ProjetsAVenirPage />} />
            <Route path={ROUTES.actualites} element={<ActualitesPage />} />
            <Route path={ROUTES.contact} element={<ContactPage />} />
            <Route path={ROUTES.clientLogin} element={<LoginPage />} />
            <Route
              path={ROUTES.clientPortal}
              element={
                <RequireClientAuth>
                  <ClientPortalPage />
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
