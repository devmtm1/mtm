import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Home } from 'lucide-react';
import { ClientTabBar, type ClientTab } from './ClientTabBar';

const tab = (to: string, label: string): ClientTab => ({ to, label, icon: Home, end: false });

const CINQ = [tab('/a', 'Accueil'), tab('/b', 'Dossiers'), tab('/c', 'Vérifications'), tab('/d', 'Demandes'), tab('/e', 'Compte')];
const SIX = [tab('/a', 'Accueil'), tab('/l', 'Ma location'), tab('/b', 'Dossiers'), tab('/c', 'Vérifications'), tab('/d', 'Demandes'), tab('/e', 'Compte')];

function renderBar(tabs: ClientTab[], path = '/a', onLogout = vi.fn()) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ClientTabBar tabs={tabs} onLogout={onLogout} />
    </MemoryRouter>,
  );
  return onLogout;
}

const labels = () =>
  Array.from(screen.getByRole('navigation', { name: 'Espace client' }).querySelectorAll('li > a, li > button')).map(
    (el) => el.textContent,
  );

describe('ClientTabBar', () => {
  it('affiche cinq onglets tels quels', () => {
    renderBar(CINQ);
    expect(labels()).toEqual(['Accueil', 'Dossiers', 'Vérifications', 'Demandes', 'Compte']);
  });

  it('range les onglets en trop derrière « Plus »', () => {
    renderBar(SIX);
    expect(labels()).toEqual(['Accueil', 'Ma location', 'Dossiers', 'Vérifications', 'Plus']);
    fireEvent.click(screen.getByRole('button', { name: 'Plus' }));
    const feuille = screen.getByRole('dialog', { name: 'Mon espace' });
    expect(within(feuille).getByRole('link', { name: 'Demandes' })).toHaveAttribute('href', '/d');
    expect(within(feuille).getByRole('link', { name: 'Compte' })).toHaveAttribute('href', '/e');
  });

  it('marque « Plus » actif quand l’écran courant est rangé dedans', () => {
    renderBar(SIX, '/d');
    const plus = screen.getByRole('button', { name: 'Plus' });
    expect(plus.querySelector('span[aria-hidden="true"]')).toHaveClass('scale-x-100');
  });

  it('permet de se déconnecter depuis « Plus »', () => {
    const onLogout = renderBar(SIX);
    fireEvent.click(screen.getByRole('button', { name: 'Plus' }));
    fireEvent.click(screen.getByRole('button', { name: /Se déconnecter/ }));
    expect(onLogout).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
