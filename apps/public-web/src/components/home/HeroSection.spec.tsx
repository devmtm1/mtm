import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Promotion } from '../../types/promotion';
import { HeroSection } from './HeroSection';

const etat = vi.hoisted(() => ({
  promotions: [] as Promotion[],
  loading: false,
}));

vi.mock('../../hooks/useHeroPromotions', () => ({
  useHeroPromotions: () => ({ promotions: etat.promotions, loading: etat.loading }),
}));
vi.mock('../../hooks/useContentBlocks', () => ({
  useContentBlocks: () => ({ data: null, loading: false, error: null }),
}));

const promotion: Promotion = {
  id: 'p1',
  titre: 'Promotion de rentrée',
  description: 'Frais de dossier offerts',
  type: 'image',
  mediaUrl: 'https://res.cloudinary.com/mtm/promo.jpg',
  posterUrl: null,
  lienUrl: '/terrains',
  libelleLien: 'Voir les terrains',
};

function rendre() {
  return render(
    <MemoryRouter>
      <HeroSection />
    </MemoryRouter>,
  );
}

describe('HeroSection', () => {
  beforeEach(() => {
    etat.promotions = [];
    etat.loading = false;
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
  });

  it('sans publicité, montre la vidéo seule : le titre reste dans la page mais aucun texte ne la recouvre', () => {
    const { container } = rendre();
    const titre = screen.getByRole('heading', { level: 1 });
    expect(titre).toHaveTextContent('Investissez en toute confiance');
    expect(titre).toHaveClass('sr-only');
    // La vidéo porte déjà son propre texte : pas de bouton ni de recherche par-dessus.
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Publicités et promotions' })).not.toBeInTheDocument();
    // L'image fixe (tirée de la vidéo) est là d'emblée ; la vidéo se monte ensuite, au repos de la page.
    expect(container.querySelector('img[src="/baniere-poster.jpg"]')).not.toBeNull();
  });

  it('avec des publicités en ligne, elles remplacent la vidéo et le texte du bandeau', () => {
    etat.promotions = [promotion];
    const { container } = rendre();

    expect(screen.getByRole('region', { name: 'Publicités et promotions' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Promotion de rentrée' })).toBeInTheDocument();
    expect(screen.getByText('Frais de dossier offerts')).toBeInTheDocument();
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img[src="/baniere-poster.jpg"]')).toBeNull();
    // Le titre de la page reste, mais invisible : il ne doit pas masquer l'affiche.
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('sr-only');
    expect(screen.queryByRole('link', { name: 'Demander une vérification' })).not.toBeInTheDocument();
  });
});
