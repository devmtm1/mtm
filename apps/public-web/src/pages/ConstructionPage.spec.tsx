import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ConstructionPage } from './ConstructionPage';

vi.mock('../hooks/useSiteContact', () => ({
  useSiteContact: () => ({
    adresse: 'Dakar, Sénégal',
    telephone: '+221 78 000 00 00',
    email: 'contact@exemple.sn',
    whatsapp: '221780000000',
    whatsappDemarches: '221780000000',
  }),
}));

// Aucun contenu saisi au back-office : la page affiche ses textes par défaut.
vi.mock('../hooks/useContentBlocks', () => ({
  useContentBlocks: () => ({ data: [], loading: false, error: null }),
}));

describe('ConstructionPage', () => {
  function afficher() {
    render(
      <MemoryRouter>
        <ConstructionPage />
      </MemoryRouter>,
    );
  }

  it('présente ce que MTM construit, les étapes, les questions et la demande de devis', () => {
    afficher();
    expect(screen.getByRole('heading', { level: 1, name: 'Construction' })).toBeTruthy();
    expect(screen.getByText('Construction neuve')).toBeTruthy();
    expect(screen.getByText('Étude et devis')).toBeTruthy();
    expect(screen.getByText('Dois-je déjà avoir un terrain ?')).toBeTruthy();
    expect(screen.getByRole('form', { name: 'Demander un devis de construction' })).toBeTruthy();
  });

  it('place le formulaire de devis à l’ancre #devis, à côté des prestations', () => {
    afficher();
    const ancre = document.getElementById('devis');
    expect(ancre).not.toBeNull();
    expect(ancre?.querySelector('form')).toBe(screen.getByRole('form', { name: 'Demander un devis de construction' }));
  });

  it('ne fige aucun prix ni délai', () => {
    afficher();
    expect(document.body.textContent).not.toMatch(/\d+\s*(%|jours|mois|semaines)/i);
  });
});
