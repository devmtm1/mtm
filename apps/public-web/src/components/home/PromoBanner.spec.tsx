import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Promotion } from '../../types/promotion';
import { PromoBanner } from './PromoBanner';

const affiche = (id: string, extra: Partial<Promotion> = {}): Promotion => ({
  id,
  titre: `Affiche ${id}`,
  description: null,
  type: 'image',
  mediaUrl: `https://res.cloudinary.com/mtm/${id}.jpg`,
  posterUrl: null,
  lienUrl: null,
  libelleLien: null,
  ...extra,
});

const film = (id: string): Promotion =>
  affiche(id, {
    type: 'video',
    mediaUrl: `https://res.cloudinary.com/mtm/${id}.mp4`,
    posterUrl: `https://res.cloudinary.com/mtm/${id}.jpg`,
  });

function rendre(promotions: Promotion[], variant: 'hero' | 'card' = 'hero') {
  return render(
    <MemoryRouter>
      <PromoBanner promotions={promotions} variant={variant} />
    </MemoryRouter>,
  );
}

function preferences({ reduit = false }: { reduit?: boolean } = {}) {
  window.matchMedia = ((query: string) => ({
    matches: reduit && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

describe('PromoBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    preferences();
    // jsdom ne sait pas lire une vidéo : on neutralise play() pour ne pas bruiter les tests.
    window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('montre l’affiche en entier, avec son texte alternatif', () => {
    rendre([affiche('a')]);
    expect(screen.getByRole('img', { name: 'Affiche a' })).toHaveClass('object-contain');
    // Une seule publicité : ni points, ni flèches, ni pause.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('affiche la légende et un bouton vers le lien interne du site', () => {
    rendre([affiche('a', { description: 'Frais de dossier offerts', lienUrl: '/terrains', libelleLien: 'Voir les terrains' })]);
    expect(screen.getByText('Frais de dossier offerts')).toBeInTheDocument();
    const lien = screen.getByRole('link', { name: 'Voir les terrains' });
    expect(lien).toHaveAttribute('href', '/terrains');
    expect(lien).not.toHaveAttribute('target');
  });

  it('ouvre un lien externe dans un nouvel onglet, sans transmettre l’origine', () => {
    rendre([affiche('a', { lienUrl: 'https://exemple.sn/offre' })]);
    const lien = screen.getByRole('link', { name: /Affiche a/ });
    expect(lien).toHaveAttribute('href', 'https://exemple.sn/offre');
    expect(lien).toHaveAttribute('target', '_blank');
    expect(lien).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('fait défiler les affiches, puis revient à la première', () => {
    rendre([affiche('a'), affiche('b')]);
    expect(screen.getByRole('img', { name: 'Affiche a' })).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(7100));
    expect(screen.getByRole('img', { name: 'Affiche b' })).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(7100));
    expect(screen.getByRole('img', { name: 'Affiche a' })).toBeInTheDocument();
  });

  it('permet de mettre en pause, de naviguer et d’aller à une publicité précise', () => {
    rendre([affiche('a'), affiche('b'), affiche('c')]);
    fireEvent.click(screen.getByRole('button', { name: /Mettre en pause/ }));
    act(() => void vi.advanceTimersByTime(30000));
    expect(screen.getByRole('img', { name: 'Affiche a' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Publicité suivante' }));
    expect(screen.getByRole('img', { name: 'Affiche b' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Publicité précédente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publicité précédente' }));
    expect(screen.getByRole('img', { name: 'Affiche c' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Publicité 2 sur 3' }));
    expect(screen.getByRole('img', { name: 'Affiche b' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicité 2 sur 3' })).toHaveAttribute('aria-current', 'true');
  });

  it('s’arrête au survol de la souris', () => {
    rendre([affiche('a'), affiche('b')]);
    fireEvent.mouseEnter(screen.getByRole('region', { name: 'Publicités et promotions' }));
    act(() => void vi.advanceTimersByTime(20000));
    expect(screen.getByRole('img', { name: 'Affiche a' })).toBeInTheDocument();
  });

  it('joue une vidéo jusqu’au bout avant de passer à la suivante', () => {
    const { container } = rendre([film('v'), affiche('b')]);
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('src', 'https://res.cloudinary.com/mtm/v.mp4');
    expect(video?.muted).toBe(true);
    // Pas de minuteur pendant la lecture : la vidéo n'est pas coupée.
    act(() => void vi.advanceTimersByTime(20000));
    expect(container.querySelector('video')).not.toBeNull();
    fireEvent.ended(container.querySelector('video') as HTMLVideoElement);
    expect(screen.getByRole('img', { name: 'Affiche b' })).toBeInTheDocument();
  });

  it('une vidéo qui ne se charge pas ne bloque pas le défilement', () => {
    const { container } = rendre([film('v'), affiche('b')]);
    fireEvent.error(container.querySelector('video') as HTMLVideoElement);
    expect(screen.getByRole('img', { name: 'Affiche b' })).toBeInTheDocument();
  });

  it('mouvement réduit : pas de vidéo ni de défilement, seulement l’image d’aperçu', () => {
    preferences({ reduit: true });
    const { container } = rendre([film('v'), affiche('b')]);
    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByRole('img', { name: 'Affiche v' })).toHaveAttribute('src', 'https://res.cloudinary.com/mtm/v.jpg');
    act(() => void vi.advanceTimersByTime(30000));
    expect(screen.getByRole('img', { name: 'Affiche v' })).toBeInTheDocument();
  });

  it('la carte mobile n’a pas de flèches, mais garde les points et la pause', () => {
    rendre([affiche('a'), affiche('b')], 'card');
    expect(screen.queryByRole('button', { name: 'Publicité suivante' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicité 1 sur 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mettre en pause/ })).toBeInTheDocument();
  });

  it('ne rend rien sans publicité', () => {
    const { container } = rendre([]);
    expect(container).toBeEmptyDOMElement();
  });
});
