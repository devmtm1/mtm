import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TerrainFilters } from './TerrainFilters';
import type { TerrainFilters as TerrainFiltersValue } from '../../types/terrain';

vi.mock('../../hooks/useTerrainFilterOptions', () => ({
  useTerrainFilterOptions: () => ({
    data: {
      statutJuridique: ['Titre foncier'],
      region: ['Thiès'],
      commune: ['Saly'],
      vocation: ['Habitation'],
      typeBien: ['terrain', 'villa'],
      nombrePieces: ['F1', 'F2', 'F3', 'F4'],
    },
    loading: false,
    error: null,
  }),
}));

function renderFilters(value: TerrainFiltersValue = {}) {
  const onChange = vi.fn();
  render(
    <MemoryRouter>
      <TerrainFilters value={value} onChange={onChange} />
    </MemoryRouter>,
  );
  return onChange;
}

/**
 * Le bâti et le sol ne se décrivent pas avec les mêmes critères : une villa a
 * une typologie, une parcelle a un usage. Les deux partagent un emplacement,
 * et un critère qui disparaît doit se libérer — sinon le catalogue filtrerait
 * sur quelque chose que le visiteur ne voit plus et ne peut plus annuler.
 */
describe('TerrainFilters — usage du sol et typologie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propose l’usage du terrain tant qu’aucune nature bâtie n’est choisie', () => {
    renderFilters({});

    expect(screen.getByLabelText('Usage du terrain')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre de pièces')).not.toBeInTheDocument();
  });

  it('garde l’usage du terrain quand la recherche porte sur des parcelles', () => {
    renderFilters({ typeBien: 'terrain' });

    expect(screen.getByLabelText('Usage du terrain')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nombre de pièces')).not.toBeInTheDocument();
  });

  it('remplace l’usage du terrain par la typologie sur un bien bâti', () => {
    renderFilters({ typeBien: 'villa' });

    expect(screen.getByLabelText('Nombre de pièces')).toBeInTheDocument();
    expect(screen.queryByLabelText('Usage du terrain')).not.toBeInTheDocument();
  });

  it('libère l’usage du sol en passant sur une villa', () => {
    const onChange = renderFilters({ typeBien: 'terrain', vocation: 'Habitation' });

    fireEvent.change(screen.getByLabelText('Type de bien'), { target: { value: 'villa' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ typeBien: 'villa' }),
    );
    expect(onChange.mock.calls[0][0]).not.toHaveProperty('vocation');
  });

  it('libère la typologie en revenant sur les terrains', () => {
    const onChange = renderFilters({ typeBien: 'villa', nombrePieces: 'F3' });

    fireEvent.change(screen.getByLabelText('Type de bien'), { target: { value: 'terrain' } });

    expect(onChange.mock.calls[0][0]).not.toHaveProperty('nombrePieces');
  });
});
