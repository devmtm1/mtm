import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TerrainCard } from './TerrainCard';
import type { Terrain } from '../../types/terrain';

const baseTerrain: Terrain = {
  id: 'terrain-1',
  referenceInterne: 'MTM-TH-024',
  nom: 'Belle parcelle à Thiès',
  statutJuridique: 'Titre foncier',
  niveauVerification: 'Vérifié',
  region: 'Thiès',
  commune: 'Thiès Nord',
  localisationDetail: null,
  latitude: null,
  longitude: null,
  superficie: 300,
  uniteSuperficie: 'm²',
  dimensions: null,
  prixPublic: 15000000,
  misEnAvant: true,
  accesRoutier: null,
  eauDisponible: null,
  electriciteDisponible: null,
  voisinage: null,
  vocation: null,
  proximiteAxes: null,
  pointsInteret: null,
  medias: [],
  documents: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderCard(terrain: Terrain = baseTerrain) {
  return render(
    <MemoryRouter>
      <TerrainCard terrain={terrain} />
    </MemoryRouter>,
  );
}

describe('TerrainCard', () => {
  it('affiche la référence, le nom et la localisation', () => {
    renderCard();
    expect(screen.getByText('MTM-TH-024')).toBeInTheDocument();
    expect(screen.getByText('Belle parcelle à Thiès')).toBeInTheDocument();
    expect(screen.getByText('Thiès Nord, Thiès')).toBeInTheDocument();
  });

  it('formate le prix public en FCFA', () => {
    renderCard();
    expect(screen.getByText('15 000 000 FCFA')).toBeInTheDocument();
  });

  it('affiche le badge "Mis en avant" quand misEnAvant est vrai', () => {
    renderCard();
    expect(screen.getByText('Mis en avant')).toBeInTheDocument();
  });

  it("n'affiche jamais de donnée interne (prix d'acquisition, marge, commission)", () => {
    const { container } = renderCard();
    // Le type Terrain public ne contient structurellement pas ces champs :
    // ce test garde une trace explicite de l'exigence de non-fuite (section 11 CDC).
    expect(container.textContent).not.toMatch(/acquisition|marge|commission/i);
  });

  it("renvoie vers la fiche détaillée du terrain", () => {
    renderCard();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/terrains/terrain-1');
  });
});
