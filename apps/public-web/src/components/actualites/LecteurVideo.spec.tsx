import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reinitialiserVideosEnregistrees } from '../../hooks/useVideosEnregistrees';
import type { Publication } from '../../types/publication';
import { LecteurVideo } from './LecteurVideo';

const toast = { show: vi.fn() };
vi.mock('../ui/toast-store', () => ({ useToast: () => toast }));

function video(id: string, extra: Partial<Publication> = {}): Publication {
  return {
    id,
    titre: `Vidéo ${id}`,
    categorie: 'foncier',
    resume: 'Découvrez pourquoi investir sur Yene est une opportunité unique, avec ses avantages, ses perspectives et les projets en cours dans cette zone stratégique.',
    videoUrl: null,
    youtubeId: 'LSH6GRjVwho',
    posterUrl: null,
    dureeSecondes: 333,
    largeur: null,
    hauteur: null,
    datePublication: '2026-10-21T00:00:00.000Z',
    misEnAvant: false,
    ...extra,
  };
}

function afficher(props: Partial<React.ComponentProps<typeof LecteurVideo>> = {}) {
  const onClose = vi.fn();
  const onChoisir = vi.fn();
  render(
    <MemoryRouter>
      <LecteurVideo publication={video('a')} autres={[video('b'), video('c')]} onClose={onClose} onChoisir={onChoisir} {...props} />
    </MemoryRouter>,
  );
  return { onClose, onChoisir };
}

describe('LecteurVideo', () => {
  beforeEach(() => {
    reinitialiserVideosEnregistrees();
    toast.show.mockClear();
  });
  afterEach(() => vi.restoreAllMocks());

  it('montre le lecteur YouTube, le titre, la chaîne et la rubrique', () => {
    afficher();
    expect(screen.getByTitle('Vidéo a')).toHaveAttribute('src', expect.stringContaining('youtube-nocookie.com/embed/LSH6GRjVwho'));
    expect(screen.getAllByText('MTM Immobilier').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Chaîne officielle')).toBeInTheDocument();
    expect(screen.getAllByText('Foncier').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5:33/).length).toBeGreaterThan(0);
  });

  it('propose « Voir sur YouTube » pour une vidéo YouTube', () => {
    afficher();
    expect(screen.getByRole('link', { name: /Voir sur YouTube/ })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=LSH6GRjVwho');
  });

  it('propose le plein écran pour une vidéo hébergée par MTM', () => {
    afficher({ publication: video('a', { youtubeId: null, videoUrl: 'https://exemple.test/a.mp4' }) });
    expect(screen.queryByRole('link', { name: /Voir sur YouTube/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Plein écran/ })).toBeInTheDocument();
  });

  it('replie le résumé, avec « Voir plus »', () => {
    afficher();
    const bouton = screen.getByRole('button', { name: /Voir plus/ });
    expect(bouton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(bouton);
    expect(screen.getByRole('button', { name: /Voir moins/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('enregistre puis retire la vidéo, et le dit', () => {
    afficher();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(toast.show).toHaveBeenLastCalledWith('Vidéo enregistrée');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrée' }));
    expect(toast.show).toHaveBeenLastCalledWith('Retirée de vos vidéos enregistrées');
  });

  it('partage avec le partage du téléphone quand il existe, sinon copie le lien', async () => {
    const partage = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: partage, configurable: true });
    afficher();
    fireEvent.click(screen.getByRole('button', { name: 'Partager' }));
    await vi.waitFor(() => expect(partage).toHaveBeenCalledWith(expect.objectContaining({ title: 'Vidéo a', url: expect.stringContaining('/actualites?video=a') })));

    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    const ecrire = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: ecrire }, configurable: true });
    fireEvent.click(screen.getByRole('button', { name: 'Partager' }));
    await vi.waitFor(() => expect(ecrire).toHaveBeenCalledWith(expect.stringContaining('/actualites?video=a')));
    expect(toast.show).toHaveBeenCalledWith('Lien copié');
  });

  it('lit une autre vidéo d’un toucher, sans fermer la fiche', () => {
    const { onChoisir, onClose } = afficher();
    fireEvent.click(screen.getByRole('button', { name: 'Lire la vidéo : Vidéo b' }));
    expect(onChoisir).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ferme avec la croix', () => {
    const { onClose } = afficher();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalled();
  });
});
