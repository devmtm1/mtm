import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AboutPage } from './AboutPage';

const donnees = vi.hoisted(() => ({
  blocs: null as null | { key: string; title: null; content: string; type: string }[],
  equipe: null as null | object,
}));

vi.mock('../hooks/useContentBlocks', () => ({
  useContentBlocks: () => ({ data: donnees.blocs, loading: false, error: null }),
}));
vi.mock('../hooks/useTeam', () => ({
  useTeam: () => ({ data: donnees.equipe, loading: false, error: null }),
}));

function rendre() {
  return render(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>,
  );
}

describe('AboutPage', () => {
  beforeEach(() => {
    // Mouvement réduit : les sections s'affichent d'emblée, sans animation d'entrée.
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  it('présente MTM : accroche, histoire, valeurs, métiers, méthode et contact', () => {
    donnees.blocs = null;
    donnees.equipe = null;
    rendre();

    expect(screen.getByRole('heading', { level: 1, name: 'MTM Immobilier' })).toBeInTheDocument();
    expect(screen.getByText('Une présence locale, une vision ouverte.')).toBeInTheDocument();
    for (const titre of [
      'Une agence qui vous accompagne de bout en bout',
      'Nos valeurs',
      'Nos métiers',
      'Notre méthode',
      'Nous trouver',
    ]) {
      expect(screen.getByRole('heading', { name: titre })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(15);
  });

  it('chaque métier mène à sa page', () => {
    donnees.blocs = null;
    rendre();
    expect(screen.getByRole('link', { name: /Gestion locative/ })).toHaveAttribute('href', '/gestion-locative');
    expect(screen.getByRole('link', { name: /Construction/ })).toHaveAttribute('href', '/construction');
    expect(screen.getByRole('link', { name: /Démarches administratives/ })).toHaveAttribute(
      'href',
      '/demarches-administratives',
    );
    expect(screen.getByRole('link', { name: /Vente de terrains et villas/ })).toHaveAttribute('href', '/terrains');
  });

  it('reprend l’accroche et le texte saisis au back-office, un paragraphe par ligne', () => {
    donnees.blocs = [
      { key: 'about.title', title: null, content: 'Notre accroche', type: 'text' },
      { key: 'about.text', title: null, content: 'Premier paragraphe.\nSecond paragraphe.', type: 'text' },
    ];
    rendre();
    expect(screen.getByText('Notre accroche')).toBeInTheDocument();
    expect(screen.getByText('Premier paragraphe.')).toBeInTheDocument();
    expect(screen.getByText('Second paragraphe.')).toBeInTheDocument();
  });

  it('propose les moyens de joindre l’agence', () => {
    donnees.blocs = null;
    rendre();
    expect(screen.getByRole('link', { name: /Appeler/ })).toHaveAttribute('href', expect.stringMatching(/^tel:/));
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', expect.stringContaining('wa.me/'));
    expect(screen.getByRole('link', { name: /E-mail/ })).toHaveAttribute('href', expect.stringMatching(/^mailto:/));
  });

  it('affiche l’équipe quand elle est publiée, et rien sinon', () => {
    donnees.blocs = null;
    donnees.equipe = null;
    const { unmount } = rendre();
    expect(screen.queryByRole('heading', { name: 'Notre équipe' })).not.toBeInTheDocument();
    unmount();

    donnees.equipe = {
      directeur: null,
      groupe: null,
      membres: [{ id: 'm', nom: 'Awa Diop', poste: 'Conseillère', message: null, imageUrl: null }],
    };
    rendre();
    expect(screen.getByRole('heading', { name: 'Notre équipe' })).toBeInTheDocument();
    expect(screen.getByText('Awa Diop')).toBeInTheDocument();
  });
});
