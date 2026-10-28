import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ClientDocumentsPage } from './ClientDocumentsPage';

const donnees = vi.hoisted(() => ({
  valeur: {
    dossiers: null as unknown,
    dossiersLoading: false,
    locataireBaux: null as unknown,
    locataireLoading: false,
    proprietaireDocuments: null as unknown,
    proprietaireLoading: false,
  },
}));

vi.mock('../../contexts/client-data-store', () => ({ useClientData: () => donnees.valeur }));

const afficher = () =>
  render(
    <MemoryRouter>
      <ClientDocumentsPage />
    </MemoryRouter>,
  );

describe('ClientDocumentsPage', () => {
  it('invite à patienter sans rien promettre quand le compte n’a aucun document', () => {
    donnees.valeur.dossiers = [];
    donnees.valeur.locataireBaux = null;
    donnees.valeur.proprietaireDocuments = null;
    afficher();

    expect(screen.getByText('Aucun document pour le moment')).toBeTruthy();
  });

  it('liste les documents de plusieurs espaces et filtre par espace', () => {
    donnees.valeur.dossiers = [
      {
        referenceInterne: 'DV-1',
        terrain: { nom: 'Terrain Bambilor' },
        documents: [{ id: 'd1', type: 'contrat_vente', title: 'Contrat de vente', version: 1, createdAt: '2026-10-10T00:00:00Z', secureUrl: 'https://x/d1' }],
      },
    ];
    donnees.valeur.locataireBaux = [
      {
        referenceInterne: 'B-1',
        bien: { adresse: 'Rue 11, Fann' },
        documents: [{ id: 'q1', type: 'quittance', title: 'Quittance de septembre', createdAt: '2026-10-20T00:00:00Z', secureUrl: 'https://x/q1' }],
      },
    ];
    donnees.valeur.proprietaireDocuments = null;
    afficher();

    expect(screen.getByText('Contrat de vente')).toBeTruthy();
    expect(screen.getByText('Quittance de septembre')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Location' }));
    expect(screen.queryByText('Contrat de vente')).toBeNull();
    expect(screen.getByText('Quittance de septembre')).toBeTruthy();
  });

  it('ne propose pas de filtre quand tous les documents viennent du même espace', () => {
    donnees.valeur.dossiers = [
      {
        referenceInterne: 'DV-1',
        terrain: null,
        documents: [{ id: 'd1', type: 'contrat_vente', title: 'Contrat de vente', version: 1, createdAt: '2026-10-10T00:00:00Z', secureUrl: 'https://x/d1' }],
      },
    ];
    donnees.valeur.locataireBaux = null;
    afficher();

    expect(screen.queryByRole('group', { name: 'Filtrer par espace' })).toBeNull();
  });
});
