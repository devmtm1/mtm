import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileTabBar } from './MobileTabBar';

const auth = vi.hoisted(() => ({ user: null as null | { firstName: string; roles: string[] } }));

vi.mock('../../contexts/auth-context-store', () => ({
  useAuth: () => ({ user: auth.user }),
}));

function renderBar(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MobileTabBar />
    </MemoryRouter>,
  );
}

describe('MobileTabBar', () => {
  beforeEach(() => {
    auth.user = null;
  });

  it('reprend les activités de MTM : accueil, biens, locations, services, espace client', () => {
    renderBar();
    const barre = screen.getByRole('navigation', { name: /application/i });
    const onglets = Array.from(barre.querySelectorAll('li > a, li > button'));
    expect(onglets.map((onglet) => onglet.textContent)).toEqual([
      'Accueil',
      'Biens',
      'Locations',
      'Services',
      'Mon espace',
    ]);
  });

  it('mène aux bonnes pages', () => {
    renderBar();
    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Biens' })).toHaveAttribute('href', '/terrains');
    expect(screen.getByRole('link', { name: 'Locations' })).toHaveAttribute('href', '/locations');
  });

  it('un visiteur est conduit à la connexion, un client connecté à son espace', () => {
    const { unmount } = renderBar();
    expect(screen.getByRole('link', { name: 'Mon espace' })).toHaveAttribute('href', '/espace-client/connexion');
    unmount();

    auth.user = { firstName: 'Awa', roles: ['client'] };
    renderBar();
    expect(screen.getByRole('link', { name: 'Mon espace' })).toHaveAttribute('href', '/espace-client');
  });

  it('marque l’onglet de l’écran courant, fiches de détail comprises', () => {
    renderBar('/locations');
    expect(screen.getByRole('link', { name: 'Locations' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Biens' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Accueil' })).not.toHaveAttribute('aria-current');
  });

  it('l’onglet Biens reste actif sur la fiche d’un bien', () => {
    renderBar('/terrains/abc');
    expect(screen.getByRole('link', { name: 'Biens' })).toHaveAttribute('aria-current', 'page');
  });

  describe('Services', () => {
    it('ouvre la liste des services, au lieu de mener à une seule page', () => {
      renderBar();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Services' }));

      const feuille = screen.getByRole('dialog', { name: 'Nos services' });
      expect(within(feuille).getByRole('link', { name: /Gestion locative/ })).toHaveAttribute('href', '/gestion-locative');
      expect(within(feuille).getByRole('link', { name: /Construction/ })).toHaveAttribute('href', '/construction');
      expect(within(feuille).getByRole('link', { name: /Démarches administratives/ })).toHaveAttribute(
        'href',
        '/demarches-administratives',
      );
    });

    it('se referme avec Échap', () => {
      renderBar();
      fireEvent.click(screen.getByRole('button', { name: 'Services' }));
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('se referme après le choix d’un service', () => {
      renderBar();
      fireEvent.click(screen.getByRole('button', { name: 'Services' }));
      fireEvent.click(screen.getByRole('link', { name: /Construction/ }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('est marqué actif sur la page d’un service', () => {
      renderBar('/gestion-locative');
      const onglet = screen.getByRole('button', { name: 'Services' });
      // Le trait sous l'onglet est visible (pleine échelle) sur un service.
      expect(onglet.querySelector('span[aria-hidden="true"]')).toHaveClass('scale-x-100');
    });

    it('n’est pas actif sur une autre page', () => {
      renderBar('/locations');
      const onglet = screen.getByRole('button', { name: 'Services' });
      expect(onglet.querySelector('span[aria-hidden="true"]')).toHaveClass('scale-x-0');
    });
  });
});
