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

  it('n’affiche pas de ligne « aucun bail » pour un bien au mois sans locataire : son état suffit', () => {
    donnees.valeur.proprietaireBiens = [
      bienALaNuit({ modeLocation: 'longue_duree', occupation: null, sejours: [], sejoursEncaisses: 0 }),
    ];
    donnees.valeur.proprietaireSynthese = synthese({ loues: 0, biensALaNuit: 0, sejoursEncaisses: 0 });
    afficher();

    expect(screen.queryByText(/Aucun bail en cours/)).toBeNull();
    expect(screen.getByText('Disponible')).toBeTruthy();
    expect(screen.queryByText('Courte durée')).toBeNull();
  });
});

describe('ClientProprietairePage — propriétés à plusieurs logements', () => {
  const logement = (id: string, lot: string): ClientBienLocatif =>
    bienALaNuit({
      id,
      referenceInterne: `L-2026-00${lot}`,
      numeroLot: lot,
      immeuble: { id: 'im1', nom: 'Villa Fall', type: 'villa' },
      modeLocation: 'longue_duree',
      occupation: null,
      sejours: [],
      sejoursEncaisses: 0,
    });

  it('regroupe les logements d’une propriété dans une seule carte, dans l’ordre des lots', () => {
    donnees.valeur.proprietaireBiens = [logement('b2', '2'), logement('b1', '1'), bienALaNuit({ id: 'b9', referenceInterne: 'L-2026-0099' })];
    donnees.valeur.proprietaireSynthese = synthese({ biens: 3 });
    afficher();

    expect(screen.getAllByRole('heading', { name: 'Villa Fall' })).toHaveLength(1);
    expect(screen.getByText(/Villa · Guediawaye, Dakar · 2 logements, 0 loué/)).toBeTruthy();
    const lots = screen.getAllByText(/^Logement \d/).map((n) => n.textContent?.slice(0, 10));
    expect(lots).toEqual(['Logement 1', 'Logement 2']);
    expect(screen.getByText('RUE 11, GUEDIAWAYE')).toBeTruthy();
  });

  it('sans activité, remplace les quatre « 0 FCFA » par une phrase', () => {
    donnees.valeur.proprietaireBiens = [logement('b1', '1')];
    donnees.valeur.proprietaireSynthese = synthese({ loues: 0, biensALaNuit: 0, sejoursEncaisses: 0 });
    afficher();

    expect(screen.queryByText('Loyers appelés')).toBeNull();
    expect(screen.getByText(/dès la signature d’un premier bail/)).toBeTruthy();
  });

  it('propose d’écrire à MTM à propos du bien, déjà identifié', () => {
    donnees.valeur.proprietaireBiens = [logement('b1', '1')];
    donnees.valeur.proprietaireSynthese = synthese();
    afficher();

    const lien = screen.getByRole('link', { name: /Une question sur ce bien/ });
    expect(lien.getAttribute('href')).toBe('/espace-client/demandes?bien=L-2026-001');
  });
});
