import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pole } from '../../types/poles';
import { ServicesSection } from './ServicesSection';

const etat = vi.hoisted(() => ({ poles: [] as Pole[], video: '' }));

vi.mock('../../hooks/usePoles', () => ({ usePoles: () => ({ data: etat.poles, loading: false, error: null }) }));
vi.mock('../../hooks/useEditableContent', () => ({
  useEditableContent: () => ({ text: (cle: string, defaut: string) => (cle === 'services.video' ? etat.video || defaut : defaut), loading: false }),
}));

function pole(slug: string, nom: string, surAccueil: boolean): Pole {
  return {
    id: slug,
    slug,
    numero: '01',
    nom,
    accroche: `Accroche ${nom}`,
    description: `Description ${nom}`,
    points: [],
    imageUrl: null,
    lienUrl: null,
    libelleLien: null,
    surAccueil,
    lies: [],
  };
}

function afficher() {
  return render(
    <MemoryRouter>
      <ServicesSection />
    </MemoryRouter>,
  );
}

describe('ServicesSection', () => {
  beforeEach(() => {
    etat.video = '';
    etat.poles = [pole('gestion', 'MTM Gestion', true), pole('clean', 'MTM Clean', false), pole('btp', 'MTM BTP', true)];
  });

  it('sans vidéo : une carte par pôle de l’accueil et le bouton vers tous les services', () => {
    afficher();
    expect(screen.getByRole('link', { name: /MTM Gestion/ }).getAttribute('href')).toBe('/nos-services#gestion');
    expect(screen.getByRole('link', { name: /MTM BTP/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /MTM Clean/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Voir tous nos services/ }).getAttribute('href')).toBe('/nos-services');
    expect(screen.queryByRole('button', { name: /Lire la vidéo/ })).toBeNull();
  });

  it('avec une vidéo : la vignette prend la place des cartes, la liste des services reste en liens', () => {
    etat.video = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    afficher();
    expect(screen.getByRole('button', { name: /Lire la vidéo/ })).toBeTruthy();
    const liste = screen.getByRole('list', { name: 'Nos services' });
    expect(within(liste).getAllByRole('link')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Voir tous nos services/ })).toBeTruthy();
  });

  it('ne charge la vidéo qu’au clic sur la vignette', async () => {
    etat.video = 'dQw4w9WgXcQ';
    afficher();
    expect(document.querySelector('iframe')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Lire la vidéo/ }));
    expect(document.querySelector('iframe')?.getAttribute('src')).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('une adresse qui n’est pas une vidéo YouTube laisse les cartes en place', () => {
    etat.video = 'https://vimeo.com/123456789';
    afficher();
    expect(screen.queryByRole('button', { name: /Lire la vidéo/ })).toBeNull();
    expect(screen.getByRole('link', { name: /MTM Gestion/ })).toBeTruthy();
  });

  it('sans aucun pôle publié, la section disparaît', () => {
    etat.poles = [];
    const { container } = afficher();
    expect(container.querySelector('section')).toBeNull();
  });
});
