import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ClientProprietairePage } from './ClientProprietairePage';
import type { ClientBienLocatif, ClientSyntheseProprietaire } from '../../types/locatif';

const donnees = vi.hoisted(() => ({
  valeur: {
    proprietaireBiens: [] as ClientBienLocatif[] | null,
    proprietaireSynthese: null as ClientSyntheseProprietaire | null,
    proprietaireDocuments: [] as unknown[],
    proprietaireLoading: false,
  },
}));

vi.mock('../../contexts/client-data-store', () => ({ useClientData: () => donnees.valeur }));

const bienALaNuit = (extra: Partial<ClientBienLocatif> = {}): ClientBienLocatif => ({
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
  ...extra,
});

const synthese = (extra: Partial<ClientSyntheseProprietaire> = {}): ClientSyntheseProprietaire => ({
  biens: 1,
  loues: 1,
  biensALaNuit: 1,
  sejoursAVenir: 0,
  sejoursEncaisses: 100000,
  loyersDus: 0,
  loyersEncaisses: 0,
  solde: 0,
  echeancesImpayees: 0,
  ...extra,
});

const afficher = () =>
  render(
    <MemoryRouter>
      <ClientProprietairePage />
    </MemoryRouter>,
  );

describe('ClientProprietairePage — courte durée', () => {
  it('ne dit pas « aucun bail » d’un bien en courte durée : il montre ses séjours', () => {
    donnees.valeur.proprietaireBiens = [bienALaNuit()];
    donnees.valeur.proprietaireSynthese = synthese();
    afficher();

    expect(screen.queryByText(/Aucun bail en cours/)).toBeNull();
    expect(screen.getByText('Courte durée')).toBeTruthy();
    expect(screen.getByText('Occupé en ce moment')).toBeTruthy();
    expect(screen.getByText('Aïssatou B.')).toBeTruthy();
    expect(screen.getByText(/4 nuits/)).toBeTruthy();
    expect(screen.getByText('En cours')).toBeTruthy();
  });

  it('compte le bien occupé parmi les biens loués et montre les séjours encaissés', () => {
    donnees.valeur.proprietaireBiens = [bienALaNuit()];
    donnees.valeur.proprietaireSynthese = synthese();
    afficher();

    expect(screen.getByText('1 / 1')).toBeTruthy();
    expect(screen.getByText('Biens loués ou occupés')).toBeTruthy();
    expect(screen.getByText('Séjours encaissés')).toBeTruthy();
  });

  it('dit qu’un bien en courte durée sans séjour est libre', () => {
    donnees.valeur.proprietaireBiens = [
      bienALaNuit({ occupation: 'libre', sejours: [], sejoursEncaisses: 0 }),
    ];
    donnees.valeur.proprietaireSynthese = synthese({ loues: 0, sejoursEncaisses: 0 });
    afficher();

    expect(screen.getByText('Libre')).toBeTruthy();
    expect(screen.getByText('Aucun séjour confirmé pour l’instant.')).toBeTruthy();
  });

  it('garde « Aucun bail en cours » pour un bien au mois sans locataire', () => {
    donnees.valeur.proprietaireBiens = [
      bienALaNuit({ modeLocation: 'longue_duree', occupation: null, sejours: [], sejoursEncaisses: 0 }),
    ];
    donnees.valeur.proprietaireSynthese = synthese({ loues: 0, biensALaNuit: 0, sejoursEncaisses: 0 });
    afficher();

    expect(screen.getByText('Aucun bail en cours sur ce bien.')).toBeTruthy();
    expect(screen.queryByText('Courte durée')).toBeNull();
  });
});
