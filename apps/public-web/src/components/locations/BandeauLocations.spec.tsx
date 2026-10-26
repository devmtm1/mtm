import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BandeauLocations, IMAGE_BANDEAU_LOCATIONS } from './BandeauLocations';

describe('BandeauLocations', () => {
  const base = {
    eyebrow: 'Locations',
    title: 'Trouvez votre prochain logement',
    description: 'Appartements, villas et studios.',
    points: ['Biens contrôlés', 'Loyer annoncé'],
    image: IMAGE_BANDEAU_LOCATIONS,
  };

  it('affiche les textes saisis', () => {
    render(<BandeauLocations {...base} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Trouvez votre prochain logement' })).toBeInTheDocument();
    expect(screen.getByText('Locations')).toBeInTheDocument();
    expect(screen.getByText('Appartements, villas et studios.')).toBeInTheDocument();
    expect(screen.getByText('Biens contrôlés')).toBeInTheDocument();
  });

  it('prend l’image du back-office, sinon la photo par défaut', () => {
    const { rerender } = render(<BandeauLocations {...base} />);
    expect(document.querySelector(`img[src="${IMAGE_BANDEAU_LOCATIONS}"]`)).not.toBeNull();
    rerender(<BandeauLocations {...base} image="https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/mtm/pages/fond" />);
    expect(document.querySelector('img[src*="res.cloudinary.com"]')).not.toBeNull();
  });

  it('n’affiche pas de liste vide quand aucun engagement n’est saisi', () => {
    render(<BandeauLocations {...base} points={[]} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
