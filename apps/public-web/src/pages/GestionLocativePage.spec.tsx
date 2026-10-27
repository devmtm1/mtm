import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { GestionLocativePage } from './GestionLocativePage';

vi.mock('../hooks/useSiteContact', () => ({
  useSiteContact: () => ({
    adresse: 'Dakar, Sénégal',
    telephone: '+221 78 000 00 00',
    email: 'contact@exemple.sn',
    whatsapp: '221780000000',
    whatsappDemarches: '221780000000',
  }),
}));

// Visiteur non connecté : le formulaire de contact se remplit à la main.
vi.mock('../contexts/auth-context-store', () => ({
  useAuth: () => ({ user: null, accessToken: null }),
  useClientSession: () => null,
}));

// Aucun contenu saisi au back-office : la page affiche ses textes par défaut.
vi.mock('../hooks/useContentBlocks', () => ({
  useContentBlocks: () => ({ data: [], loading: false, error: null }),
}));

describe('GestionLocativePage', () => {
  function afficher() {
    render(
      <MemoryRouter>
        <GestionLocativePage />
      </MemoryRouter>,
    );
  }

  it('présente ce que MTM prend en charge, les étapes et les questions', () => {
    afficher();
    expect(screen.getByRole('heading', { level: 1, name: 'Gestion locative' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Recherche de locataires' })).toBeTruthy();
    expect(screen.getByText('Vous nous confiez votre bien')).toBeTruthy();
    expect(screen.getByText('Quels biens pouvez-vous gérer ?')).toBeTruthy();
    expect(screen.getByText('Combien coûte la gestion ?')).toBeTruthy();
  });

  it('ne fige aucun taux de gestion', () => {
    afficher();
    expect(document.body.textContent).not.toMatch(/\d+\s*%/);
  });

  it('mène du bandeau au formulaire « Confier mon bien », sur la même page', () => {
    afficher();
    const lien = screen.getAllByRole('link', { name: /Confier mon bien/ })[0];
    expect(lien.getAttribute('href')).toBe('#confier');
    expect(screen.getByRole('form', { name: 'Confier mon bien à MTM' })).toBeTruthy();
  });
});
