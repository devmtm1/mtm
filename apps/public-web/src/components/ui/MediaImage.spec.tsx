import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MediaImage } from './MediaImage';

describe('MediaImage', () => {
  it('affiche la première source disponible', () => {
    render(<MediaImage src="https://exemple.test/a.jpg" alt="Parcelle" />);
    expect(screen.getByRole('img', { name: 'Parcelle' })).toHaveAttribute(
      'src',
      'https://exemple.test/a.jpg',
    );
  });

  it('bascule sur la source suivante quand une URL est morte', () => {
    render(
      <MediaImage
        src={['https://exemple.test/morte.jpg', 'https://exemple.test/valide.jpg']}
        alt="Parcelle"
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: 'Parcelle' }));

    expect(screen.getByRole('img', { name: 'Parcelle' })).toHaveAttribute(
      'src',
      'https://exemple.test/valide.jpg',
    );
  });

  it('affiche le repli quand toutes les sources échouent', () => {
    render(<MediaImage src={['https://exemple.test/morte.jpg']} alt="Parcelle" />);

    fireEvent.error(screen.getByRole('img', { name: 'Parcelle' }));

    expect(screen.queryByRole('img', { name: 'Parcelle' })).not.toBeInTheDocument();
    expect(screen.getByText('Photo à venir')).toBeInTheDocument();
  });

  it('affiche le repli quand aucune source n’est fournie', () => {
    render(<MediaImage src={null} alt="Parcelle" fallbackLabel="Image à venir" />);
    expect(screen.getByText('Image à venir')).toBeInTheDocument();
  });
});
