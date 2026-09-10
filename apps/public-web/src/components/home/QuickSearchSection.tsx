import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TerrainFilters } from '../terrains/TerrainFilters';
import type { TerrainFilters as TerrainFiltersValue } from '../../types/terrain';
import { ROUTES } from '../../routes';

export function QuickSearchSection() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TerrainFiltersValue>({});

  function handleSubmit(): void {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') params.set(key, String(value));
    }
    const query = params.toString();
    navigate(query ? `${ROUTES.catalog}?${query}` : ROUTES.catalog);
  }

  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 sm:px-6">
      <TerrainFilters value={filters} onChange={setFilters} onSubmit={handleSubmit} compact />
    </section>
  );
}
