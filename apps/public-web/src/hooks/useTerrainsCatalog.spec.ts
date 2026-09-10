import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTerrainsCatalog } from './useTerrainsCatalog';
import type { TerrainPage } from '../types/terrain';

const EMPTY_PAGE: TerrainPage = { items: [], total: 0, page: 1, pageSize: 12 };

describe('useTerrainsCatalog', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(EMPTY_PAGE),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('démarre en état de chargement puis expose les données reçues', async () => {
    const { result } = renderHook(() => useTerrainsCatalog({ region: 'Thiès' }));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(EMPTY_PAGE);
    expect(result.current.error).toBeNull();
  });

  it('appelle bien /terrains/public avec les filtres fournis', async () => {
    const { result } = renderHook(() => useTerrainsCatalog({ region: 'Thiès' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const calledUrl = vi.mocked(fetch).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('/terrains/public');
    expect(calledUrl).toContain('region=Th');
  });

  it('expose un message d’erreur lorsque la requête échoue', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Erreur serveur' }),
      }),
    );

    const { result } = renderHook(() => useTerrainsCatalog({}));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Erreur serveur');
    expect(result.current.data).toBeNull();
  });
});
