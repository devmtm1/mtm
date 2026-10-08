import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CatalogStatutSwitch } from './CatalogStatutSwitch';
import { SoldPropertyCard } from './SoldPropertyCard';
import type { Terrain } from '../../types/terrain';

const options = vi.hoisted(() => ({ vendus: 0 }));
vi.mock('../../hooks/useTerrainFilterOptions', () => ({
  useTerrainFilterOptions: () => ({ data: { vendus: options.vendus } }),
}));

const vendu = {
  id: 't9',
  statutCommercial: 'Vendu',
  venduLe: '2026-09-15T00:00:00Z',
  referenceInterne: 'MTM-TH-009',
  nom: 'Villa vendue à Saly',
  commune: 'Saly',
  region: 'Thiès',
  typeBien: 'villa',
  prixPublic: null,
  medias: [{ id: 'm1', type: 'photo', title: null, isPublic: true, sortOrder: 0, secureUrl: 'https://img/1.jpg', capturedAt: null, createdAt: 'x' }],
} as unknown as Terrain;

describe('SoldPropertyCard', () => {
  it('montre le badge rouge « Vendu », le lieu et le mois de la vente, jamais un prix', () => {
    render(
      <MemoryRouter>
        <SoldPropertyCard terrain={vendu} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Vendu')).toHaveClass('bg-mtm-accent');
    expect(screen.getByText('Villa vendue à Saly')).toBeInTheDocument();
    expect(screen.getByText('Saly, Thiès')).toBeInTheDocument();
    expect(screen.getByText('Vendu en septembre 2026')).toBeInTheDocument();
    expect(screen.queryByText(/FCFA/)).not.toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/terrains/t9');
  });

  it('sans date de vente, reste simplement « Vendu »', () => {
    render(
      <MemoryRouter>
        <SoldPropertyCard terrain={{ ...vendu, venduLe: null }} />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Vendu').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Vendu en/)).not.toBeInTheDocument();
  });
});

describe('CatalogStatutSwitch', () => {
  it('n’existe pas tant que MTM n’affiche aucune référence vendue', () => {
    options.vendus = 0;
    const { container } = render(<CatalogStatutSwitch value="tous" onChange={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('propose Tous, À vendre et Vendus (n), avec le choix courant marqué', () => {
    options.vendus = 3;
    render(<CatalogStatutSwitch value="vendu" onChange={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Tous' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'À vendre' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Vendus (3)' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('signale le choix du visiteur', () => {
    options.vendus = 2;
    const onChange = vi.fn();
    render(<CatalogStatutSwitch value="tous" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'À vendre' }));
    expect(onChange).toHaveBeenCalledWith('disponible');
  });
});
