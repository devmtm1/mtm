import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppPropertyCard, type AppPropertyCardData } from './AppPropertyCard';

const carte: AppPropertyCardData = {
  kind: 'terrain',
  id: 't1',
  to: '/terrains/t1',
  title: 'Grand terrain agricole',
  images: ['https://img/1.jpg'],
  badge: 'Vente',
  badgeTone: 'primary',
  price: '30 000 000 FCFA',
  place: 'Sébikotane, Dakar',
};

const afficher = (extra: Partial<AppPropertyCardData> = {}) =>
  render(
    <MemoryRouter>
      <AppPropertyCard card={{ ...carte, ...extra }} />
    </MemoryRouter>,
  );

describe('AppPropertyCard', () => {
  it('un bien mis en avant porte le badge rouge, avec la nature de l’offre en dessous', () => {
    afficher({ featured: 'Mis en avant' });
    expect(screen.getByText('Mis en avant')).toHaveClass('bg-mtm-accent');
    expect(screen.getByText('Vente')).toBeInTheDocument();
    // Les deux badges sont dans la même colonne : aucun ne cache l'autre.
    expect(screen.getByText('Mis en avant').parentElement).toBe(screen.getByText('Vente').parentElement);
  });

  it('sans mise en avant, seul le badge de l’offre s’affiche', () => {
    afficher();
    expect(screen.getByText('Vente')).toBeInTheDocument();
    expect(screen.queryByText('Mis en avant')).not.toBeInTheDocument();
  });

  it('une location à la une affiche « À la une »', () => {
    afficher({ kind: 'location', badge: 'Location', badgeTone: 'success', featured: 'À la une' });
    expect(screen.getByText('À la une')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
  });
});
