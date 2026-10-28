import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientLayout } from './ClientLayout';

type Source = { data: unknown; loading: boolean; error: string | null; refetch: () => void };

const sources = vi.hoisted(() => ({
  valeurs: {} as Record<string, { data: unknown; loading: boolean; error: string | null; refetch: () => void }>,
}));

const source = (data: unknown, loading = false): Source => ({ data, loading, error: null, refetch: () => {} });

vi.mock('../../../hooks/useClientPortal', () => ({
  useClientPortal: () => sources.valeurs.dossiers,
  useClientDemandes: () => sources.valeurs.demandes,
  useClientMissions: () => sources.valeurs.missions,
  useClientChantiers: () => sources.valeurs.chantiers,
  useProprietaireBiens: () => sources.valeurs.biens,
  useProprietaireSynthese: () => sources.valeurs.synthese,
  useProprietaireDocuments: () => sources.valeurs.releves,
  useLocataireBaux: () => sources.valeurs.baux,
  useLocatairePaiements: () => sources.valeurs.paiements,
  useLocataireIncidents: () => sources.valeurs.incidents,
}));
vi.mock('../../../hooks/useClientNotifications', () => ({
  useClientNotifications: () => source({ items: [], nonLues: 0 }),
}));
vi.mock('../../../hooks/usePullToRefresh', () => ({ usePullToRefresh: () => ({ pull: 0, refreshing: false }) }));
vi.mock('../../../contexts/auth-context-store', () => ({
  useAuth: () => ({ user: { firstName: 'Awa', lastName: 'Diop', email: 'awa@exemple.test' }, accessToken: 'jeton', logout: async () => {} }),
}));
vi.mock('../../ui/toast-store', () => ({ useToast: () => ({ show: () => {} }) }));
vi.mock('../../layout/ScrollManager', () => ({ ScrollManager: () => null }));
vi.mock('../../layout/RouteAnnouncer', () => ({ RouteAnnouncer: () => null }));

const document = { id: 'doc1', type: 'quittance', title: 'Quittance', createdAt: '2026-10-20T00:00:00Z', secureUrl: 'https://x/doc1' };

/** Un compte vierge : aucune donnée chargée, rien de rattaché. */
function compte(surcharge: Record<string, Source> = {}) {
  sources.valeurs = {
    dossiers: source([]),
    demandes: source({ messages: [], reservations: [] }),
    missions: source([]),
    chantiers: source([]),
    biens: source(null),
    synthese: source(null),
    releves: source(null),
    baux: source(null),
    paiements: source(null),
    incidents: source(null),
    ...surcharge,
  };
}

const afficher = () =>
  render(
    <MemoryRouter initialEntries={['/espace-client']}>
      <Routes>
        <Route path="/espace-client" element={<ClientLayout />}>
          <Route index element={<p>Accueil</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const onglet = (nom: string) => screen.queryAllByRole('link', { name: nom }).length > 0;

describe('ClientLayout — espaces proposés selon le compte', () => {
  beforeEach(() => compte());

  it('un compte neuf voit les écrans d’un acheteur', () => {
    afficher();

    expect(onglet('Dossiers')).toBe(true);
    expect(onglet('Vérifications')).toBe(true);
    expect(onglet('Demandes')).toBe(true);
  });

  it('un propriétaire sans vente ne voit ni « Dossiers » ni « Vérifications »', () => {
    compte({ biens: source([{ id: 'b1' }]), baux: source(null) });
    afficher();

    expect(onglet('Mon bien')).toBe(true);
    expect(onglet('Dossiers')).toBe(false);
    expect(onglet('Vérifications')).toBe(false);
  });

  it('un propriétaire qui a déjà demandé une vérification la retrouve', () => {
    compte({ biens: source([{ id: 'b1' }]), missions: source([{ id: 'm1' }]) });
    afficher();

    expect(onglet('Vérifications')).toBe(true);
  });

  it('un locataire voit « Ma location » et pas « Dossiers »', () => {
    compte({ baux: source([{ id: 'bail1', statut: 'actif', documents: [], solde: { resteADevoir: 0 }, echeances: [] }]) });
    afficher();

    expect(onglet('Ma location')).toBe(true);
    expect(onglet('Dossiers')).toBe(false);
  });

  it('pendant le chargement, rien ne disparaît', () => {
    compte({ biens: source(null, true), dossiers: source(null, true) });
    afficher();

    expect(onglet('Dossiers')).toBe(true);
  });

  it('« Documents » n’apparaît que si le compte a au moins un document', () => {
    afficher();
    expect(onglet('Documents')).toBe(false);
  });

  it('« Documents » apparaît dès qu’un relevé ou une quittance existe', () => {
    compte({ releves: source([document]), biens: source([{ id: 'b1' }]) });
    afficher();

    expect(onglet('Documents')).toBe(true);
  });
});
