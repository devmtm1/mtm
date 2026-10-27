import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BandeauPage, IMAGE_BANDEAU_PAGE } from './BandeauPage';

describe('BandeauPage', () => {
  const base = {
    eyebrow: 'Locations',
    title: 'Trouvez votre prochain logement',
    description: 'Appartements, villas et studios.',
    points: ['Biens contrôlés', 'Loyer annoncé'],
    image: IMAGE_BANDEAU_PAGE,
  };

  it('affiche les textes saisis', () => {
    render(<BandeauPage {...base} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Trouvez votre prochain logement' })).toBeInTheDocument();
    expect(screen.getByText('Locations')).toBeInTheDocument();
    expect(screen.getByText('Appartements, villas et studios.')).toBeInTheDocument();
    expect(screen.getByText('Biens contrôlés')).toBeInTheDocument();
  });

  it('prend l’image du back-office, sinon la photo par défaut', () => {
    const { rerender } = render(<BandeauPage {...base} />);
    expect(document.querySelector(`img[src="${IMAGE_BANDEAU_PAGE}"]`)).not.toBeNull();
    rerender(<BandeauPage {...base} image="https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/mtm/pages/fond" />);
    expect(document.querySelector('img[src*="res.cloudinary.com"]')).not.toBeNull();
  });

  it('n’affiche pas de liste vide quand aucun engagement n’est saisi', () => {
    render(<BandeauPage {...base} points={[]} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
