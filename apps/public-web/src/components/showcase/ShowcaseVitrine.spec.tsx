import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShowcaseVitrine } from './ShowcaseVitrine';

let contenu: Record<string, string> = {};
vi.mock('../../hooks/useEditableContent', () => ({
  useEditableContent: () => ({ text: (cle: string, secours: string) => contenu[cle] ?? secours, lines: () => [], steps: () => [], loading: false, error: null }),
}));
vi.mock('../../hooks/useShowcase', () => ({
  useShowcase: () => ({
    data: [{ id: 'a', category: 'realisation', title: 'Aménagement foncier', description: 'Zone à fort potentiel', location: 'Saly', date: null, ordre: 1, imageUrl: null }],
    loading: false,
    error: null,
  }),
}));

const defauts = { eyebrow: 'Nos réalisations', title: 'Nos projets immobiliers', subtitle: 'Accroche par défaut', texte: 'Texte par défaut' };

function afficher() {
  return render(
    <MemoryRouter>
      <ShowcaseVitrine category="realisation" prefixe="realisations" defauts={defauts} emptyLabel="Rien" />
    </MemoryRouter>,
  );
}

describe('ShowcaseVitrine', () => {
  beforeEach(() => {
    contenu = {};
  });

  it('montre les textes par défaut tant que rien n’est saisi', () => {
    afficher();
    expect(screen.getByRole('heading', { level: 1, name: 'Nos projets immobiliers' })).toBeInTheDocument();
    expect(screen.getByText('Accroche par défaut')).toBeInTheDocument();
    expect(screen.getByText('Texte par défaut')).toBeInTheDocument();
    expect(document.querySelector('img[src="/hero-poster.jpg"]')).not.toBeNull();
  });

  it('montre le texte et l’image saisis dans le back-office', () => {
    contenu = {
      'realisations.title': 'Nos belles réalisations',
      'realisations.subtitle': 'Une nouvelle accroche',
      'realisations.image': 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/mtm/pages/bandeau',
    };
    afficher();
    expect(screen.getByRole('heading', { level: 1, name: 'Nos belles réalisations' })).toBeInTheDocument();
    expect(screen.getByText('Une nouvelle accroche')).toBeInTheDocument();
    expect(document.querySelector('img[src*="res.cloudinary.com"]')).not.toBeNull();
  });

  it('n’affiche la mention sous les cartes que si elle est saisie', () => {
    const { unmount } = afficher();
    expect(screen.queryByText('Visuels indicatifs')).not.toBeInTheDocument();
    unmount();
    contenu = { 'realisations.legende': 'Visuels indicatifs' };
    afficher();
    expect(screen.getByText('Visuels indicatifs')).toBeInTheDocument();
  });

  it('présente les projets en cartes avec un lien vers leur fiche', () => {
    afficher();
    expect(screen.getByRole('link', { name: /Aménagement foncier/ })).toHaveAttribute('href', '/realisations/a');
  });
});
