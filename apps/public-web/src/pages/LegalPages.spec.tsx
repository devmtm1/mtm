import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ConfidentialitePage, MentionsLegalesPage } from './LegalPages';

vi.mock('../hooks/useSiteContact', () => ({
  useSiteContact: () => ({
    adresse: 'Dakar, Sénégal',
    telephone: '+221 78 000 00 00',
    email: 'contact@exemple.sn',
    whatsapp: '221780000000',
    whatsappDemarches: '221780000000',
  }),
}));

describe('pages légales', () => {
  it('les mentions légales affichent les coordonnées et signalent ce qui reste à compléter', () => {
    render(
      <MemoryRouter>
        <MentionsLegalesPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Mentions légales' })).toBeTruthy();
    expect(screen.getByText(/contact@exemple\.sn/)).toBeTruthy();
    // Aucune donnée d'identification inventée : elles restent à saisir par MTM.
    expect(screen.getAllByText(/à compléter par MTM/).length).toBeGreaterThan(0);
  });

  it('la politique de confidentialité nomme les droits et l’autorité de contrôle', () => {
    render(
      <MemoryRouter>
        <ConfidentialitePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: /Confidentialité/ })).toBeTruthy();
    expect(screen.getByText(/Commission de protection des données personnelles/)).toBeTruthy();
  });
});
