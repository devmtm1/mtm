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
  it('une vente mise en avant ne porte que le badge rouge, sans badge « Vente »', () => {
    afficher({ featured: 'Mis en avant' });
    expect(screen.getByText('Mis en avant')).toHaveClass('bg-mtm-accent');
    expect(screen.queryByText('Vente')).not.toBeInTheDocument();
  });

  it('affiche les repères du bien sous le titre, avant le prix', () => {
    afficher({
      facts: [
        { icon: 'chambres', label: '4 ch.' },
        { icon: 'sallesEau', label: '3 sdb.' },
        { icon: 'surface', label: '250 m²' },
      ],
    });
    const reperes = screen.getByRole('list', { name: 'Caractéristiques' });
    expect(reperes).toHaveTextContent('4 ch.');
    expect(reperes).toHaveTextContent('3 sdb.');
    expect(reperes).toHaveTextContent('250 m²');
    expect(reperes.compareDocumentPosition(screen.getByText('30 000 000 FCFA')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('sans repères, aucune liste vide n’est affichée', () => {
    afficher();
    expect(screen.queryByRole('list', { name: 'Caractéristiques' })).not.toBeInTheDocument();
  });

  it('une vente ordinaire n’a aucun badge sur la photo', () => {
    afficher();
    expect(screen.queryByText('Vente')).not.toBeInTheDocument();
    expect(screen.queryByText('Mis en avant')).not.toBeInTheDocument();
  });

  it('une location mise à la une garde « Location » sous le badge rouge', () => {
    afficher({ kind: 'location', badge: 'Location', badgeTone: 'success', featured: 'À la une' });
    expect(screen.getByText('À la une').parentElement).toBe(screen.getByText('Location').parentElement);
  });

  it('une location à la une affiche « À la une »', () => {
    afficher({ kind: 'location', badge: 'Location', badgeTone: 'success', featured: 'À la une' });
    expect(screen.getByText('À la une')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
  });
});
