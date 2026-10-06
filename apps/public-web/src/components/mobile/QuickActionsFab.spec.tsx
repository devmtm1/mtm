import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { QuickActionsFab } from './QuickActionsFab';

vi.mock('../../hooks/useSiteContact', () => ({
  toTelHref: (telephone: string) => `tel:${telephone.replace(/\s/g, '')}`,
  toMapsHref: ({ latitude, longitude }: { latitude: number; longitude: number }) =>
    `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
  useSiteContact: () => contactDeTest.valeur,
}));

const contactDeTest = vi.hoisted(() => ({
  valeur: {
    adresse: 'Malibou, Cité Dalal Diam, Dakar',
    telephone: '+221 78 000 00 00',
    email: 'contact@exemple.sn',
    whatsapp: '221780000000',
    whatsappDemarches: '221780000000',
    facebook: 'https://www.facebook.com/mtm-test',
    tiktok: 'https://www.tiktok.com/@mtm-test',
    latitude: 14.7753,
    longitude: -17.4081,
  },
}));

function renderFab() {
  return render(
    <MemoryRouter>
      <QuickActionsFab />
    </MemoryRouter>,
  );
}

const ouvrir = () => fireEvent.click(screen.getByRole('button', { name: 'Ouvrir les actions rapides' }));

describe('QuickActionsFab', () => {
  it('reste discret au repos : aucune action affichée', () => {
    renderFab();
    expect(screen.queryByRole('list', { name: 'Actions rapides' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ouvrir les actions rapides' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('déploie les actions : appeler, WhatsApp, Facebook, TikTok et la carte', () => {
    renderFab();
    ouvrir();
    const liste = screen.getByRole('list', { name: 'Actions rapides' });
    expect(liste.querySelectorAll('li')).toHaveLength(5);

    expect(screen.getByRole('link', { name: /Appeler/ })).toHaveAttribute('href', 'tel:+221780000000');
    expect(screen.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', 'https://wa.me/221780000000');
    expect(screen.getByRole('link', { name: /Facebook/ })).toHaveAttribute('href', 'https://www.facebook.com/mtm-test');
    expect(screen.getByRole('link', { name: /TikTok/ })).toHaveAttribute('href', 'https://www.tiktok.com/@mtm-test');
    expect(screen.getByRole('link', { name: /Voir sur la carte/ })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=14.7753,-17.4081',
    );
  });

  it('ne propose plus l’e-mail ni le rendez-vous', () => {
    renderFab();
    ouvrir();
    expect(screen.queryByRole('link', { name: /e-mail/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /rendez-vous/i })).not.toBeInTheDocument();
  });

  it('garde Facebook et TikTok même sans lien officiel : ils ouvrent une recherche du nom de l’agence', () => {
    const avant = contactDeTest.valeur;
    contactDeTest.valeur = {
      ...avant,
      facebook: 'https://www.facebook.com/search/top?q=MTM%20Immobilier',
      tiktok: 'https://www.tiktok.com/search?q=MTM%20Immobilier',
    };
    renderFab();
    ouvrir();
    expect(screen.getByRole('link', { name: /Facebook/ })).toHaveAttribute('href', expect.stringContaining('facebook.com/search'));
    expect(screen.getByRole('link', { name: /TikTok/ })).toHaveAttribute('href', expect.stringContaining('tiktok.com/search'));
    contactDeTest.valeur = avant;
  });

  it('les liens externes s’ouvrent dans un nouvel onglet sans transmettre l’origine', () => {
    renderFab();
    ouvrir();
    for (const nom of [/WhatsApp/, /Facebook/, /TikTok/, /Voir sur la carte/]) {
      const lien = screen.getByRole('link', { name: nom });
      expect(lien).toHaveAttribute('target', '_blank');
      expect(lien).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('se referme avec Échap, et le bouton redevient « ouvrir »', () => {
    renderFab();
    ouvrir();
    expect(screen.getByRole('button', { name: 'Fermer les actions rapides', expanded: true })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('list', { name: 'Actions rapides' })).not.toBeInTheDocument();
  });

  it('se referme après le choix d’une action et confirme l’ouverture de WhatsApp', () => {
    renderFab();
    ouvrir();
    fireEvent.click(screen.getByRole('link', { name: /WhatsApp/ }));
    expect(screen.queryByRole('list', { name: 'Actions rapides' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Ouverture de WhatsApp…');
  });
});
