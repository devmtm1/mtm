import { useEffect, useMemo, useState } from 'react';
import type { Terrain } from '../domain/terrains/types';
import { getPublicTerrains } from '../services/public-api';

const PAGE_SIZE = 9;

type TerrainFilters = {
  region: string;
  type: string;
  budget: string;
  size: string;
  legalStatus: string;
};

function matchesType(terrain: Terrain, type: string) {
  if (type === 'Terrain à bâtir') return true;
  const vocation = (terrain.vocation ?? '').toLowerCase();
  if (type === 'Résidence')
    return vocation.includes('résidence') || vocation.includes('residentiel');
  if (type === 'Investissement') return vocation.includes('invest');
  return true;
}

function matchesBudget(terrain: Terrain, budget: string) {
  if (budget === 'Tous les budgets') return true;
  if (!terrain.prixPublicRaw) return false;
  if (budget === 'Moins de 15 M') return terrain.prixPublicRaw < 15_000_000;
  if (budget === '15 à 30 M') {
    return (
      terrain.prixPublicRaw >= 15_000_000 && terrain.prixPublicRaw < 30_000_000
    );
  }
  return terrain.prixPublicRaw >= 30_000_000;
}

function matchesSize(terrain: Terrain, size: string) {
  if (size === 'Toutes les superficies') return true;
  if (!terrain.superficieRaw) return false;
  if (size === 'Moins de 200 m²') return terrain.superficieRaw < 200;
  if (size === '200 à 400 m²') {
    return terrain.superficieRaw >= 200 && terrain.superficieRaw < 400;
  }
  return terrain.superficieRaw >= 400;
}

export function useTerrainCatalog(filters: TerrainFilters) {
  const [catalogue, setCatalogue] = useState<Terrain[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let active = true;
    void getPublicTerrains()
      .then((terrains) => {
        if (active) setCatalogue(terrains);
      })
      .catch(() => {
        if (active) setCatalogue([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredTerrains = useMemo(
    () =>
      [...catalogue]
        .sort((a, b) => Number(b.misEnAvant) - Number(a.misEnAvant))
        .filter(
          (terrain) =>
            (filters.region === 'Toutes les zones' ||
              terrain.region === filters.region) &&
            matchesType(terrain, filters.type) &&
            matchesBudget(terrain, filters.budget) &&
            matchesSize(terrain, filters.size) &&
            (filters.legalStatus === 'Tous les statuts' ||
              terrain.legalStatus === filters.legalStatus),
        ),
    [catalogue, filters],
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters]);

  const visibleTerrains = useMemo(
    () => filteredTerrains.slice(0, visibleCount),
    [filteredTerrains, visibleCount],
  );
  const hasMore = visibleCount < filteredTerrains.length;
  const loadMore = () => setVisibleCount((current) => current + PAGE_SIZE);

  return {
    catalogue,
    filteredTerrains,
    visibleTerrains,
    hasMore,
    total: filteredTerrains.length,
    loadMore,
  };
}
