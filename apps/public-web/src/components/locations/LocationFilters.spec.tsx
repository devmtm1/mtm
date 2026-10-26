import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LocationFilters } from './LocationFilters';

vi.mock('../../hooks/useLocations', () => ({
  useLocationFilterOptions: () => ({
    data: { type: ['appartement', 'villa'], region: ['Dakar'], commune: ['Almadies'], chambres: [1, 2], loyerMin: 100000, loyerMax: 900000, sejours: 0, longueDuree: 3 },
  }),
}));

describe('LocationFilters (panneau)', () => {
  it('montre quatre critères essentiels et range les autres derrière « Plus de filtres »', async () => {
    render(<LocationFilters value={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Type de bien')).toBeInTheDocument();
    expect(screen.getByLabelText('Commune / quartier')).toBeInTheDocument();
    expect(screen.getByLabelText('Chambres')).toBeInTheDocument();
    expect(screen.getByLabelText('Loyer maximum (FCFA)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Région')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Plus de filtres/ }));
    expect(screen.getByLabelText('Région')).toBeInTheDocument();
    expect(screen.getByLabelText('Loyer minimum (FCFA)')).toBeInTheDocument();
    expect(screen.getByLabelText('Surface minimum (m²)')).toBeInTheDocument();
    expect(screen.getByLabelText('Ameublement')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Moins de filtres/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('ouvre d’emblée les critères avancés quand l’un d’eux est déjà utilisé', () => {
    render(<LocationFilters value={{ region: 'Dakar' }} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Région')).toHaveValue('Dakar');
  });

  it('signale le nombre de critères avancés actifs quand ils sont repliés', async () => {
    render(<LocationFilters value={{ loyerMin: 150000, meuble: true }} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Moins de filtres/ }));
    expect(screen.getByRole('button', { name: /Plus de filtres\s*2/ })).toBeInTheDocument();
  });

  it('transmet un changement de critère et remet la page à 1', async () => {
    const onChange = vi.fn();
    render(<LocationFilters value={{ page: 3 }} onChange={onChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Type de bien'), 'villa');
    expect(onChange).toHaveBeenCalledWith({ type: 'villa', page: 1 });
  });

  it('propose « Tout effacer » seulement quand un critère est utilisé', async () => {
    const onReset = vi.fn();
    const { rerender } = render(<LocationFilters value={{}} onChange={vi.fn()} onReset={onReset} />);
    expect(screen.queryByRole('button', { name: 'Tout effacer' })).not.toBeInTheDocument();
    rerender(<LocationFilters value={{ type: 'villa' }} onChange={vi.fn()} onReset={onReset} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tout effacer' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('en mode feuille, montre tous les critères sans panneau', () => {
    render(<LocationFilters value={{}} onChange={vi.fn()} sheet />);
    expect(screen.getByLabelText('Région')).toBeInTheDocument();
    expect(screen.getByLabelText('Ameublement')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Plus de filtres/ })).not.toBeInTheDocument();
  });
});
