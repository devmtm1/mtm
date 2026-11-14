import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pole } from '../types/poles';
import { ServicesPage } from './ServicesPage';

const etat = vi.hoisted(() => ({
  valeur: { data: [] as Pole[] | null, loading: false, error: null as string | null },
}));

vi.mock('../hooks/usePoles', () => ({ usePoles: () => etat.valeur }));
vi.mock('../hooks/useEditableContent', () => ({
  useEditableContent: () => ({ text: (_cle: string, defaut: string) => defaut, loading: false }),
}));
vi.mock('../hooks/usePageMetadata', () => ({ usePageMetadata: () => undefined }));

function pole(surcharge: Partial<Pole> & Pick<Pole, 'slug' | 'nom' | 'numero'>): Pole {
  return {
    id: surcharge.slug,
    accroche: null,
    description: null,
    points: [],
    imageUrl: null,
    lienUrl: null,
    libelleLien: null,
    surAccueil: false,
    lies: [],
    ...surcharge,
  };
}

function afficher() {
  return render(
    <MemoryRouter>
      <ServicesPage />
    </MemoryRouter>,
  );
}

describe('ServicesPage', () => {
  beforeEach(() => {
    etat.valeur = { data: [], loading: false, error: null };
  });

  it('affiche chaque pôle venu de l’API : numéro, titre, mention rouge et prestations (au verso)', async () => {
    etat.valeur.data = [
      pole({
        slug: 'clean',
        numero: '04',
        nom: 'MTM Clean',
        accroche: 'Nettoyage et entretien',
        points: ['Maisons et villas', 'Bureaux'],
        lienUrl: '/contact?sujet=Clean',
        libelleLien: 'Demander un devis',
      }),
    ];
    afficher();
    await userEvent.click(screen.getByRole('button', { name: 'MTM Clean : voir les détails' }));
    const carte = document.getElementById('clean') as HTMLElement;
    expect(within(carte).getByRole('heading', { name: 'MTM Clean' })).toBeTruthy();
    expect(within(carte).getAllByText('04').length).toBeGreaterThan(0);
    expect(within(carte).getAllByText('Nettoyage et entretien').length).toBeGreaterThan(0);
    expect(within(carte).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Maisons et villas', 'Bureaux']);
    // Le recto (pas le verso, caché) porte le lien d'action.
    expect(within(carte).getByRole('link', { name: /Demander un devis/ }).getAttribute('href')).toBe('/contact?sujet=Clean');
  });

  it('un clic retourne le pôle sur place : le verso montre le détail, « Retour » revient au recto', async () => {
    etat.valeur.data = [
      pole({ slug: 'gestion', numero: '02', nom: 'MTM Gestion', description: 'Gestion complète de vos biens.', points: ['Loyers', 'Impayés'], lienUrl: '/gestion-locative', libelleLien: 'Confier mon bien' }),
      pole({ slug: 'clean', numero: '04', nom: 'MTM Clean' }),
    ];
    afficher();
    await userEvent.click(screen.getByRole('button', { name: 'MTM Gestion : voir les détails' }));
    const verso = screen.getByRole('region', { name: 'Détails : MTM Gestion' });
    expect(within(verso).getByText('Loyers')).toBeTruthy();
    expect(within(verso).getByText('Impayés')).toBeTruthy();
    expect(within(verso).getByRole('link', { name: /Confier mon bien/ }).getAttribute('href')).toBe('/gestion-locative');
    expect(document.querySelectorAll('.flip-inner[data-flipped="true"]').length).toBe(1);
    await userEvent.click(within(verso).getByRole('button', { name: 'Retour' }));
    expect(document.querySelectorAll('.flip-inner[data-flipped="true"]').length).toBe(0);
  });

  it('ouvre une adresse https dans un nouvel onglet, sans la traiter comme une page du site', async () => {
    etat.valeur.data = [pole({ slug: 'externe', numero: '01', nom: 'Externe', lienUrl: 'https://exemple.test/pole', libelleLien: 'Découvrir ce pôle' })];
    afficher();
    await userEvent.click(screen.getByRole('button', { name: 'Externe : voir les détails' }));
    const lien = screen.getByRole('link', { name: /Découvrir ce pôle/ });
    expect(lien.getAttribute('href')).toBe('https://exemple.test/pole');
    expect(lien.getAttribute('target')).toBe('_blank');
    expect(lien.getAttribute('rel')).toContain('noopener');
  });

  it('n’affiche pas de bouton quand le pôle n’a pas de lien', () => {
    etat.valeur.data = [pole({ slug: 'seul', numero: '01', nom: 'Seul' })];
    afficher();
    expect(within(document.getElementById('seul') as HTMLElement).queryByRole('link')).toBeNull();
  });

  it('prévient sans planter quand l’API ne répond pas, et quand aucun pôle n’est publié', () => {
    etat.valeur = { data: null, loading: false, error: 'Erreur' };
    const { unmount } = afficher();
    expect(screen.getByText('Nos services ne se chargent pas')).toBeTruthy();
    unmount();
    etat.valeur = { data: [], loading: false, error: null };
    afficher();
    expect(screen.getByText('Nos services arrivent bientôt')).toBeTruthy();
  });
});
