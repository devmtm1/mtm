import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getPublicTerrains } from '../services/public-api';
import type { Terrain } from '../domain/terrains/types';
import { useTerrainCatalog } from './useTerrainCatalog';

vi.mock('../services/public-api', () => ({
  getPublicTerrains: vi.fn(),
}));

const mockedGetPublicTerrains = vi.mocked(getPublicTerrains);

const terrains: Terrain[] = [
  {
    id: 'MTM-001', name: 'Dakar', location: 'Dakar', region: 'Dakar',
    size: '150 m²', price: '10 000 000 FCFA', status: 'Titre foncier',
    legalStatus: 'Titre foncier', tag: 'Disponible', image: '/terrain.jpg',
    superficieRaw: 150, prixPublicRaw: 10_000_000, misEnAvant: false,
  },
  {
    id: 'MTM-002', name: 'Thies', location: 'Thies', region: 'Thiès',
    size: '500 m²', price: '35 000 000 FCFA', status: 'Délibération',
    legalStatus: 'Délibération', tag: 'Disponible', image: '/terrain.jpg',
    superficieRaw: 500, prixPublicRaw: 35_000_000, misEnAvant: true,
  },
];

describe('useTerrainCatalog', () => {
  it('loads only API terrains and applies all filters', async () => {
    mockedGetPublicTerrains.mockResolvedValueOnce(terrains);
    const { result } = renderHook(() => useTerrainCatalog({
      region: 'Thiès',
      type: 'Terrain à bâtir',
      budget: 'Plus de 30 M',
      size: 'Plus de 400 m²',
      legalStatus: 'Délibération',
    }));

    await waitFor(() => expect(result.current.catalogue).toHaveLength(2));
    expect(result.current.filteredTerrains).toEqual([terrains[1]]);
    expect(mockedGetPublicTerrains).toHaveBeenCalledOnce();
  });

  it('returns an empty catalogue when the API fails', async () => {
    mockedGetPublicTerrains.mockRejectedValueOnce(new Error('API unavailable'));
    const { result } = renderHook(() => useTerrainCatalog({
      region: 'Toutes les zones', type: 'Terrain à bâtir',
      budget: 'Tous les budgets',
      size: 'Toutes les superficies', legalStatus: 'Tous les statuts',
    }));

    await waitFor(() => expect(mockedGetPublicTerrains).toHaveBeenCalled());
    expect(result.current.catalogue).toEqual([]);
    expect(result.current.filteredTerrains).toEqual([]);
  });
});