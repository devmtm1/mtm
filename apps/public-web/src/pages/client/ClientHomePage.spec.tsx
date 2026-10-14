import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ClientHomePage } from './ClientHomePage';
import type { ClientBienLocatif } from '../../types/locatif';

const donnees = vi.hoisted(() => ({
  valeur: {} as Record<string, unknown>,
}));

vi.mock('../../contexts/client-data-store', () => ({ useClientData: () => donnees.valeur }));
vi.mock('../../contexts/auth-context-store', () => ({ useAuth: () => ({ user: { firstName: 'Omr' } }) }));
vi.mock('../../hooks/useSiteContact', () => ({
  useSiteContact: () => ({ telephone: '+221770000000', whatsapp: '221770000000', email: 'contact@mtm.sn' }),
  toTelHref: (numero: string) => `tel:${numero}`,
}));
vi.mock('../../hooks/usePageMetadata', () => ({ usePageMetadata: () => undefined }));

const bien: ClientBienLocatif = {
  id: 'b1',
  referenceInterne: 'L-2026-0005',
  type: 'appartement',
  adresse: 'RUE 11, GUEDIAWAYE',
  commune: 'Guediawaye',
  region: 'Dakar',
  statut: 'disponible',
  modeLocation: 'courte_duree',
  occupation: 'occupe',
  sejoursEncaisses: 100000,
  sejours: [
    {
      id: 's1',
      referenceInterne: 'SJ-2026-0001',
      statut: 'en_cours',
      source: 'airbnb',
      dateArrivee: '2026-10-12',
      dateDepart: '2026-10-16',
      nuits: 4,
      voyageur: 'Aïssatou B.',
      montantTotal: 190000,
      encaisse: 100000,
    },
  ],
  bail: null,
};

/** Ce que reçoit un propriétaire : aucun dossier de vente, mais un bien. */
function compteProprietaire(biens: ClientBienLocatif[] = [bien]) {
  donnees.valeur = {
    dossiers: [],
    dossiersLoading: false,
    dossiersError: null,
    demandes: { messages: [], reservations: [] },
    demandesLoading: false,
    demandesError: null,
    missions: [],
    chantiers: null,
    proprietaireBiens: biens,
    proprietaireSynthese: null,
    proprietaireLoading: false,
    locataireBaux: null,
    locataireLoading: false,
    notificationsNonLues: 0,
  };
}

const afficher = () =>
  render(
    <MemoryRouter>
      <ClientHomePage />
    </MemoryRouter>,
  );

describe('ClientHomePage — compte propriétaire', () => {
  it('n’affiche aucune erreur ni carte « Mes dossiers » à qui n’a pas acheté', () => {
    compteProprietaire();
    afficher();

    expect(screen.queryByText(/Impossible de charger/)).toBeNull();
    expect(screen.queryByText('Mes dossiers')).toBeNull();
    expect(screen.getByText('Mon bien')).toBeTruthy();
  });

  it('ne souhaite pas la bienvenue comme à un compte vide quand un bien est confié', () => {
    compteProprietaire();
    afficher();

    expect(screen.queryByText('Bienvenue dans votre espace')).toBeNull();
    expect(screen.getByText('Tout est à jour')).toBeTruthy();
  });

  it('compte les séjours d’un bien à la nuit dans les revenus encaissés', () => {
    compteProprietaire();
    afficher();

    expect(screen.getAllByText(/100\s?000/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Aucun bail en cours')).toBeNull();
  });

  it('garde l’accueil de bienvenue pour un compte qui n’a encore rien', () => {
    compteProprietaire([]);
    donnees.valeur.proprietaireBiens = null;
    afficher();

    expect(screen.getByText('Bienvenue dans votre espace')).toBeTruthy();
    // Tuile et carte : un compte sans rien voit les deux.
    expect(screen.getAllByText('Mes dossiers')).toHaveLength(2);
  });
});
