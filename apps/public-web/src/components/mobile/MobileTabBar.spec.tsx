import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileTabBar } from './MobileTabBar';
import { toggleFavorite } from '../../utils/favorites';

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
    window.localStorage.clear();
    auth.user = null;
  });

  it('propose les quatre onglets de l’application', () => {
    renderBar();
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Accueil',
      'Favoris',
      'Messages',
      'Profil',
    ]);
  });

  it('un visiteur est conduit vers le contact et la connexion', () => {
    renderBar();
    expect(screen.getByRole('link', { name: /Messages/ })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: /Profil/ })).toHaveAttribute('href', '/espace-client/connexion');
  });

  it('un client connecté est conduit vers ses demandes et son compte', () => {
    auth.user = { firstName: 'Awa', roles: ['client'] };
    renderBar();
    expect(screen.getByRole('link', { name: /Messages/ })).toHaveAttribute('href', '/espace-client/demandes');
    expect(screen.getByRole('link', { name: /Profil/ })).toHaveAttribute('href', '/espace-client/compte');
  });

  it('marque l’onglet de l’écran courant', () => {
    renderBar('/favoris');
    expect(screen.getByRole('link', { name: /Favoris/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Accueil/ })).not.toHaveAttribute('aria-current');
  });

  it('l’accueil n’est actif que sur l’accueil', () => {
    renderBar('/locations');
    expect(screen.getByRole('link', { name: /Accueil/ })).not.toHaveAttribute('aria-current');
  });

  it('n’affiche de pastille que s’il y a des favoris, avec leur nombre réel', () => {
    const { unmount } = renderBar();
    expect(screen.queryByLabelText(/favori/)).not.toBeInTheDocument();
    unmount();

    toggleFavorite('terrain', 'a');
    toggleFavorite('location', 'b');
    renderBar();
    expect(screen.getByLabelText('2 favoris')).toHaveTextContent('2');
  });
});
