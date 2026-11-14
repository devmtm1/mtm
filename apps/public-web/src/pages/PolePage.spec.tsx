import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pole } from '../types/poles';
import { PolePage } from './PolePage';

const etat = vi.hoisted(() => ({ poles: null as Pole[] | null, loading: false }));

vi.mock('../hooks/usePoles', () => ({ usePoles: () => ({ data: etat.poles, loading: etat.loading, error: null }) }));
vi.mock('../hooks/usePageMetadata', () => ({ usePageMetadata: () => undefined }));
vi.mock('../hooks/useSiteContact', () => ({
  useSiteContact: () => ({ whatsapp: '221700000000' }),
  toTelHref: (valeur: string) => `tel:${valeur}`,
}));
vi.mock('../components/contact/ContactForm', () => ({
  ContactForm: ({ initialSujet }: { initialSujet?: string }) => <p>Formulaire : {initialSujet}</p>,
}));

function pole(surcharge: Partial<Pole> & Pick<Pole, 'slug' | 'nom'>): Pole {
  return {
    id: surcharge.slug,
    numero: '04',
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

function afficher(chemin: string) {
  return render(
    <MemoryRouter initialEntries={[chemin]}>
      <Routes>
        <Route path="/nos-services/:slug" element={<PolePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PolePage', () => {
  beforeEach(() => {
    etat.poles = [
      pole({
        slug: 'clean',
        nom: 'MTM Clean',
        accroche: 'Nettoyage et entretien',
        description: 'Nettoyage de maisons et de bureaux.',
        points: ['Maisons et villas', 'Après travaux'],
        libelleLien: 'Demander un devis',
        lies: ['maintenance'],
      }),
      pole({ slug: 'maintenance', nom: 'MTM Maintenance', description: 'Entretien et dépannage.', lienUrl: '/nos-services/maintenance' }),
    ];
    etat.loading = false;
  });

  it('présente le pôle : titre, mention, description et chacune de ses prestations', () => {
    afficher('/nos-services/clean');
    expect(screen.getByRole('heading', { level: 1, name: 'MTM Clean' })).toBeTruthy();
    expect(screen.getByText('Nettoyage et entretien')).toBeTruthy();
    expect(screen.getByText('Maisons et villas')).toBeTruthy();
    expect(screen.getByText('Après travaux')).toBeTruthy();
    expect(document.getElementById('demande')?.textContent).toContain('Formulaire');
  });

  it('sur mobile, garde la page à bandeau et le bouton qui mène à la demande', () => {
    const ancien = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: true, media: query, addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;
    try {
      afficher('/nos-services/clean');
      expect(screen.getByRole('heading', { level: 1, name: /MTM Clean/ })).toBeTruthy();
      expect(screen.getByRole('link', { name: 'Faire une demande' }).getAttribute('href')).toBe('#demande');
    } finally {
      window.matchMedia = ancien;
    }
  });

  it('oriente le formulaire sur ce service', () => {
    afficher('/nos-services/clean');
    expect(screen.getByText('Formulaire : MTM Clean – Nettoyage et entretien')).toBeTruthy();
  });

  it('reste une page courte : pas de bloc de services complémentaires', () => {
    afficher('/nos-services/clean');
    expect(screen.queryByRole('region', { name: 'Services complémentaires' })).toBeNull();
  });

  it('un pôle inconnu ou retiré donne la page « introuvable »', () => {
    afficher('/nos-services/inexistant');
    expect(screen.queryByRole('heading', { level: 1, name: 'MTM Clean' })).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toContain('MTM');
  });

  it('affiche un squelette pendant le chargement, sans page introuvable', () => {
    etat.poles = null;
    etat.loading = true;
    afficher('/nos-services/clean');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });
});
